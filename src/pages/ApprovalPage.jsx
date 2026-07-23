import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, Eye, FileText, ArrowRight, AlertTriangle, RefreshCw, ScrollText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import DocumentDetailModal from "@/components/modals/DocumentDetailModal";
import UserAvatar from "@/components/shared/UserAvatar";
import * as documentService from "@/services/documentService";
import { format, differenceInHours } from "date-fns";

const STEPS = [
  { label: "Upload Dokumen",      icon: FileText },
  { label: "Antrian Persetujuan", icon: Clock },
  { label: "Disetujui / Ditolak", icon: CheckCircle },
];

function StatusBadge({ status }) {
  const MAP = {
    pending:   "bg-sakura-warning/20 text-sakura-warning",
    approved:  "bg-sakura-success/20 text-sakura-success",
    rejected:  "bg-destructive/20 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  const LABEL = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak", cancelled: "Dibatalkan" };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${MAP[status] || "bg-muted text-foreground"}`}>
      {LABEL[status] || status}
    </span>
  );
}

// Urgency badge
function UrgencyBadge({ requestedAt }) {
  const hours = differenceInHours(new Date(), new Date(requestedAt));
  if (hours > 72) return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-destructive/20 text-destructive uppercase flex items-center gap-1">
      <AlertTriangle size={10} /> Urgent
    </span>
  );
  if (hours > 24) return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sakura-warning/20 text-sakura-warning uppercase">
      Pending
    </span>
  );
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sakura-success/20 text-sakura-success uppercase">
      Baru
    </span>
  );
}

// Audit Trail 
function AuditTrailPanel({ requestId, onClose }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentService.getApprovalAudit(requestId)
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <ScrollText size={20} className="text-primary" />
          <h3 className="font-bold text-foreground">Audit Trail Persetujuan</h3>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada log untuk request ini.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <UserAvatar userId={log.user_id} avatar={log.avatar} nama={log.nama} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{log.nama || "Sistem"}</span>
                    {log.role && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{log.role}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5">{log.action}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component 
export default function ApprovalPage() {
  const { currentUser, hasPermission, documents, loadDocuments } = useApp();

  const [pending,   setPending]   = useState([]);
  const [decided,   setDecided]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [detailDoc,   setDetailDoc]   = useState(null);
  const [auditId,     setAuditId]     = useState(null); 
  const [approveReq,  setApproveReq]  = useState(null); 
  const [rejectReq,   setRejectReq]   = useState(null); 
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason,   setRejectReason]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const canApprove = hasPermission("documents.approve");
  const canReject  = hasPermission("documents.reject");
  const canView    = hasPermission("approvals.view");

  // Load approvals 
  const loadApprovals = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, decidedRes] = await Promise.all([
        documentService.listApprovals({ status: "pending",   limit: 50 }),
        documentService.listApprovals({ status: "approved,rejected", limit: 30 }),
      ]);
      setPending(pendingRes.requests || []);

      const [approvedRes, rejectedRes] = await Promise.all([
        documentService.listApprovals({ status: "approved", limit: 20 }),
        documentService.listApprovals({ status: "rejected", limit: 20 }),
      ]);
      const combined = [...(approvedRes.requests || []), ...(rejectedRes.requests || [])]
        .sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))
        .slice(0, 20);
      setDecided(combined);
    } catch (e) {
      setError("Gagal memuat data approval. Pastikan Anda memiliki akses.");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadApprovals();
    loadDocuments();
  }, [loadApprovals, loadDocuments]);

  // Approve
  const handleApprove = async () => {
    if (!approveReq) return;
    setSubmitting(true);
    try {
      await documentService.approveRequest(approveReq.id, approveComment.trim());
      setApproveReq(null);
      setApproveComment("");
      await loadApprovals();
      await loadDocuments();
    } catch (e) {
      alert(e?.response?.data?.error || "Gagal menyetujui dokumen");
    } finally {
      setSubmitting(false);
    }
  };

  // Reject
  const handleReject = async () => {
    if (!rejectReq || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await documentService.rejectRequest(rejectReq.id, rejectReason.trim());
      setRejectReq(null);
      setRejectReason("");
      await loadApprovals();
      await loadDocuments();
    } catch (e) {
      alert(e?.response?.data?.error || "Gagal menolak dokumen");
    } finally {
      setSubmitting(false);
    }
  };

  const getDocById = (docId) => documents.find((d) => d.id === docId) || null;

  // Render
  return (
    <>
      <AppHeader
        title="Alur Persetujuan"
        subtitle="Workflow persetujuan dokumen sekolah"
      />

      <div className="p-4 sm:p-8 space-y-6 animate-fade-in">

        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Alur Persetujuan Dokumen</h3>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    i === 0 ? "bg-primary text-primary-foreground" :
                    i === STEPS.length - 1 ? "bg-sakura-success/20 text-sakura-success" :
                    "bg-secondary text-primary"
                  }`}>
                    <step.icon size={22} />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center max-w-[100px]">
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={20} className="text-muted-foreground shrink-0 mt-[-20px]" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-sakura-warning" />
            <h3 className="font-bold text-foreground text-lg">Antrian Persetujuan</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sakura-warning/20 text-sakura-warning font-semibold">
              {pending.length}
            </span>
          </div>
          <button
            onClick={loadApprovals}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={36} className="animate-spin text-primary" />
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-sakura-success mb-3" />
            <p className="text-foreground font-medium">Semua dokumen sudah ditinjau</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tidak ada yang menunggu persetujuan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map((req) => (
              <div
                key={req.id}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar userId={req.requester_id} avatar={req.requester_avatar} nama={req.requester_nama} size={36} />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{req.requester_nama}</div>
                      <div className="text-xs text-muted-foreground">{req.requester_role}</div>
                    </div>
                  </div>
                  <UrgencyBadge requestedAt={req.requested_at} />
                </div>

                <div className="p-5 space-y-3">
                  <h4 className="font-bold text-foreground leading-snug line-clamp-2">
                    {req.judul}
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {req.category_name && (
                      <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-medium">
                        {req.category_name}
                      </span>
                    )}
                    {req.type_name && (
                      <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-medium">
                        {req.type_name}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-medium">
                      v{req.versi}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {req.nomor_dokumen} · Diajukan{" "}
                    {format(new Date(req.requested_at), "dd MMM yyyy, HH:mm")}
                  </div>
                  {req.requester_note && (
                    <div className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-foreground italic">
                      "{req.requester_note}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/10">
                  <button
                    onClick={() => setDetailDoc(getDocById(req.document_id))}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                    title="Lihat Detail Dokumen"
                  >
                    <Eye size={14} /> Detail
                  </button>
                  <button
                    onClick={() => setAuditId(req.id)}
                    className="p-2.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                    title="Lihat Audit Trail"
                  >
                    <ScrollText size={14} />
                  </button>
                  {canApprove && (
                    <button
                      onClick={() => setApproveReq({ id: req.id, docId: req.document_id, judul: req.judul })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-sakura-success text-white text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle size={14} /> Setujui
                    </button>
                  )}
                  {canReject && (
                    <button
                      onClick={() => setRejectReq({ id: req.id, docId: req.document_id, judul: req.judul })}
                      className="p-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      title="Tolak"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Riwayat Keputusan */}
        {!loading && decided.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h3 className="font-bold text-foreground mb-4">Riwayat Keputusan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {decided.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setAuditId(req.id)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    req.status === "rejected" ? "bg-destructive/20 text-destructive" :
                    "bg-sakura-success/20 text-sakura-success"
                  }`}>
                    {req.status === "rejected"
                      ? <XCircle size={18} />
                      : <CheckCircle size={18} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{req.judul}</div>
                    <div className="text-xs text-muted-foreground">
                      {req.nomor_dokumen} · oleh {req.requester_nama}
                    </div>
                    {req.approver_note && (
                      <div className="text-xs text-muted-foreground mt-0.5 italic truncate">
                        "{req.approver_note}"
                      </div>
                    )}
                    {req.decided_at && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(req.decided_at), "dd MMM yyyy, HH:mm")}
                        {req.approver_nama && ` · oleh ${req.approver_nama}`}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Approve Konfirmasi */}
      {approveReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => !submitting && setApproveReq(null)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sakura-success/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-sakura-success" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Konfirmasi Persetujuan</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{approveReq.judul}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-4">
              Dokumen akan otomatis masuk ke arsip setelah disetujui.
            </p>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Komentar persetujuan (opsional)..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
              disabled={submitting}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setApproveReq(null); setApproveComment(""); }}
                className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 rounded-lg bg-sakura-success text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
                disabled={submitting}
              >
                {submitting
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle size={15} />
                }
                Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject */}
      {rejectReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => !submitting && setRejectReq(null)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-foreground mb-1">Tolak Dokumen</h3>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{rejectReq.judul}</p>
            <p className="text-sm text-muted-foreground mb-3">
              Alasan penolakan akan dikirimkan kepada pengunggah sebagai notifikasi.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan dokumen..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
              disabled={submitting}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectReq(null); setRejectReason(""); }}
                className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || submitting}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-40"
              >
                {submitting
                  ? <Loader2 size={15} className="animate-spin" />
                  : <XCircle size={15} />
                }
                Tolak Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audit Trail */}
      {auditId && (
        <AuditTrailPanel requestId={auditId} onClose={() => setAuditId(null)} />
      )}

      {/* Modal: Document Detail */}
      {detailDoc && (
        <DocumentDetailModal document={detailDoc} onClose={() => setDetailDoc(null)} />
      )}
    </>
  );
}
