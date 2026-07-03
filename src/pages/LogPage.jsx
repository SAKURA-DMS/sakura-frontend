import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  RotateCcw,
  FileText,
  Clock,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import UserAvatar from "@/components/shared/UserAvatar";
import api from "@/lib/apiClient";

export default function LogPage() {
  const { currentUser } = useApp();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("Semua");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      // Filter khusus Kepala Sekolah
      const principalOnlyActions = [
        "mengunggah", "menyetujui", "menolak",
        "mengarsipkan", "menghapus", "mengubah",
      ];
      const filtered =
        currentUser?.role === "Kepala Sekolah"
          ? normalized.filter((l) =>
              principalOnlyActions.some((a) =>
                l.action.toLowerCase().includes(a)
              )
            )
          : normalized;

      setLogs(filtered);
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

  // Group berdasarkan user
  const groupedLogs = useMemo(() => {
    const groups = {};
    filtered.forEach((log) => {
      const key = log.userName;
      if (!groups[key]) {
        groups[key] = { userId: log.userId, avatar: log.userAvatar, role: log.userRole, activities: [] };
      }
      groups[key].activities.push(log);
    });
    return groups;
  }, [filtered]);

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
        <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border">
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

        {/* Log Container */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Memuat log aktivitas...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-16">
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
          {!loading && !error && Object.keys(groupedLogs).length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              Tidak ada log ditemukan.
            </p>
          )}

          {/* Data */}
          {!loading && !error && (
            <div className="divide-y divide-border">
              {Object.entries(groupedLogs).map(([userName, data], i) => (
                <details
                  key={i}
                  className="group bg-background [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 select-none list-none">
                    <UserAvatar userId={data.userId} avatar={data.avatar} nama={userName} size={40} />

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground">
                        {userName}
                        <span className="font-normal text-xs text-muted-foreground ml-1">
                          — {data.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {data.activities.length} aktivitas terekam
                      </div>
                    </div>

                    <ChevronDown
                      size={18}
                      className="text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>

                  <div className="px-4 pb-4 pt-1 bg-muted/10 border-t border-border/50">
                    <div className="ml-[42px] border-l-2 border-primary/20 space-y-4 pl-4 py-2">
                      {data.activities.map((log, j) => (
                        <div key={j} className="relative">
                          <div className="absolute w-2 h-2 bg-primary rounded-full -left-[21px] top-1.5" />
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-0.5">
                            <span
                              className={`text-sm font-semibold ${
                                log.action.startsWith("Catatan Admin")
                                  ? "text-accent italic"
                                  : "text-foreground"
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground bg-background border px-2 py-0.5 rounded-full self-start">
                              {log.time
                                ? format(new Date(log.time), "dd/MM/yyyy HH:mm")
                                : "—"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <FileText size={12} className="text-primary/70" />
                            {log.docTitle}
                            {log.docNomor && (
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">
                                {log.docNomor}
                              </span>
                            )}
                          </div>
                          {log.integrityStatus && (
                          <div className="mt-2 space-y-2">

                              {/* Integrity */}
                              <div className="flex items-center gap-2">
                                  <span
                                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                          log.integrityStatus === "VALID"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-red-100 text-red-700"
                                      }`}
                                  >
                                      {log.integrityStatus === "VALID"
                                          ? "✓ Verified"
                                          : "⚠ Invalid"}
                                  </span>
                              </div>

                              {/* Hash */}
                              <div className="text-[10px] text-muted-foreground space-y-1">
                                  <div>
                                      <span className="font-semibold">
                                          Previous:
                                      </span>{" "}
                                      {log.previousHash
                                          ? log.previousHash.substring(0,16) + "..."
                                          : "--"}
                                  </div>

                                  <div>
                                      <span className="font-semibold">
                                          Current:
                                      </span>{" "}
                                      {log.currentHash
                                          ? log.currentHash.substring(0,16) + "..."
                                          : "--"}
                                  </div>
                              </div>

                              {/* Before After */}
                              {(log.oldValue || log.newValue) && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">

                                      <div className="bg-red-50 rounded p-2">
                                          <div className="font-semibold text-[11px] text-red-700">
                                              Sebelum
                                          </div>

                                          {log.oldValue
                                              ? Object.entries(log.oldValue).map(([k,v]) => (
                                                  <div
                                                      key={k}
                                                      className="text-[10px]"
                                                  >
                                                      {k}: {String(v)}
                                                  </div>
                                              ))
                                              : (
                                                  <div className="text-[10px]">
                                                      -
                                                  </div>
                                              )
                                          }
                                      </div>

                                      <div className="bg-green-50 rounded p-2">
                                          <div className="font-semibold text-[11px] text-green-700">
                                              Sesudah
                                          </div>

                                          {log.newValue
                                              ? Object.entries(log.newValue).map(([k,v]) => (
                                                  <div
                                                      key={k}
                                                      className="text-[10px]"
                                                  >
                                                      {k}: {String(v)}
                                                  </div>
                                              ))
                                              : (
                                                  <div className="text-[10px]">
                                                      -
                                                  </div>
                                              )
                                          }
                                      </div>

                                  </div>
                              )}
                          </div>
                      )}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}