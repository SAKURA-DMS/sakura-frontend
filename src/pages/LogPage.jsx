import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, RotateCcw, Clock, ChevronDown, ChevronRight, RefreshCw, AlertCircle, ClipboardList, CalendarDays, Calendar as CalendarIcon, Users, Lock, LogOut, Eye, Download, Upload, XCircle, CheckCircle2, PencilLine, Archive, FileSpreadsheet, Check, Info } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import UserAvatar from "@/components/shared/UserAvatar";
import api from "@/lib/apiClient";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const ACTIVITY_VISUALS = [
  {
    test: (a) => a.includes("login"),
    icon: Lock,
    dot: "bg-primary",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    status: "SUKSES",
  },
  {
    test: (a) => a.includes("logout"),
    icon: LogOut,
    dot: "bg-rose-500",
    iconBg: "bg-rose-100",
    iconText: "text-rose-500",
    status: "INFO",
  },
  {
    test: (a) => a.includes("unggah"),
    icon: Upload,
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    status: "SUKSES",
  },
  {
    test: (a) => a.includes("tolak"),
    icon: XCircle,
    dot: "bg-red-500",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    status: "GAGAL",
  },
  {
    test: (a) => a.includes("setuju"),
    icon: CheckCircle2,
    dot: "bg-amber-500",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    status: "SUKSES",
  },
  {
    test: (a) => a.includes("lihat"),
    icon: Eye,
    dot: "bg-blue-500",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    status: null,
  },
  {
    test: (a) => a.includes("unduh"),
    icon: Download,
    dot: "bg-purple-500",
    iconBg: "bg-purple-100",
    iconText: "text-purple-600",
    status: null,
  },
  {
    test: (a) =>
      a.includes("perbarui") ||
      a.includes("metadata") ||
      a.includes("mengubah") ||
      a.includes("edit"),
    icon: PencilLine,
    dot: "bg-orange-500",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    status: "SUKSES",
  },
  {
    test: (a) => a.includes("arsip"),
    icon: Archive,
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    status: "SUKSES",
  },
];

const DEFAULT_VISUAL = {
  icon: ClipboardList,
  dot: "bg-slate-400",
  iconBg: "bg-slate-100",
  iconText: "text-slate-600",
  status: "INFO",
};

function getActivityVisual(action = "") {
  const a = action.toLowerCase();
  return ACTIVITY_VISUALS.find((v) => v.test(a)) || DEFAULT_VISUAL;
}

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

const INITIAL_VISIBLE = 7;

const QUICK_RANGES = [
  { label: "Hari Ini", days: 0 },
  { label: "7 Hari Terakhir", days: 6 },
  { label: "30 Hari Terakhir", days: 29 },
  { label: "Semua Waktu", days: null },
];

