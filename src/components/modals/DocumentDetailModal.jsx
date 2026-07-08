import { X, Eye, Clock, FileText, CheckCircle, XCircle, Archive, Folder, Upload, Edit, Trash2, RotateCcw, AlertCircle, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import PdfPreviewOverlay from "@/components/document/PdfPreview";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/shared/UserAvatar";

const STATUS_COLORS = { Menunggu: "bg-sakura-warning/20 text-sakura-warning", Disetujui: "bg-sakura-success/20 text-sakura-success", Ditolak: "bg-destructive/20 text-destructive", Diarsipkan: "bg-muted text-muted-foreground" };
const ROLE_BADGE = { "Operator/TU": "bg-primary/10 text-primary border border-primary/20", "Kepala Sekolah": "bg-sakura-success/10 text-sakura-success border border-sakura-success/20", "Guru": "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", "Sistem": "bg-muted text-muted-foreground border border-border" };

function getActivityIcon(action) {
  if (!action) return <ClipboardList size={14} />;
  const a = action.toLowerCase();
  if (a.includes("mengunggah") || a.includes("upload")) return <Upload size={14} />;
  if (a.includes("mengedit") || a.includes("edit") || a.includes("mengganti file")) return <Edit size={14} />;
  if (a.includes("mengajukan") || a.includes("persetujuan")) return <ClipboardList size={14} />;
  if (a.includes("menyetujui") || a.includes("approve") || a.includes("diarsipkan")) return <CheckCircle size={14} />;
  if (a.includes("menolak") || a.includes("ditolak")) return <XCircle size={14} />;
  if (a.includes("tempat sampah") || a.includes("trash")) return <Trash2 size={14} />;
  if (a.includes("memulihkan") || a.includes("restore")) return <RotateCcw size={14} />;
  if (a.includes("dihapus") || a.includes("hapus permanen")) return <AlertCircle size={14} />;
  if (a.includes("mengunduh") || a.includes("download")) return <FileText size={14} />;
  return <ClipboardList size={14} />;
}

function getActivityIconBg(action) {
  if (!action) return "bg-muted text-muted-foreground";
  const a = action.toLowerCase();
  if (a.includes("menyetujui") || a.includes("diarsipkan")) return "bg-sakura-success/10 text-sakura-success";
  if (a.includes("menolak") || a.includes("ditolak") || a.includes("hapus")) return "bg-destructive/10 text-destructive";
  if (a.includes("memulihkan")) return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
  if (a.includes("tempat sampah")) return "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400";
  return "bg-primary/10 text-primary";
}

export default function DocumentDetailModal({ document: doc, onClose }) {
  const [showPdf, setShowPdf] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const { currentUser, hasPermission, approveDocument, rejectDocument, archiveDocument } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdmin = currentUser.role === "Operator/TU";

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    rejectDocument(doc.id, rejectReason.trim());
    setShowRejectForm(false);
    setRejectReason("");
    onClose();
    toast({ variant: "destructive", title: "❌ Dokumen Ditolak", description: `Dokumen '${doc.judul}' telah ditolak.`, className: "shadow-2xl border-2 border-red-800 font-bold bg-destructive text-destructive-foreground" });
  };

  const handleApprove = () => {
    approveDocument(doc.id, approveComment.trim() || undefined);
    setShowApproveForm(false);
    setApproveComment("");
    onClose();
    toast({ title: "Dokumen Disetujui", description: `Dokumen '${doc.judul}' telah disetujui.`, className: "bg-green-600 text-white border-none shadow-2xl font-semibold" });
  };

  const handleArchive = () => {
    archiveDocument(doc.id);
    setShowArchiveConfirm(false);
    onClose();
    toast({ title: "Berhasil Diarsipkan", description: `Dokumen '${doc.judul}' dimasukkan ke arsip.`, className: "bg-green-600 text-white border-none shadow-2xl font-semibold" });
  };

  const canApprove = hasPermission("documents.approve") && doc.status === "Menunggu";
  const canArchive = hasPermission("documents.archive") && doc.status === "Disetujui";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
        <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0"><FileText size={20} className="text-primary" /></div><div className="min-w-0"><h2 className="text-base sm:text-lg font-bold text-foreground truncate">{doc.judul}</h2><p className="text-sm text-muted-foreground">{doc.kategori} · {doc.kelas}</p></div></div>
            <div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[doc.status]}`}>{doc.status}</span><button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X size={20} /></button></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Nomor Dokumen", doc.nomorDokumen], ["Kategori", doc.kategori], ["Kelas / Unit", doc.kelas], ["Pengunggah", null], ["Tanggal Upload", format(new Date(doc.tanggalUpload), "yyyy-MM-dd HH:mm")], ["Tanggal Edit Terakhir", format(new Date(doc.tanggalEdit), "yyyy-MM-dd HH:mm")], ["Versi", `v${doc.versi}`], ["Status", null], ...(doc.namaSiswa ? [["Nama Siswa", doc.namaSiswa]] : []), ...(doc.nisn ? [["NISN", doc.nisn]] : []), ...(doc.tahunAjaran ? [["Tahun Ajaran", doc.tahunAjaran]] : [])].map(([label, val]) => (
                <div key={label}><div className="text-muted-foreground text-xs">{label}</div>{label === "Pengunggah" ? (<div className="flex items-center gap-2 mt-0.5"><span className="font-medium text-foreground">{doc.pengunggah.nama}</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[doc.pengunggah.role] || "bg-muted text-muted-foreground border border-border"}`}>{doc.pengunggah.role}</span></div>) : label === "Status" ? (<span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${STATUS_COLORS[doc.status]}`}>{doc.status}</span>) : (<div className="font-medium text-foreground">{val}</div>)}</div>
              ))}
            </div>
            {/* Lokasi field */}
            <div className="col-span-2">
              <div className="text-muted-foreground text-xs mb-1">Lokasi</div>
              <button
                onClick={() => { onClose(); navigate(`/archive?kategori=${encodeURIComponent(doc.kategori)}`); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-[13px] text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Folder size={16} className="text-muted-foreground" />
                {doc.kategori}
              </button>
            </div>
            {doc.catatan && <div className="px-3 py-2 rounded-lg bg-sakura-warning/10 border border-sakura-warning/30 text-sm text-sakura-warning font-medium">⚠ {doc.catatan}</div>}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowPdf(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"><Eye size={16} /> Preview</button>
              {canApprove && (<><button onClick={() => setShowApproveForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sakura-success/20 text-sakura-success text-sm font-semibold hover:bg-sakura-success/30 transition-colors"><CheckCircle size={16} /> Setujui</button><button onClick={() => setShowRejectForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors"><XCircle size={16} /> Tolak</button></>)}
              {canArchive && <button onClick={() => setShowArchiveConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"><Archive size={16} /> Masukkan ke Arsip Dokumen</button>}
            </div>
            {showApproveForm && (<div className="p-4 rounded-lg border border-sakura-success/30 bg-sakura-success/5 space-y-3"><h4 className="font-semibold text-sm text-sakura-success">Konfirmasi Persetujuan</h4><p className="text-sm text-foreground">Apakah Anda yakin ingin menyetujui dokumen ini?</p><textarea value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Komentar (opsional)..." rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" /><div className="flex gap-2"><button onClick={handleApprove} className="px-4 py-2 rounded-lg bg-sakura-success text-white text-sm font-semibold hover:opacity-90">Setujui</button><button onClick={() => { setShowApproveForm(false); setApproveComment(""); }} className="px-4 py-2 rounded-lg border border-input text-sm">Batal</button></div></div>)}
            {showArchiveConfirm && (<div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3"><h4 className="font-semibold text-sm text-primary">Konfirmasi Pengarsipan Dokumen</h4><p className="text-sm text-foreground">Apakah Anda yakin ingin memasukkan dokumen ini ke Arsip Dokumen?</p><div className="flex gap-2"><button onClick={handleArchive} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Arsipkan Dokumen</button><button onClick={() => setShowArchiveConfirm(false)} className="px-4 py-2 rounded-lg border border-input text-sm">Batal</button></div></div>)}
            {showRejectForm && (<div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3"><h4 className="font-semibold text-sm text-destructive">Alasan Penolakan</h4><textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Masukkan alasan penolakan..." rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" /><div className="flex gap-2"><button onClick={handleReject} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90">Tolak</button><button onClick={() => setShowRejectForm(false)} className="px-4 py-2 rounded-lg border border-input text-sm">Batal</button></div></div>)}
            {/* Lokasi File breadcrumb */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-primary" />
                <span className="font-semibold text-sm text-foreground">Lokasi File</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button onClick={() => { onClose(); navigate(`/archive?kategori=${encodeURIComponent(doc.kategori)}`); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-muted transition-colors cursor-pointer">
                  {doc.kategori}
                </button>
                {doc.jenisDokumen && (
                  <>
                    <span className="text-muted-foreground text-xs mx-1">›</span>
                    <button onClick={() => { onClose(); navigate(`/archive?kategori=${encodeURIComponent(doc.kategori)}`); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-muted transition-colors cursor-pointer">
                      {doc.jenisDokumen}
                    </button>
                  </>
                )}
                {doc.tahunAjaran && doc.tahunAjaran !== "-" && (
                  <>
                    <span className="text-muted-foreground text-xs mx-1">›</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground">
                      {doc.tahunAjaran}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Jejak Aktivitas */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-primary" />
                <h3 className="font-bold text-foreground">Jejak Aktivitas</h3>
                <span className="text-xs text-muted-foreground">(Read-only)</span>
              </div>
              {(!doc.auditTrail || doc.auditTrail.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas tercatat.</p>
              ) : (
                <div className="relative space-y-0">
                  {/* vertical line */}
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
                  {doc.auditTrail.map((entry, i) => (
                    <div key={i} className="flex gap-3 pb-5 last:pb-0 animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                      {/* icon circle */}
                      <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${getActivityIconBg(entry.action)}`}>
                        {getActivityIcon(entry.action)}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <UserAvatar userId={entry.user?.id} avatar={entry.user?.avatar} nama={entry.user?.nama || "Sistem"} size={24} />
                          <span className="font-semibold text-sm text-foreground">{entry.user?.nama || "Sistem"}</span>
                          {entry.user?.role && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[entry.user.role] || "bg-muted text-muted-foreground border border-border"}`}>
                              {entry.user.role}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">{format(new Date(entry.time), "yyyy-MM-dd HH:mm")}</span>
                        </div>
                        <p className="text-sm text-foreground">{entry.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      {showPdf && <PdfPreviewOverlay onClose={() => setShowPdf(false)} document={doc} isAdmin={isAdmin} />}
    </>
  );
}