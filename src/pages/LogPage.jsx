import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ClipboardList,
  CalendarDays,
  Calendar as CalendarIcon,
  Users,
  Lock,
  LogOut,
  Eye,
  Download,
  Upload,
  XCircle,
  CheckCircle2,
  PencilLine,
  Archive,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import UserAvatar from "@/components/shared/UserAvatar";
import api from "@/lib/apiClient";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ── Kategori aktivitas → ikon, warna badge, dan status turunan ──────────────
// Deteksi kategori berdasarkan kata kunci pada teks `action` yang sudah ada
// di database (tidak menambah field/kolom baru). `status` dipakai untuk badge
// SUKSES/INFO/GAGAL pada aktivitas yang tidak terikat dokumen (login, logout,
// dsb). Aktivitas yang terikat dokumen (lihat/unduh) menampilkan nomor
// dokumen sebagai badge, jadi `status` untuk kategori itu diset null.
const ACTIVITY_VISUALS = [
  { test: (a) => a.includes("login"), icon: Lock, badgeBg: "bg-primary", badgeText: "text-primary-foreground", status: "SUKSES" },
  { test: (a) => a.includes("logout"), icon: LogOut, badgeBg: "bg-rose-300", badgeText: "text-white", status: "INFO" },
  { test: (a) => a.includes("unggah"), icon: Upload, badgeBg: "bg-emerald-500", badgeText: "text-white", status: "SUKSES" },
  { test: (a) => a.includes("tolak"), icon: XCircle, badgeBg: "bg-red-500", badgeText: "text-white", status: "GAGAL" },
  { test: (a) => a.includes("setuju"), icon: CheckCircle2, badgeBg: "bg-blue-500", badgeText: "text-white", status: "SUKSES" },
  { test: (a) => a.includes("lihat"), icon: Eye, badgeBg: "bg-sky-500", badgeText: "text-white", status: null },
  { test: (a) => a.includes("unduh"), icon: Download, badgeBg: "bg-purple-500", badgeText: "text-white", status: null },
  { test: (a) => a.includes("perbarui") || a.includes("metadata") || a.includes("mengubah") || a.includes("edit"), icon: PencilLine, badgeBg: "bg-orange-500", badgeText: "text-white", status: "SUKSES" },
  { test: (a) => a.includes("arsip"), icon: Archive, badgeBg: "bg-teal-500", badgeText: "text-white", status: "SUKSES" },
];
const DEFAULT_VISUAL = { icon: ClipboardList, badgeBg: "bg-muted-foreground", badgeText: "text-white", status: "INFO" };

function getActivityVisual(action = "") {
  const a = action.toLowerCase();
  return ACTIVITY_VISUALS.find((v) => v.test(a)) || DEFAULT_VISUAL;
}

// Subjudul singkat untuk aktivitas yang tidak terikat dokumen. Hanya diisi
// untuk kategori yang memang punya makna umum yang jelas (login/logout) —
// kategori lain dibiarkan tanpa subjudul supaya tidak mengarang keterangan.
function getActivitySubtitle(action = "") {
  const a = action.toLowerCase();
  if (a.includes("login")) return "User berhasil masuk ke sistem";
  if (a.includes("logout")) return "User keluar dari sistem";
  return null;
}