/* QUICK RANGE DROPDOWN */
function ViewRangeDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
      >
        Lihat

        <ChevronDown
          size={14}
          className={`transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-card border border-border rounded-xl shadow-elevated overflow-hidden z-30">
          {QUICK_RANGES.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => {
                onSelect(range);
                setOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 text-xs text-foreground hover:bg-muted transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* TRUNCATE ACTIVITIES */
function getTruncatedSections(sections, limit) {
  const result = [];
  let count = 0;

  for (const section of sections) {
    if (count >= limit) break;

    const items = section.items.slice(0, limit - count);

    if (items.length > 0) {
      result.push({
        ...section,
        items,
      });
    }

    count += items.length;
  }

  return result;
}

/* LOG PAGE */
export default function LogPage() {
  const { currentUser } = useApp();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [dateRange, setDateRange] = useState({});
  const [selectedUserKey, setSelectedUserKey] = useState(null);

  const [expandedUsers, setExpandedUsers] = useState(
    () => new Set()
  );

  const [expandedLogRows, setExpandedLogRows] = useState(
    () => new Set()
  );

  const [visibleCounts, setVisibleCounts] = useState({});

  const [exportState, setExportState] = useState(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  /* FETCH LOGS */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/audit", {
        params: { limit: 500 },
      });

      const raw = data.logs || [];

      const normalized = raw.map((t) => ({
        id: t.id,

        docId: t.document_id,

        docTitle:
          t.document_judul ||
          (t.document_id
            ? `Dokumen #${t.document_id}`
            : null),

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

      setLogs(normalized);
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          e.message ||
          "Gagal memuat log"
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* USERS */
  const allUsers = useMemo(() => {
    const map = new Map();

    logs.forEach((log) => {
      const key =
        log.userId ?? `nama:${log.userName}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          userName: log.userName,
          role: log.userRole,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName, "id", {
        sensitivity: "base",
      })
    );
  }, [logs]);

  /* LATEST ACTIVITY */
  const latestActivityLabel = useMemo(() => {
    if (logs.length === 0) return "—";

    const latest = logs.reduce((max, log) => {
      const time = log.time
        ? new Date(log.time).getTime()
        : 0;

      return time > max ? time : max;
    }, 0);

    return latest
      ? format(new Date(latest), "d MMM yyyy", {
          locale: idLocale,
        })
      : "—";
  }, [logs]);

  /* FILTER */
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (
        filterAction !== "Semua" &&
        !log.action
          .toLowerCase()
          .includes(filterAction.toLowerCase())
      ) {
        return false;
      }

      if (filterStatus !== "Semua") {
        const visual = getActivityVisual(log.action);

        if (visual.status !== filterStatus) {
          return false;
        }
      }

      if (dateRange?.from) {
        if (!log.time) return false;

        const time = new Date(log.time);

        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);

        const to = dateRange.to
          ? new Date(dateRange.to)
          : new Date(dateRange.from);

        to.setHours(23, 59, 59, 999);

        if (time < from || time > to) {
          return false;
        }
      }

      if (selectedUserKey) {
        const key =
          log.userId ?? `nama:${log.userName}`;

        if (key !== selectedUserKey) {
          return false;
        }
      }

      if (search) {
        const q = search.toLowerCase();

        return (
          log.userName.toLowerCase().includes(q) ||
          (log.docTitle || "")
            .toLowerCase()
            .includes(q) ||
          (log.docNomor || "")
            .toLowerCase()
            .includes(q) ||
          log.action.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [
    logs,
    search,
    filterAction,
    filterStatus,
    dateRange,
    selectedUserKey,
  ]);

  useEffect(() => {
    setVisibleCounts({});
  }, [
    search,
    filterAction,
    filterStatus,
    dateRange,
    selectedUserKey,
  ]);

  /* GROUP BY USER */
  const groupedLogs = useMemo(() => {
    const byUser = new Map();

    filtered.forEach((log) => {
      const key =
        log.userId ?? `nama:${log.userName}`;

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

    const users = Array.from(
      byUser.values()
    ).sort((a, b) =>
      a.userName.localeCompare(b.userName, "id", {
        sensitivity: "base",
      })
    );

    users.forEach((user) => {
      user.activities.sort((a, b) => {
        const ta = a.time
          ? new Date(a.time).getTime()
          : 0;

        const tb = b.time
          ? new Date(b.time).getTime()
          : 0;

        const dateA = a.time
          ? format(
              new Date(a.time),
              "yyyy-MM-dd"
            )
          : "";

        const dateB = b.time
          ? format(
              new Date(b.time),
              "yyyy-MM-dd"
            )
          : "";

        if (dateA !== dateB) {
          return dateA < dateB ? 1 : -1;
        }

        return ta - tb;
      });

      const sections = [];
      let current = null;

      user.activities.forEach((log) => {
        const time = log.time
          ? new Date(log.time)
          : null;

        const dateKey = time
          ? format(time, "yyyy-MM-dd")
          : "unknown";

        const dateLabel = time
          ? format(time, "d MMMM yyyy", {
              locale: idLocale,
            }).toUpperCase()
          : "TANGGAL TIDAK DIKETAHUI";

        if (
          !current ||
          current.dateKey !== dateKey
        ) {
          current = {
            dateKey,
            label: dateLabel,
            items: [],
          };

          sections.push(current);
        }

        current.items.push(log);
      });

      user.sections = sections;
    });

    return users;
  }, [filtered]);

  /* USER EXPAND */
  const toggleUser = (key) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const handleRowClick = (rowKey) => {
    setExpandedLogRows((prev) => {
      const next = new Set(prev);

      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }

      return next;
    });
  };

  const handleSelectUser = (key) => {
    setSelectedUserKey(key || null);

    if (key) {
      setExpandedUsers(
        (prev) => new Set(prev).add(key)
      );
    }
  };

  /* QUICK DATE */
  const handleQuickRange = (preset) => {
    if (preset.days === null) {
      setDateRange({});
      return;
    }

    const to = new Date();
    const from = new Date();

    from.setDate(
      from.getDate() - preset.days
    );

    setDateRange({
      from,
      to,
    });
  };

  /* RESET */
  const handleReset = () => {
    setSearch("");
    setFilterAction("Semua");
    setFilterStatus("Semua");
    setDateRange({});
    setSelectedUserKey(null);
  };

  /* LOAD MORE */
  const getVisibleCount = (key) =>
    visibleCounts[key] ?? INITIAL_VISIBLE;

  const loadMore = (key) => {
    setVisibleCounts((prev) => ({
      ...prev,

      [key]:
        (prev[key] ?? INITIAL_VISIBLE) +
        INITIAL_VISIBLE,
    }));
  };

  /* DATE LABEL */
  const dateRangeLabel = useMemo(() => {
    if (!dateRange?.from) {
      return "Semua Tanggal";
    }

    const from = format(
      dateRange.from,
      "dd/MM/yyyy"
    );

    const to = dateRange.to
      ? format(dateRange.to, "dd/MM/yyyy")
      : from;

    return `${from} - ${to}`;
  }, [dateRange]);

  /* EXPORT EXCEL */
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      setShowExportConfirm(false);
      setExportState({ type: "error", message: "Tidak ada data aktivitas untuk diekspor." });
      setTimeout(() => setExportState(null), 3000);
      return;
    }

    setShowExportConfirm(false);
    setExportState({ type: "loading", message: "Menyiapkan file Excel..." });

    try {
      const exportData = filtered.slice().sort(
        (a, b) => new Date(b.time || 0) - new Date(a.time || 0)
      );

      const rows = exportData.map((log) => {
        const visual = getActivityVisual(log.action);
        return {
          Waktu: log.time ? format(new Date(log.time), "dd/MM/yyyy HH:mm") : "-",
          Nama: log.userName,
          Peran: log.userRole,
          Aktivitas: log.action,
          Dokumen: log.docId && log.docTitle ? log.docTitle : "-",
          "No. Dokumen": log.docNomor || "-",
          Status: log.docId ? "-" : visual.status || "-",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 17 }, { wch: 22 }, { wch: 14 }, { wch: 38 },
        { wch: 32 }, { wch: 22 }, { wch: 10 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Log Aktivitas");

      const validDates = exportData
        .filter((log) => log.time && !Number.isNaN(new Date(log.time).getTime()))
        .map((log) => new Date(log.time))
        .sort((a, b) => a - b);

      let fileDateLabel = format(new Date(), "yyyy-MM-dd");
      if (validDates.length > 0) {
        const oldestLabel = format(validDates[0], "yyyy-MM-dd");
        const newestLabel = format(validDates[validDates.length - 1], "yyyy-MM-dd");
        fileDateLabel = oldestLabel === newestLabel
          ? oldestLabel
          : `${oldestLabel}_sampai_${newestLabel}`;
      }

      const fileName = `Log_Aktivitas_SAKURA_${fileDateLabel}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setExportState({ type: "success", message: `${fileName} berhasil diunduh.` });
    } catch (err) {
      console.error("Export Excel gagal:", err);
      setExportState({ type: "error", message: "Gagal mengekspor file Excel." });
    }

    setTimeout(() => setExportState(null), 3500);
  };

  /* RENDER */
  return (
    <>
      <AppHeader
        title="Log Sistem"
        subtitle="Catatan aktivitas seluruh dokumen"
      />

      <div className="p-8 space-y-5">
        {/* TITLE + SUMMARY */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-2">

            <Clock
              size={22}
              className="text-primary"
            />

            <h2 className="text-xl font-bold text-foreground">
              Jejak Aktivitas Global
            </h2>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* TOTAL */}
            <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2 shadow-soft">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ClipboardList size={16} />
              </span>

              <div className="leading-tight">

                <div className="text-sm font-bold">
                  {logs.length}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Total Aktivitas
                </div>

              </div>

            </div>

            {/* LATEST */}
            <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2 shadow-soft">

              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                <CalendarDays size={16} />

              </span>

              <div className="leading-tight">

                <div className="text-sm font-bold">
                  {latestActivityLabel}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Aktivitas Terbaru
                </div>

              </div>

            </div>

            <ViewRangeDropdown
              onSelect={handleQuickRange}
            />

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input text-sm hover:bg-muted disabled:opacity-50 transition-colors"
            >

              <RefreshCw
                size={14}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>

        </div>

        {/* FILTER */}
        <div className="bg-card border border-border rounded-xl shadow-soft p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* SEARCH */}
            <div className="relative flex-1 min-w-[260px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Cari aktivitas, dokumen, atau kata kunci..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

            </div>

            {/* ACTIVITY FILTER */}

            <select
              value={filterAction}
              onChange={(e) =>
                setFilterAction(
                  e.target.value
                )
              }
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >

              <option value="Semua">
                Semua Aktivitas
              </option>

              <option value="Login">
                Login
              </option>

              <option value="Logout">
                Logout
              </option>

              <option value="Mengunggah">
                Unggah
              </option>

              <option value="Melihat">
                Lihat
              </option>

              <option value="Menyetujui">
                Setujui
              </option>

              <option value="Menolak">
                Tolak
              </option>

              <option value="Mengarsipkan">
                Arsipkan
              </option>

              <option value="Mengunduh">
                Unduh
              </option>

              <option value="Catatan">
                Catatan Admin
              </option>

            </select>

            {/* STATUS */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value
                )
              }
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >

              <option value="Semua">
                Semua Status
              </option>

              <option value="SUKSES">
                Sukses
              </option>

              <option value="INFO">
                Info
              </option>

              <option value="GAGAL">
                Gagal
              </option>

            </select>

            {/* DATE */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-muted transition-colors"
                >

                  <CalendarIcon
                    size={14}
                    className="text-muted-foreground"
                  />

                  {dateRangeLabel}

                </button>

              </PopoverTrigger>

              <PopoverContent
                className="w-auto p-2"
                align="start"
              >

                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) =>
                    setDateRange(
                      range || {}
                    )
                  }
                  numberOfMonths={2}
                  locale={idLocale}
                />

              </PopoverContent>

            </Popover>

            {/* EXPORT EXCEL WITH CONFIRMATION */}
            <div className="relative">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (filtered.length > 0) setShowExportConfirm((prev) => !prev);
                  }}
                  disabled={filtered.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 bg-background text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileSpreadsheet size={15} />
                  Ekspor
                </button>

                {!showExportConfirm && (
                  <div className="pointer-events-none absolute right-0 top-full mt-2 z-40 whitespace-nowrap rounded-lg bg-foreground px-3 py-2 text-[11px] text-background opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-lg">
                    Unduh log aktivitas sebagai Excel (.xlsx)
                    <div className="absolute -top-1 right-5 w-2 h-2 bg-foreground rotate-45" />
                  </div>
                )}
              </div>

              {showExportConfirm && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup konfirmasi ekspor"
                    onClick={() => setShowExportConfirm(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />

                  <div className="absolute right-0 top-full mt-2 z-50 w-[320px] rounded-xl border border-border bg-card p-4 shadow-xl">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileSpreadsheet size={18} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          Ekspor Log Aktivitas?
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Data log yang sedang ditampilkan sesuai filter akan diekspor ke file Excel (.xlsx).
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {filtered.length} aktivitas akan diekspor.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowExportConfirm(false)}
                        className="rounded-lg border border-input px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <FileSpreadsheet size={14} />
                        Ekspor
                      </button>
                    </div>
                    <div className="absolute -top-[5px] right-6 h-2.5 w-2.5 rotate-45 border-l border-t border-border bg-card" />
                  </div>
                </>
              )}
            </div>

            {/* RESET */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
            >

              <RotateCcw size={14} />

              Reset

            </button>

          </div>

          {/* USER FILTER */}
          <div className="pt-3 border-t border-border/60">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Users size={13} />
              Pilih User
            </label>

            <div className="relative">

              <select
                value={
                  selectedUserKey ?? ""
                }
                onChange={(e) =>
                  handleSelectUser(
                    e.target.value
                  )
                }
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-input bg-background text-sm"
              >

                <option value="">
                  Semua user
                </option>

                {allUsers.map((user) => (

                  <option
                    key={user.key}
                    value={user.key}
                  >

                    {user.userName} —{" "}
                    {user.role}

                  </option>

                ))}

              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

            </div>

          </div>

        </div>

        {/* EXPORT TOAST */}
        {exportState && (

          <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">

            <div
              className={`flex items-center gap-3 min-w-[280px] rounded-xl border bg-card px-4 py-3 shadow-xl ${
                exportState.type === "success"
                  ? "border-emerald-200"
                  : exportState.type ===
                    "error"
                  ? "border-red-200"
                  : "border-border"
              }`}
            >

              {exportState.type ===
              "success" ? (

                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">

                  <Check size={17} />

                </span>

              ) : exportState.type ===
                "error" ? (

                <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">

                  <AlertCircle
                    size={17}
                  />

                </span>

              ) : (

                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">

                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />

                </span>

              )}

              <div>

                <div className="text-sm font-semibold text-foreground">

                  {exportState.type ===
                  "success"
                    ? "Ekspor Berhasil"
                    : exportState.type ===
                      "error"
                    ? "Ekspor Gagal"
                    : "Ekspor Excel"}

                </div>

                <div className="text-xs text-muted-foreground mt-0.5">

                  {exportState.message}

                </div>

              </div>

            </div>

          </div>

        )}

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-xl shadow-soft">
            <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              Memuat log aktivitas...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-xl shadow-soft">
            <AlertCircle
              size={32}
              className="text-destructive"
            />
            <p className="text-sm text-destructive font-medium">
              {error}
            </p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          groupedLogs.length === 0 && (
            <div className="bg-card border border-border rounded-xl shadow-soft">
              <p className="text-center text-muted-foreground py-12">
                Tidak ada log ditemukan.
              </p>
            </div>
          )}

        {/* USER CARDS */}
        {!loading &&
          !error &&
          groupedLogs.length > 0 && (
            <div className="space-y-3">
              {groupedLogs.map((user) => {
                const isOpen =
                  expandedUsers.has(
                    user.key
                  );
                const visibleCount =
                  getVisibleCount(
                    user.key
                  );
                const truncatedSections =
                  getTruncatedSections(
                    user.sections,
                    visibleCount
                  );
                const hasMore =
                  visibleCount <
                  user.activities.length;
                return (
                  <div
                    key={user.key}
                    className="bg-card border border-border rounded-xl shadow-soft overflow-hidden"
                  >

                    {/* USER HEADER */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleUser(user.key)
                      }
                      aria-expanded={isOpen}
                      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                    >

                      <UserAvatar
                        userId={user.userId}
                        avatar={user.avatar}
                        nama={user.userName}
                        size={40}
                      />

                      <div className="flex-1 min-w-0">

                        <div className="font-bold text-sm text-foreground">

                          {user.userName}

                        </div>

                        <div className="text-xs text-muted-foreground mt-0.5">

                          {user.role}

                          <span className="mx-1">
                            •
                          </span>

                          {
                            user.activities
                              .length
                          }{" "}
                          Aktivitas

                        </div>

                      </div>

                      <ChevronDown
                        size={18}
                        className={`text-muted-foreground transition-transform ${
                          isOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />

                    </button>

                    {/* ACTIVITY LIST */}
                    {isOpen && (
                      <div className="border-t border-border/60 px-4 py-4">
                        <div className="text-sm font-bold text-foreground mb-4">
                          Aktivitas Terbaru
                        </div>
                        <div>
                          {truncatedSections.map(
                            (section) => (
                              <div
                                key={
                                  section.dateKey
                                }
                                className="mb-4 last:mb-0"
                              >

                                {/* DATE */}
                                <div className="text-[11px] font-bold text-primary tracking-wide mb-1.5">
                                  {section.label}
                                </div>

                                {/* TIMELINE */}
                                <div>
                                  {section.items.map(
                                    (
                                      log,
                                      index
                                    ) => {

                                      const visual =
                                        getActivityVisual(
                                          log.action
                                        );

                                      const Icon =
                                        visual.icon;

                                      const rowKey =
                                        log.id ??
                                        `${user.key}-${log.time}-${index}`;

                                      const isRowOpen =
                                        expandedLogRows.has(
                                          rowKey
                                        );

                                      const subtitle =
                                        log.docId
                                          ? log.docTitle
                                          : getActivitySubtitle(
                                              log.action
                                            );

                                      return (

                                        <div
                                          key={
                                            rowKey
                                          }
                                          className="relative"
                                        >

                                          {/* TIMELINE LINE */}
                                          {index <
                                            section
                                              .items
                                              .length -
                                              1 && (

                                            <span className="absolute left-[4px] top-[27px] bottom-[-8px] w-px bg-border" />

                                          )}

                                          {/* ROW */}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRowClick(
                                                rowKey
                                              )
                                            }
                                            className="w-full grid grid-cols-[12px_48px_36px_minmax(0,1fr)_auto_18px] items-center gap-2 py-2 text-left group"
                                          >

                                            {/* DOT */}
                                            <span
                                              className={`w-2 h-2 rounded-full ${visual.dot}`}
                                            />

                                            {/* TIME */}
                                            <span className="text-[11px] font-mono text-muted-foreground">
                                              {log.time
                                                ? format(
                                                    new Date(
                                                      log.time
                                                    ),
                                                    "HH:mm"
                                                  )
                                                : "—"}

                                            </span>

                                            {/* ICON */}
                                            <span
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${visual.iconBg} ${visual.iconText}`}
                                            >
                                              <Icon
                                                size={
                                                  15
                                                }
                                              />
                                            </span>

                                            {/* ACTIVITY */}
                                            <div className="min-w-0">
                                              <div
                                                className={`text-sm font-semibold truncate ${
                                                  log.action.startsWith(
                                                    "Catatan Admin"
                                                  )
                                                    ? "text-accent italic"
                                                    : "text-foreground"
                                                }`}
                                              >
                                                {
                                                  log.action
                                                }
                                              </div>

                                              {subtitle && (

                                                <div className="text-xs text-muted-foreground truncate mt-0.5">

                                                  {
                                                    subtitle
                                                  }

                                                </div>

                                              )}

                                            </div>

                                            {/* DOCUMENT NUMBER / STATUS */}
                                            {log.docId &&
                                            log.docNomor ? (
                                              <span className="font-mono bg-muted px-2 py-1 rounded text-[10px] text-muted-foreground shrink-0">
                                                {
                                                  log.docNomor
                                                }
                                              </span>
                                            ) : visual.status ? (
                                              <span
                                                className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                                                  STATUS_STYLES[
                                                    visual
                                                      .status
                                                  ]
                                                }`}
                                              >
                                                {
                                                  visual.status
                                                }
                                              </span>
                                            ) : (
                                              <span />
                                            )}

                                            {/* CHEVRON */}
                                            <ChevronRight
                                              size={15}
                                              className={`text-muted-foreground transition-transform ${
                                                isRowOpen
                                                  ? "rotate-90"
                                                  : ""
                                              }`}
                                            />
                                          </button>

                                          {/* INLINE DETAIL */}
                                          {isRowOpen && (
                                            <div className="ml-[106px] mr-6 mb-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                                              <div className="flex items-start gap-2">
                                                <Info
                                                  size={
                                                    14
                                                  }
                                                  className="text-muted-foreground mt-0.5 shrink-0"
                                                />
                                                <div className="space-y-1 text-xs">
                                                  <div className="text-muted-foreground">
                                                    {log.time
                                                      ? format(
                                                          new Date(
                                                            log.time
                                                          ),
                                                          "EEEE, d MMMM yyyy 'pukul' HH:mm",
                                                          {
                                                            locale:
                                                              idLocale,
                                                          }
                                                        )
                                                      : "Waktu tidak diketahui"}
                                                  </div>
                                                  {log.docTitle && (
                                                    <div className="text-foreground">
                                                      <span className="text-muted-foreground">
                                                        Dokumen:{" "}
                                                      </span>
                                                      {
                                                        log.docTitle
                                                      }
                                                    </div>
                                                  )}
                                                  {log.docNomor && (
                                                    <div className="text-foreground">
                                                      <span className="text-muted-foreground">
                                                        Nomor:{" "}
                                                      </span>
                                                      {
                                                        log.docNomor
                                                      }
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* LOAD MORE AFTER 7 */}
                        {hasMore && (
                          <div className="flex justify-center mt-4">
                            <button
                              type="button"
                              onClick={() =>
                                loadMore(
                                  user.key
                                )
                              }
                              className="flex items-center gap-2 px-5 py-2 rounded-lg border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                            >
                              Muat lebih banyak
                              <ChevronDown
                                size={14}
                              />
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