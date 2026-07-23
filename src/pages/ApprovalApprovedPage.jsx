import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Archive, RefreshCw, AlertCircle } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import DocumentDetailModal from "@/components/document/DocumentDetail";
import { format } from "date-fns";
import api from "@/lib/apiClient";
import { normalizeDocument } from "@/services/documentService";

export default function ApprovalApprovedPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailDoc, setDetailDoc] = useState(null);

  const fetchDecided = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [approvedRes, rejectedRes] = await Promise.all([
        api.get("/approvals", { params: { status: "approved", limit: 200 } }),
        api.get("/approvals", { params: { status: "rejected", limit: 200 } }),
      ]);
      const all = [
        ...(approvedRes.data.requests || []),
        ...(rejectedRes.data.requests || []),
      ].sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at));
      setRequests(all);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDecided(); }, [fetchDecided]);

  return (
    <>
      <AppHeader title="Keputusan Persetujuan" subtitle="Riwayat dokumen yang telah disetujui atau ditolak" />
      <div className="p-4 sm:p-8 animate-fade-in">

        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">Memuat riwayat persetujuan...</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <AlertCircle size={32} className="mx-auto text-destructive mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <button onClick={fetchDecided} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground">Belum ada keputusan.</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requests.map((req) => {
              const isApproved = req.status === "approved";
              const docForModal = {
                id:            req.document_id,
                judul:         req.judul,
                nomorDokumen:  req.nomor_dokumen,
                kategori:      req.category_name || "—",
                kelas:         "—",
                jenisDokumen:  req.type_name || "—",
                status:        isApproved ? "Diarsipkan" : "Ditolak",
                versi:         req.versi || 1,
                tanggalUpload: req.requested_at,
                tanggalEdit:   req.decided_at || req.requested_at,
                pengunggah:    { id: req.requester_id, nama: req.requester_nama, role: req.requester_role, avatar: req.requester_avatar },
                auditTrail:    [],
                fileUrl:       "",
              };
              return (
                <button
                  key={req.id}
                  onClick={() => setDetailDoc(docForModal)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isApproved ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive"
                  }`}>
                    {isApproved ? <Archive size={18} /> : <XCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{req.judul}</div>
                    <div className="text-xs text-muted-foreground">{req.nomor_dokumen} · {req.requester_nama}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {req.decided_at ? format(new Date(req.decided_at), "dd MMM yyyy") : "—"}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    isApproved ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive"
                  }`}>
                    {isApproved ? "Diarsipkan" : "Ditolak"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {detailDoc && <DocumentDetailModal document={detailDoc} onClose={() => setDetailDoc(null)} />}
    </>
  );
}