const STATUS_STYLES = {
  SUKSES: "bg-emerald-100 text-emerald-700",
  INFO: "bg-slate-100 text-slate-600",
  GAGAL: "bg-red-100 text-red-600",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const QUICK_RANGES = [
  { label: "Hari Ini", days: 0 },
  { label: "7 Hari Terakhir", days: 6 },
  { label: "30 Hari Terakhir", days: 29 },
  { label: "Semua Waktu", days: null },
];

// ── Dropdown "Lihat" — tombol dengan label statis + menu preset rentang ─────
function ViewRangeDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
      >
        Lihat
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-card border border-border rounded-xl shadow-elevated overflow-hidden z-20">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => { onSelect(r); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Potong daftar section (per-tanggal) sampai jumlah item mencapai `limit`,
// dipakai untuk pagination "Tampilkan N data per halaman" per user.
function getTruncatedSections(sections, limit) {
  const result = [];
  let count = 0;
  for (const sec of sections) {
    if (count >= limit) break;
    const items = sec.items.slice(0, limit - count);
    if (items.length > 0) result.push({ ...sec, items });
    count += items.length;
  }
  return result;
}

export default function LogPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [dateRange, setDateRange] = useState({});
  const [selectedUserKey, setSelectedUserKey] = useState(null);

  // Collapse/expand per user (default semua collapse)
  const [expandedUsers, setExpandedUsers] = useState(() => new Set());
  // Baris aktivitas (tanpa dokumen) yang detailnya sedang dibuka
  const [expandedLogRows, setExpandedLogRows] = useState(() => new Set());
  // Pagination per user ("Tampilkan N data per halaman" + "Muat lebih banyak")
  const [pageSize, setPageSize] = useState(10);
  const [visibleCounts, setVisibleCounts] = useState({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Satu query saja ke backend (GET /api/audit) — grouping & sorting
      // dilakukan di frontend supaya tidak ada query database berulang.
      const { data } = await api.get("/audit", { params: { limit: 500 } });
      const raw = data.logs || [];

      const normalized = raw.map((t) => ({
          id: t.id,
          docId: t.document_id,
          docTitle: t.document_judul || `Dokumen #${t.document_id}`,
          docNomor: t.document_nomor || null,
          time: t.created_at,
          userId: t.user_id,
          userName: t.nama || "Sistem",
          userAvatar: t.avatar || null,
          userRole: t.role || "Sistem",
          action: t.action,

          previousHash: t.previous_hash,
          currentHash: t.current_hash,
          integrityStatus: t.integrity_status,

          oldValue: t.old_value,
          newValue: t.new_value,
      }));

      // Catatan: filter berdasarkan role (Kepala Sekolah hanya melihat
      // kategori aktivitas tertentu, role lain hanya melihat aktivitas
      // miliknya sendiri) SEKARANG dilakukan di backend (GET /api/audit)
      // lewat WHERE query builder berbasis permission — bukan lagi di sini.
      // Semua role memakai component & data yang sama persis; backend hanya
      // mengirim baris yang memang boleh dilihat role tersebut, sehingga
      // data yang tidak berhak dilihat tidak pernah sampai ke browser.
      setLogs(normalized);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Gagal memuat log");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Daftar user unik (dari SELURUH log, bukan hasil filter) — untuk dropdown
  // "Pilih User".
  const allUsers = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      const key = l.userId ?? `nama:${l.userName}`;
      if (!map.has(key)) map.set(key, { key, userName: l.userName, role: l.userRole });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName, "id", { sensitivity: "base" })
    );
  }, [logs]);

  // Ringkasan header: total aktivitas & tanggal aktivitas terbaru (selalu dari
  // seluruh data, tidak terpengaruh filter — konsisten dengan kartu ringkasan).
  const latestActivityLabel = useMemo(() => {
    if (logs.length === 0) return "—";
    const latest = logs.reduce((max, l) => {
      const t = l.time ? new Date(l.time).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    return latest ? format(new Date(latest), "d MMM yyyy", { locale: idLocale }) : "—";
  }, [logs]);

  // Filter: pencarian, jenis aktivitas, status, rentang tanggal, & user
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (
        filterAction !== "Semua" &&
        !log.action.toLowerCase().includes(filterAction.toLowerCase())
      ) return false;

      if (filterStatus !== "Semua") {
        const visual = getActivityVisual(log.action);
        if (visual.status !== filterStatus) return false;
      }

      if (dateRange?.from) {
        if (!log.time) return false;
        const t = new Date(log.time);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        to.setHours(23, 59, 59, 999);
        if (t < from || t > to) return false;
      }

      if (selectedUserKey) {
        const key = log.userId ?? `nama:${log.userName}`;
        if (key !== selectedUserKey) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        return (
          log.userName.toLowerCase().includes(q) ||
          log.docTitle.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, filterAction, filterStatus, dateRange, selectedUserKey]);

  // Reset pagination setiap kali filter berubah supaya tidak ada state
  // "Muat lebih banyak" yang nyangkut dari filter sebelumnya.
  useEffect(() => {
    setVisibleCounts({});
  }, [search, filterAction, filterStatus, dateRange, selectedUserKey]);

  // ── Group by User → Tanggal (Timeline Grouped) ────────────────────────────
  // Urutan: User ASC, Tanggal DESC, Jam ASC (sesuai spesifikasi).
  const groupedLogs = useMemo(() => {
    const byUser = new Map();

    filtered.forEach((log) => {
      const key = log.userId ?? `nama:${log.userName}`;
      if (!byUser.has(key)) {
        byUser.set(key, {
          key,
          userId: log.userId,
          avatar: log.userAvatar,
          role: log.userRole,
          userName: log.userName,
          activities: [],
        });
      }
      byUser.get(key).activities.push(log);
    });

    const users = Array.from(byUser.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName, "id", { sensitivity: "base" })
    );

    users.forEach((u) => {
      // Tanggal DESC, lalu Jam ASC di dalam tanggal yang sama.
      u.activities.sort((a, b) => {
        const ta = a.time ? new Date(a.time).getTime() : 0;
        const tb = b.time ? new Date(b.time).getTime() : 0;
        const dateA = a.time ? format(new Date(a.time), "yyyy-MM-dd") : "";
        const dateB = b.time ? format(new Date(b.time), "yyyy-MM-dd") : "";
        if (dateA !== dateB) return dateA < dateB ? 1 : -1; // tanggal DESC
        return ta - tb; // jam ASC
      });

      // Kelompokkan jadi 1 section per tanggal. Selama masih tanggal yang
      // sama, semua aktivitas tetap dalam satu section — tidak dipecah lagi
      // berdasarkan jeda waktu (fix: sebelumnya jeda > 30 menit di tanggal
      // yang sama malah dipecah jadi "(Lanjutan)" berkali-kali, padahal
      // seharusnya hanya dipecah kalau memang beda tanggal).
      const sections = [];
      let current = null;

      u.activities.forEach((log) => {
        const t = log.time ? new Date(log.time) : null;
        const dateKey = t ? format(t, "yyyy-MM-dd") : "unknown";
        const dateLabel = t
          ? format(t, "d MMMM yyyy", { locale: idLocale }).toUpperCase()
          : "TANGGAL TIDAK DIKETAHUI";

        if (!current || current.dateKey !== dateKey) {
          current = { dateKey, label: dateLabel, items: [] };
          sections.push(current);
        }
        current.items.push(log);
      });

      u.sections = sections;
    });

    return users;
  }, [filtered]);

  const toggleUser = (key) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Klik baris aktivitas: kalau terkait dokumen → buka dokumennya; kalau
  // tidak (login/logout, dsb.) → buka/tutup detail singkat (waktu lengkap +
  // info rantai hash bila tersedia).
  const handleRowClick = (log, rowKey) => {
    if (log.docId) {
      navigate(`/archive?docId=${log.docId}`);
      return;
    }
    setExpandedLogRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const handleSelectUser = (key) => {
    setSelectedUserKey(key || null);
    if (key) {
      setExpandedUsers((prev) => new Set(prev).add(key));
    }
  };

  const handleQuickRange = (preset) => {
    if (preset.days === null) {
      setDateRange({});
    } else {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - preset.days);
      setDateRange({ from, to });
    }
  };

  const handleReset = () => {
    setSearch("");
    setFilterAction("Semua");
    setFilterStatus("Semua");
    setDateRange({});
    setSelectedUserKey(null);
  };

  const handlePageSizeChange = (n) => {
    setPageSize(n);
    setVisibleCounts({});
  };

  const getVisibleCount = (key) => visibleCounts[key] ?? pageSize;
  const loadMore = (key) => {
    setVisibleCounts((prev) => ({ ...prev, [key]: getVisibleCount(key) + pageSize }));
  };

  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) return "Semua Tanggal";
    const from = format(dateRange.from, "dd/MM/yyyy");
    const to = dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : from;
    return `${from} - ${to}`;
  }, [dateRange]);

  // ── Export Excel — mengekspor data sesuai filter/pencarian yang aktif ────
  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const rows = filtered
      .slice()
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .map((log) => {
        const visual = getActivityVisual(log.action);
        return {
          Waktu: log.time ? format(new Date(log.time), "dd/MM/yyyy HH:mm") : "-",
          Nama: log.userName,
          Peran: log.userRole,
          Aktivitas: log.action,
          Dokumen: log.docId ? log.docTitle : "-",
          "No. Dokumen": log.docNomor || "-",
          Status: log.docId ? "-" : (visual.status || "-"),
        };
      });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 17 }, { wch: 22 }, { wch: 14 }, { wch: 34 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Aktivitas");
    XLSX.writeFile(wb, `Log_Aktivitas_SAKURA_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  return (
    <>
      <AppHeader
        title="Log Sistem"
        subtitle="Catatan aktivitas seluruh dokumen"
      />

      <div className="p-8 space-y-6">
        {/* Header + ringkasan */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={22} className="text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Jejak Aktivitas Global
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2 shadow-soft">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList size={16} />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold text-foreground">{logs.length}</div>
                <div className="text-[10px] text-muted-foreground">Total Aktivitas</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2 shadow-soft">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarDays size={16} />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold text-foreground">{latestActivityLabel}</div>
                <div className="text-[10px] text-muted-foreground">Aktivitas Terbaru</div>
              </div>
            </div>

            <ViewRangeDropdown onSelect={handleQuickRange} />

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input text-sm hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-col gap-3 bg-card p-4 rounded-xl border border-border shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari aktivitas, dokumen, atau kata kunci..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="Semua">Semua Aktivitas</option>
              <option value="Login">Login</option>
              <option value="Logout">Logout</option>
              <option value="Mengunggah">Unggah</option>
              <option value="Melihat">Lihat</option>
              <option value="Menyetujui">Setujui</option>
              <option value="Menolak">Tolak</option>
              <option value="Mengarsipkan">Arsipkan</option>
              <option value="Mengunduh">Unduh</option>
              <option value="Catatan">Catatan Admin</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="Semua">Semua Status</option>
              <option value="SUKSES">Sukses</option>
              <option value="INFO">Info</option>
              <option value="GAGAL">Gagal</option>
            </select>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-muted transition-colors"
                >
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {dateRangeLabel}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                  locale={idLocale}
                />
              </PopoverContent>
            </Popover>

            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              title="Unduh log aktivitas sebagai Excel (.xlsx)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/5 transition-colors"
            >
              <RotateCcw size={14} /> Reset Filter
            </button>
          </div>

          {/* Pilih User */}
          <div className="pt-3 border-t border-border/60">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Users size={13} /> Pilih User
            </label>
            <div className="relative">
              <select
                value={selectedUserKey ?? ""}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Pilih user untuk melihat log aktivitas...</option>
                {allUsers.map((u) => (
                  <option key={u.key} value={u.key}>{u.userName} — {u.role}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-xl shadow-soft">
            <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Memuat log aktivitas...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-xl shadow-soft">
            <AlertCircle size={32} className="text-destructive" />
            <p className="text-sm text-destructive font-medium">{error}</p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && groupedLogs.length === 0 && (
          <div className="bg-card border border-border rounded-xl shadow-soft">
            <p className="text-center text-muted-foreground py-12">
              Tidak ada log ditemukan.
            </p>
          </div>
        )}

        {/* Timeline Grouped — satu card per user */}
        {!loading && !error && groupedLogs.length > 0 && (
          <div className="space-y-3">
            {groupedLogs.map((u) => {
              const isOpen = expandedUsers.has(u.key);
              const visibleCount = getVisibleCount(u.key);
              const truncatedSections = getTruncatedSections(u.sections, visibleCount);
              const hasMore = visibleCount < u.activities.length;

              return (
                <div
                  key={u.key}
                  className="bg-card border border-border rounded-xl shadow-soft overflow-hidden transition-shadow hover:shadow-elevated"
                >
                  {/* Header user — klik untuk expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleUser(u.key)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <UserAvatar userId={u.userId} avatar={u.avatar} nama={u.userName} size={40} />

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground">
                        {u.userName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {u.role} <span className="mx-1">•</span> {u.activities.length} Aktivitas
                      </div>
                    </div>

                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Daftar aktivitas (hanya dirender saat terbuka) */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 bg-muted/10 border-t border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-foreground">Aktivitas Terbaru</span>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          Tampilkan
                          <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="border border-input rounded-md bg-background px-1.5 py-0.5 text-xs"
                          >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          data per halaman
                        </label>
                      </div>

                      <div className="space-y-4">
                        {truncatedSections.map((section) => (
                          <div key={section.dateKey}>
                            <div className="text-[11px] font-bold text-primary tracking-wide mb-2">
                              {section.label}
                            </div>

                            <div className="space-y-1">
                              {section.items.map((log, j) => {
                                const visual = getActivityVisual(log.action);
                                const Icon = visual.icon;
                                const rowKey = log.id ?? `${u.key}-${log.time}-${j}`;
                                const isRowOpen = expandedLogRows.has(rowKey);
                                const subtitle = log.docId ? log.docTitle : getActivitySubtitle(log.action);

                                return (
                                  <div key={rowKey}>
                                    <button
                                      type="button"
                                      onClick={() => handleRowClick(log, rowKey)}
                                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/50 text-left transition-colors"
                                    >
                                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${visual.badgeBg} ${visual.badgeText}`}>
                                        <Icon size={16} />
                                      </span>

                                      <span className="text-xs font-mono text-muted-foreground shrink-0 w-11">
                                        {log.time ? format(new Date(log.time), "HH:mm") : "—"}
                                      </span>

                                      <div className="flex-1 min-w-0">
                                        <div
                                          className={`text-sm font-semibold truncate ${
                                            log.action.startsWith("Catatan Admin") ? "text-accent italic" : "text-foreground"
                                          }`}
                                        >
                                          {log.action}
                                        </div>
                                        {subtitle && (
                                          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
                                        )}
                                      </div>

                                      {log.docId && log.docNomor ? (
                                        <span className="font-mono bg-muted px-2 py-1 rounded text-[10px] text-muted-foreground shrink-0">
                                          {log.docNomor}
                                        </span>
                                      ) : visual.status ? (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_STYLES[visual.status]}`}>
                                          {visual.status}
                                        </span>
                                      ) : null}

                                      <ChevronRight
                                        size={15}
                                        className={`text-muted-foreground shrink-0 transition-transform ${isRowOpen ? "rotate-90" : ""}`}
                                      />
                                    </button>

                                    {isRowOpen && (
                                      <div className="ml-[4.75rem] mr-2 mb-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                                        <div className="text-muted-foreground">
                                          {log.time
                                            ? format(new Date(log.time), "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: idLocale })
                                            : "Waktu tidak diketahui"}
                                        </div>
                                        {log.currentHash && (
                                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                                            Hash: {log.currentHash.slice(0, 16)}…
                                            {log.integrityStatus === "VALID" && (
                                              <span className="font-sans text-emerald-600 font-semibold">Terverifikasi</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {hasMore && (
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={() => loadMore(u.key)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
                          >
                            Muat lebih banyak <ChevronDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
