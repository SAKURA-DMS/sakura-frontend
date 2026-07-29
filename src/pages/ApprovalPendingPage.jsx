import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, Eye, ArrowRight, Upload, AlertTriangle, RefreshCw, AlertCircle } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import DocumentDetailModal from "@/components/document/DocumentDetail";
import UserAvatar from "@/components/shared/UserAvatar";
import { format, differenceInHours } from "date-fns";
import api from "@/lib/apiClient";
import { approveRequest, rejectRequest } from "@/services/documentService";

const STEPS = [
  { label: "Operator TU Upload", icon: Upload,       active: true  },
  { label: "Antrian Review",     icon: Clock,        active: false },
  { label: "Disetujui / Ditolak", icon: CheckCircle, active: false },
];

export default function ApprovalPendingPage() {
  const { currentUser, hasPermission, approveDocument, rejectDocument } = useApp();

  const [requests,       setRequests]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [detailDoc,      setDetailDoc]      = useState(null);
  const [rejectId,       setRejectId]       = useState(null);
  const [rejectReason,   setRejectReason]   = useState("");
  const [approveId,      setApproveId]      = useState(null);
  const [approveComment, setApproveComment] = useState("");
  const [successMsg,     setSuccessMsg]     = useState(null);
  const [isApproving,    setIsApproving]    = useState(false);

  const canApprove = hasPermission("documents.approve");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/approvals", { params: { status: "pending", limit: 100 } });
      const raw = data.requests || [];
      const sorted = [...raw].sort((a, b) => {
        const urgentFlagA = !!a.is_urgent;
        const urgentFlagB = !!b.is_urgent;
        if (urgentFlagA !== urgentFlagB) return urgentFlagA ? -1 : 1; 

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
      setError(e?.response?.data?.error || e.message || "Gagal memuat antrian persetujuan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleReject = async (req) => {
    if (!rejectReason.trim()) return;
    try {
      await rejectRequest(req.id, rejectReason.trim());
      setRejectId(null);
      setRejectReason("");
      await fetchPending();
    } catch (err) {
      setRejectId(null);
      setRejectReason("");
      setError(err?.response?.data?.error || err.message || "Gagal menolak dokumen");
    }
  };

  const handleApprove = async (req) => {
    if (isApproving) return; // cegah klik ganda saat request masih diproses
    setIsApproving(true);
    try {
      await approveRequest(req.id, approveComment.trim() || undefined);
      setApproveId(null);
      setApproveComment("");
      setSuccessMsg(`Dokumen "${req.judul}" berhasil disetujui dan diarsipkan.`);
      setTimeout(() => setSuccessMsg(null), 3500);

      // Optimistic update: hapus item dari list saat ini juga tanpa menunggu
      // full refetch, supaya UI langsung terasa responsif.
      setRequests((prev) => prev.filter((r) => r.id !== req.id));

      // Sinkronisasi ulang dengan server tetap dilakukan di background
      // (tidak di-await) untuk menjaga konsistensi data, tanpa memblokir UI.
      fetchPending();
    } catch (err) {
      setApproveId(null);
      setApproveComment("");
      setError(err?.response?.data?.error || err.message || "Gagal menyetujui dokumen");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <>
      <AppHeader title="Antrian Persetujuan" subtitle="Dokumen menunggu review dan persetujuan" />
      <div className="p-4 sm:p-8 space-y-6 animate-fade-in">

        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-center gap-3 sm:gap-6 overflow-x-auto pb-2">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    <step.icon size={22} />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center max-w-[100px]">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <ArrowRight size={18} className="text-muted-foreground shrink-0 mt-[-20px]" />}
              </div>
            ))}
          </div>
          <p className="text-center text-xs italic text-muted-foreground mt-3">
            Tinjau setiap dokumen yang diajukan sebelum menyetujui atau menolak permintaan pengarsipan. TU yang dapat mengunggah dokumen
          </p>
        </div>

        {/* Header antrian */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-sakura-warning" />
            <h3 className="font-bold text-foreground text-lg">Antrian Persetujuan</h3>
            {!loading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sakura-warning/20 text-sakura-warning font-semibold">
                {requests.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchPending}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-xl">
            <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Memuat antrian persetujuan...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <AlertCircle size={32} className="mx-auto text-destructive mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <button onClick={fetchPending} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Coba Lagi
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && requests.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-sakura-success mb-3" />
            <p className="text-foreground font-medium">Semua dokumen sudah ditinjau</p>
            <p className="text-sm text-muted-foreground mt-1">Tidak ada yang menunggu persetujuan.</p>
          </div>
        )}

        {/* List */}
        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => {
              const hours = differenceInHours(new Date(), new Date(req.requested_at));
              const isUrgent = !!req.is_urgent || hours > 72;
              return (
                <div key={req.id} className={`bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${isUrgent ? "border-l-4 border-l-destructive border-border" : "border-primary/[0.12]"}`}>
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={req.requester_id} avatar={req.requester_avatar} nama={req.requester_nama} size={36} />
                      <div>
                        <span className="text-sm font-semibold text-foreground">{req.requester_nama}</span>
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{req.requester_role}</span>
                      </div>
                    </div>
                    {isUrgent ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-destructive text-white flex items-center gap-1.5 shadow-sm animate-pulse">
                        <AlertTriangle size={12} /> URGENT
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(req.requested_at), "dd MMM yyyy, HH:mm")}
                      </span>
                    )}
                  </div>

                  {/* Title + tags */}
                  <h4 className="font-semibold text-foreground text-base mb-2">{req.judul}</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {req.category_name && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{req.category_name}</span>
                    )}
                    {req.type_name && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{req.type_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {req.nomor_dokumen} · Diunggah {format(new Date(req.requested_at), "dd MMM yyyy, HH:mm")}
                  </p>

                  {/* Catatan requester */}
                  {req.requester_note && (
                    <div className="border-l-[3px] border-primary/30 bg-primary/[0.03] rounded-r-lg px-3.5 py-2.5 mb-3 text-[13px] text-muted-foreground">
                      {req.requester_note}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setDetailDoc({
                        id:           req.document_id,
                        judul:        req.judul,
                        nomorDokumen: req.nomor_dokumen,
                        kategori:     req.category_name || "—",
                        kelas:        "—",
                        jenisDokumen: req.type_name || "—",
                        status:       req.doc_status || "Menunggu",
                        versi:        req.versi || 1,
                        tanggalUpload: req.requested_at,
                        tanggalEdit:   req.requested_at,
                        pengunggah:   { id: req.requester_id, nama: req.requester_nama, role: req.requester_role, avatar: req.requester_avatar },
                        auditTrail:   [],
                        fileUrl:      "",
                      })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card text-[13px] text-foreground hover:bg-muted transition-colors"
                    >
                      <Eye size={14} /> Lihat Detail
                    </button>
                    {canApprove && (
                      <>
                        <button
                          onClick={() => setApproveId(req)}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sakura-success text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                        >
                          <CheckCircle size={14} /> Setujui
                        </button>
                        <button
                          onClick={() => setRejectId(req)}
                          className="p-2 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                          title="Tolak"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setApproveId(null)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sakura-success/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-sakura-success" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Konfirmasi Persetujuan</h3>
                <p className="text-xs text-muted-foreground">{approveId.judul}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-4">Apakah Anda yakin ingin menyetujui dokumen ini?</p>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Komentar (opsional)..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setApproveId(null); setApproveComment(""); }} disabled={isApproving} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted disabled:opacity-50">Batal</button>
              <button onClick={() => handleApprove(approveId)} disabled={isApproving} className="px-4 py-2 rounded-lg bg-sakura-success text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {isApproving ? (
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {isApproving ? "Memproses..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tolak */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setRejectId(null)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-1">Alasan Penolakan</h3>
            <p className="text-xs text-muted-foreground mb-3">{rejectId.judul}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectId(null)} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Batal</button>
              <button onClick={() => handleReject(rejectId)} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90">
                Tolak Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {detailDoc && <DocumentDetailModal document={detailDoc} onClose={() => setDetailDoc(null)} />}
    </>
  );
}
