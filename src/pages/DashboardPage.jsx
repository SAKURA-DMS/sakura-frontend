import { useState, useEffect, useCallback } from "react";
import { FileText, Clock, CheckCircle, Archive, XCircle, Eye, RefreshCw, AlertCircle } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";
import ActivityChart from "@/components/dashboard/ActivityChart";
import DocumentDetailModal from "@/components/document/DocumentDetail";
import { DocumentList } from "@/components/document/DocumentDetail";
import { useApp } from "@/contexts/AppContext";
import UserAvatar from "@/components/shared/UserAvatar";
import { format, differenceInHours } from "date-fns";
import { getStats, getActivity } from "@/services/dashboardService";
import api from "@/lib/apiClient";
import { approveRequest, rejectRequest } from "@/services/documentService";

const TABS = [
  { key: "ringkasan",   label: "Ringkasan",   icon: Archive },
  { key: "persetujuan", label: "Persetujuan", icon: CheckCircle },
];

export default function DashboardPage() {
  const { documents, currentUser, hasPermission, approveDocument, rejectDocument, loadDocuments } = useApp();
  const [activeTab, setActiveTab] = useState("ringkasan");
  const [listModal, setListModal] = useState(null);
  const [detailDoc, setDetailDoc] = useState(null);

  // Load dokumen saat mount agar cards & list modal berfungsi
  useEffect(() => {
    if (currentUser) loadDocuments();
  }, [currentUser, loadDocuments]);

  // ── Dashboard stats dari API ───────────────────────────────────────────────
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading,   setStatsLoading]   = useState(false);
  const [statsError,     setStatsError]     = useState(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getStats();
      setDashboardStats(data);
    } catch (err) {
      setStatsError(err.message || "Gagal memuat statistik");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) loadStats();
  }, [currentUser, loadStats]);

  // ── Dokumen yang visible untuk user ini ──────────────────────────────────
  const visibleDocs =
    currentUser?.role === "Guru"
      ? documents.filter((d) => d.pengunggah?.id === currentUser.id)
      : documents;

  // ── Stats: API jika tersedia, fallback ke count lokal ────────────────────
  const counts = dashboardStats ?? {
    total:      visibleDocs.length,
    menunggu:   visibleDocs.filter((d) => d.status === "Menunggu").length,
    diarsipkan: visibleDocs.filter((d) => d.status === "Diarsipkan").length,
    ditolak:    visibleDocs.filter((d) => d.status === "Ditolak").length,
  };

  // ── Chart click handlers ──────────────────────────────────────────────────
  const handleChartDateClick = (date, status) => {
    let matched = visibleDocs.filter((d) => d.tanggalUpload?.startsWith(date));
    if (status && status !== "Upload") {
      matched = matched.filter((d) => d.status === status);
    }
    const label = status ? `Dokumen ${status} tanggal ${date}` : `Dokumen tanggal ${date}`;
    setListModal({ title: label, docs: matched });
  };

  const handleStatusClick = (status) => {
    if (status === "all") {
      setListModal({ title: "Semua Dokumen", docs: visibleDocs });
    } else {
      setListModal({ title: `Dokumen ${status}`, docs: visibleDocs.filter((d) => d.status === status) });
    }
  };

  // ── Greeting ──────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat Pagi";
    if (h < 15) return "Selamat Siang";
    if (h < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  return (
    <>
      <AppHeader title="Dashboard" subtitle="Ringkasan aktivitas dokumen" />

      <div className="p-6 lg:p-8 space-y-6 bg-background">
        {/* Hero greeting */}
        <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8 bg-primary/8 dark:bg-primary/10 border border-primary/15 dark:border-primary/20">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06] dark:opacity-[0.12]" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            {[0, 72, 144, 216, 288].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const tx = 60 + Math.cos(rad) * 30;
              const ty = 60 + Math.sin(rad) * 30;
              return <ellipse key={angle} cx={tx} cy={ty} rx="18" ry="28" fill="hsl(var(--primary))" transform={`rotate(${angle} ${tx} ${ty})`} />;
            })}
            <circle cx="60" cy="60" r="8" fill="hsl(var(--primary))" />
          </svg>
          <div className="relative">
            <p className="text-primary text-sm font-medium opacity-80">{getGreeting()},</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{currentUser?.nama}</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg">
              Kelola dokumen, pantau status persetujuan, dan arsipkan dokumen administrasi sekolah.
            </p>
            {dashboardStats?.recentUploads > 0 && (
              <p className="text-primary text-sm mt-1 font-medium">
                {dashboardStats.recentUploads} dokumen diunggah dalam 7 hari terakhir.
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "ringkasan" && (
          <OverviewTab
            counts={counts}
            statsLoading={statsLoading}
            statsError={statsError}
            onRetryStats={loadStats}
            visibleDocs={visibleDocs}
            onOpenList={(title, docs) => setListModal({ title, docs })}
            onSelectDoc={setDetailDoc}
            onChartDateClick={handleChartDateClick}
            onChartStatusClick={handleStatusClick}
          />
        )}
        {activeTab === "persetujuan" && (
          <PersetujuanTab
            currentUser={currentUser}
            canApprove={hasPermission("documents.approve")}
            approveDocument={approveDocument}
            rejectDocument={rejectDocument}
            onSelectDoc={setDetailDoc}
            onDocUpdated={loadDocuments}
          />
        )}
      </div>

      {listModal && !detailDoc && (
        <DocumentList
          title={listModal.title}
          documents={listModal.docs}
          onClose={() => setListModal(null)}
          onSelectDocument={(doc) => setDetailDoc(doc)}
        />
      )}
      {detailDoc && <DocumentDetailModal document={detailDoc} onClose={() => setDetailDoc(null)} />}
    </>
  );
}

