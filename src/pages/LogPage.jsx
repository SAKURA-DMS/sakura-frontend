import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  RotateCcw,
  Clock,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import UserAvatar from "@/components/shared/UserAvatar";
import api from "@/lib/apiClient";

// ── Kategori aktivitas → warna bullet timeline ───────────────────────────────
// Konsisten dengan palet yang sudah dipakai di halaman lain (Tailwind color
// scale, sama seperti badge status/role di DocumentDetail & OCRFillModal).
// Deteksi kategori berdasarkan kata kunci pada teks `action` yang sudah ada
// di database (tidak menambah field/kolom baru).
const ACTIVITY_COLORS = [
  { test: (a) => a.includes("unggah"), dot: "bg-green-500" },   // Upload
  { test: (a) => a.includes("tolak"), dot: "bg-red-500" },      // Reject
  { test: (a) => a.includes("setuju"), dot: "bg-blue-500" },    // Approval (ajukan/setujui)
  { test: (a) => a.includes("lihat"), dot: "bg-gray-400" },     // View
  { test: (a) => a.includes("unduh"), dot: "bg-purple-500" },   // Download
  { test: (a) => a.includes("perbarui") || a.includes("metadata") || a.includes("mengubah") || a.includes("edit"), dot: "bg-orange-500" }, // Edit
  { test: (a) => a.includes("arsip"), dot: "bg-teal-500" },     // Archive
];
const DEFAULT_ACTIVITY_COLOR = { dot: "bg-primary" };

function getActivityColor(action = "") {
  const a = action.toLowerCase();
  const match = ACTIVITY_COLORS.find((c) => c.test(a));
  return match || DEFAULT_ACTIVITY_COLOR;
}

export default function LogPage() {
  const { currentUser } = useApp();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("Semua");
  // BARU: state collapse/expand per user (default semua collapse)
  const [expandedUsers, setExpandedUsers] = useState(() => new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Satu query saja ke backend (GET /api/audit) — grouping & sorting
      // dilakukan di frontend supaya tidak ada query database berulang.
      const { data } = await api.get("/audit", { params: { limit: 500 } });
      const raw = data.logs || [];

      const normalized = raw.map((t) => ({
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

  // Filter pencarian & aksi
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (
        filterAction !== "Semua" &&
        !log.action.toLowerCase().includes(filterAction.toLowerCase())
      ) return false;

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
  }, [logs, search, filterAction]);

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
        const dateLabel = t ? format(t, "d MMM yyyy", { locale: idLocale }) : "Tanggal tidak diketahui";

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

  return (
    <>
      <AppHeader
        title="Log Sistem"
        subtitle="Catatan aktivitas seluruh dokumen"
      />

      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={22} className="text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Jejak Aktivitas Global
            </h2>
            <span className="text-xs text-muted-foreground">
              ({filtered.length} entri)
            </span>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-soft">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, dokumen, atau aktivitas..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="Semua">Semua Aktivitas</option>
            <option value="Mengunggah">Unggah</option>
            <option value="Melihat">Lihat</option>
            <option value="Menyetujui">Setujui</option>
            <option value="Menolak">Tolak</option>
            <option value="Mengarsipkan">Arsipkan</option>
            <option value="Catatan">Catatan Admin</option>
            <option value="Mengunduh">Unduh</option>
          </select>

          <button
            onClick={() => { setSearch(""); setFilterAction("Semua"); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted"
          >
            <RotateCcw size={14} /> Reset
          </button>
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

                  {/* Timeline (hanya dirender saat terbuka) */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-muted/10 border-t border-border/50 space-y-4">
                      {u.sections.map((section) => (
                        <div key={section.label}>
                          <div className="inline-block text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg mb-3 mt-3">
                            {section.label}
                          </div>

                          <div className="space-y-2.5">
                            {section.items.map((log, j) => {
                              const color = getActivityColor(log.action);
                              return (
                                <div key={j} className="flex items-start gap-2.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 mt-[7px] ${color.dot}`} />
                                  <span className="text-xs font-mono text-muted-foreground shrink-0 w-10 pt-[3px]">
                                    {log.time ? format(new Date(log.time), "HH:mm") : "—"}
                                  </span>
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                                    <span
                                      className={`text-sm font-semibold ${
                                        log.action.startsWith("Catatan Admin")
                                          ? "text-accent italic"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {log.action}
                                    </span>
                                    {log.docId && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                                        {log.docTitle}
                                        {log.docNomor && (
                                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground shrink-0">
                                            {log.docNomor}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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