// ── OverviewTab ───────────────────────────────────────────────────────────────
function OverviewTab({
  counts, statsLoading, statsError, onRetryStats,
  visibleDocs, onOpenList, onSelectDoc,
  onChartDateClick, onChartStatusClick,
}) {
  const [activity,        setActivity]        = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError,   setActivityError]   = useState(null);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const { activity: list } = await getActivity(10);
      setActivity(list || []);
    } catch (err) {
      setActivityError(err.message || "Gagal memuat aktivitas");
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const recentDocs = [...visibleDocs]
    .sort((a, b) => new Date(b.tanggalUpload).getTime() - new Date(a.tanggalUpload).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsError ? (
          <div className="col-span-full flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl p-3">
            <AlertCircle size={16} />
            <span>{statsError}</span>
            <button onClick={onRetryStats} className="ml-auto flex items-center gap-1 text-xs underline">
              <RefreshCw size={12} /> Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <DashboardCard
              title="Total Dokumen"
              value={statsLoading ? "—" : counts.total}
              icon={FileText}
              onClick={() => onOpenList("Semua Dokumen", visibleDocs)}
            />
            <DashboardCard
              title="Menunggu"
              value={statsLoading ? "—" : counts.menunggu}
              icon={Clock}
              variant="warning"
              onClick={() => onOpenList("Dokumen Menunggu", visibleDocs.filter((d) => d.status === "Menunggu"))}
            />
            <DashboardCard
              title="Diarsipkan"
              value={statsLoading ? "—" : counts.diarsipkan}
              icon={Archive}
              variant="success"
              onClick={() => onOpenList("Dokumen Diarsipkan", visibleDocs.filter((d) => d.status === "Diarsipkan"))}
            />
            <DashboardCard
              title="Ditolak"
              value={statsLoading ? "—" : counts.ditolak}
              icon={XCircle}
              variant="default"
              onClick={() => onOpenList("Dokumen Ditolak", visibleDocs.filter((d) => d.status === "Ditolak"))}
            />
          </>
        )}
      </div>

      {/* Chart */}
      <div>
        <ActivityChart onDateClick={onChartDateClick} onStatusClick={onChartStatusClick} />
      </div>

      {/* Recent docs + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Dokumen Terbaru
          </h3>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada dokumen.</p>
          ) : (
            <div className="space-y-1">
              {recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDoc(doc)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{doc.judul}</div>
                    <div className="text-xs text-muted-foreground">{doc.nomorDokumen} · {doc.kategori}</div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    doc.status === "Diarsipkan" ? "bg-sakura-success/15 text-sakura-success" :
                    doc.status === "Menunggu"   ? "bg-sakura-warning/15 text-sakura-warning" :
                    doc.status === "Ditolak"    ? "bg-destructive/15 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>{doc.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            Aktivitas Terbaru
          </h3>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
              <RefreshCw size={16} className="animate-spin" />
              Memuat aktivitas…
            </div>
          ) : activityError ? (
            <div className="flex flex-col items-center gap-2 py-6 text-destructive text-sm">
              <AlertCircle size={20} />
              <span>{activityError}</span>
              <button onClick={loadActivity} className="text-xs underline flex items-center gap-1">
                <RefreshCw size={12} /> Coba Lagi
              </button>
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <UserAvatar userId={act.userId} avatar={act.userAvatar} nama={act.userName} size={32} square className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground">{act.userName}</span>
                      <span className="text-[11px] text-muted-foreground">· {act.userRole}</span>
                    </div>
                    <div className="text-[13px] text-foreground/80">{act.action}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {act.docTitle} · {format(new Date(act.time), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PersetujuanTab — fetch langsung dari /api/approvals?status=pending ────────
function PersetujuanTab({ currentUser, canApprove, approveDocument, rejectDocument, onSelectDoc, onDocUpdated }) {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [approveId,      setApproveId]      = useState(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectId,       setRejectId]       = useState(null);
  const [rejectReason,   setRejectReason]   = useState("");
  const [successMsg,     setSuccessMsg]     = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/approvals", { params: { status: "pending", limit: 100 } });
      const raw = data.requests || [];
      const sorted = [...raw].sort((a, b) => {
        const hoursA = differenceInHours(new Date(), new Date(a.requested_at));
        const hoursB = differenceInHours(new Date(), new Date(b.requested_at));
        const urgentA = hoursA >= 72;
        const urgentB = hoursB >= 72;
        if (urgentA !== urgentB) return urgentA ? -1 : 1;
        if (urgentA && urgentB)  return hoursA > hoursB ? -1 : 1;
        return hoursB - hoursA;
      });
      setRequests(sorted);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Gagal memuat persetujuan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const getUrgency = (requestedAt) => {
    const hours = differenceInHours(new Date(), new Date(requestedAt));
    if (hours > 72) return { label: "Urgent",  color: "bg-destructive/15 text-destructive" };
    if (hours > 24) return { label: "Pending", color: "bg-sakura-warning/15 text-sakura-warning" };
    return              { label: "Baru",    color: "bg-sakura-success/15 text-sakura-success" };
  };

  const handleApprove = async (req) => {
    try {
      await approveRequest(req.id, approveComment.trim() || undefined);
      setApproveId(null);
      setApproveComment("");
      setSuccessMsg(`Dokumen "${req.judul}" berhasil disetujui dan diarsipkan.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchPending();
      onDocUpdated?.();
    } catch (err) {
      setApproveId(null);
      setApproveComment("");
    }
  };

  const handleReject = async (req) => {
    if (!rejectReason.trim()) return;
    try {
      await rejectRequest(req.id, rejectReason.trim());
      setRejectId(null);
      setRejectReason("");
      fetchPending();
      onDocUpdated?.();
    } catch (err) {
      setRejectId(null);
      setRejectReason("");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat daftar persetujuan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <AlertCircle size={32} className="mx-auto text-destructive mb-3" />
        <p className="text-destructive font-medium">{error}</p>
        <button onClick={fetchPending} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <CheckCircle size={48} className="mx-auto text-sakura-success mb-3" />
        <p className="text-foreground font-semibold">Tidak ada dokumen yang menunggu persetujuan</p>
        <p className="text-sm text-muted-foreground mt-1">Semua dokumen sudah ditinjau.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {requests.map((req) => {
          const urgency = getUrgency(req.requested_at);
          return (
            <div key={req.id} className={`bg-card rounded-2xl border overflow-hidden hover:shadow-card-hover ${urgency.label === "Urgent" ? "border-l-4 border-l-destructive border-border" : "border-border"}`}>
              {/* Header: requester */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <UserAvatar userId={req.requester_id} avatar={req.requester_avatar} nama={req.requester_nama} size={32} square />
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">{req.requester_nama}</div>
                    <div className="text-[11px] text-muted-foreground">{req.requester_role}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 ${urgency.color} ${urgency.label === "Urgent" ? "animate-pulse" : ""}`}>
                  {urgency.label === "Urgent" && <span>⚠</span>} {urgency.label}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <h4 className="font-bold text-foreground text-[13px] line-clamp-2">{req.judul}</h4>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">{req.category_name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">{req.type_name}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {req.nomor_dokumen} · {format(new Date(req.requested_at), "dd MMM yyyy")}
                </div>
                {req.requester_note && (
                  <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-sakura-warning/10 text-sakura-warning border border-sakura-warning/20">
                    ⚠ {req.requester_note}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
                <button
                  onClick={() => {
                    // Buka detail dengan data minimal yang cukup untuk DocumentDetailModal
                    onSelectDoc({
                      id:            req.document_id,
                      judul:         req.judul,
                      nomorDokumen:  req.nomor_dokumen,
                      kategori:      req.category_name || "—",
                      kelas:         "—",
                      jenisDokumen:  req.type_name || "—",
                      status:        req.doc_status || "Menunggu",
                      versi:         req.versi || 1,
                      tanggalUpload: req.requested_at,
                      tanggalEdit:   req.requested_at,
                      pengunggah:    { id: req.requester_id, nama: req.requester_nama, role: req.requester_role, avatar: req.requester_avatar },
                      auditTrail:    [],
                      fileUrl:       "",
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[12px] font-medium hover:bg-muted"
                >
                  <Eye size={14} /> Review
                </button>
                {canApprove && (
                  <>
                    <button
                      onClick={() => setApproveId(req)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sakura-success text-white text-[12px] font-bold hover:opacity-90"
                    >
                      <CheckCircle size={14} /> Setujui
                    </button>
                    <button
                      onClick={() => setRejectId(req)}
                      className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      <XCircle size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-sakura-success text-white px-6 py-3 rounded-2xl shadow-2xl animate-fade-in">
          <CheckCircle size={20} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Modal Setujui */}
      {approveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 glass" onClick={() => setApproveId(null)}>
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-1">Konfirmasi Persetujuan</h3>
            <p className="text-sm text-muted-foreground mb-3">Dokumen: <span className="font-medium text-foreground">{approveId.judul}</span></p>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Komentar (opsional)..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setApproveId(null); setApproveComment(""); }} className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={() => handleApprove(approveId)} className="px-4 py-2 rounded-lg bg-sakura-success text-white text-sm font-bold hover:opacity-90">Setujui</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tolak */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 glass" onClick={() => setRejectId(null)}>
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-1">Alasan Penolakan</h3>
            <p className="text-sm text-muted-foreground mb-3">Dokumen: <span className="font-medium text-foreground">{rejectId.judul}</span></p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectId(null)} className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={() => handleReject(rejectId)} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90">Tolak</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}