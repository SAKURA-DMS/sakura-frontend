import {
  X,
  Eye,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Archive,
  Folder,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import PdfPreviewOverlay from "./PdfPreview";
import { useApp } from "@/contexts/AppContext";
import { getDocument } from "@/services/documentService";
import UserAvatar from "@/components/shared/UserAvatar";

const STATUS_COLORS = {
  Menunggu: "bg-sakura-warning/20 text-sakura-warning",
  Disetujui: "bg-sakura-success/20 text-sakura-success",
  Ditolak: "bg-destructive/20 text-destructive",
  Diarsipkan: "bg-muted text-muted-foreground",
};

const ROLE_BADGE = {
  "Operator/TU":
    "bg-primary/10 text-primary border border-primary/20",
  "Kepala Sekolah":
    "bg-sakura-success/10 text-sakura-success border border-sakura-success/20",
  Guru:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  Sistem:
    "bg-muted text-muted-foreground border border-border",
};

export default function DocumentDetailModal({ document: doc, onClose }) {
  const [showPdf, setShowPdf] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const {
    currentUser,
    hasPermission,
    approveDocument,
    rejectDocument,
    archiveDocument,
  } = useApp();

  const navigate = useNavigate();

  // Fetch audit trail langsung dari API berdasarkan document_id
  const [auditTrail, setAuditTrail] = useState(doc.auditTrail || []);
  const [trailLoading, setTrailLoading] = useState(false);

  // Metadata detail dokumen dari backend
  const [documentMetadata, setDocumentMetadata] = useState(null);

  // Popup "Komentar" untuk entri approve/reject yang punya catatan
  const [activeNote, setActiveNote] = useState(null);

  useEffect(() => {
    if (!doc?.id) return;

    setTrailLoading(true);
    setDocumentMetadata(null);

    getDocument(doc.id)
      .then(({ auditTrail: trail, metadata }) => {
        setAuditTrail(trail || []);
        setDocumentMetadata(metadata || null);
      })
      .catch(() => {
        // fallback ke data yang sudah ada
        setAuditTrail(doc.auditTrail || []);
        setDocumentMetadata(null);
      })
      .finally(() => setTrailLoading(false));
  }, [doc.id]);

  const handleReject = () => {
    if (!rejectReason.trim()) return;

    rejectDocument(doc.id, rejectReason.trim());
    setShowRejectForm(false);
    setRejectReason("");
    onClose();
  };

  const handleApprove = () => {
    approveDocument(doc.id, approveComment.trim() || undefined);
    setShowApproveForm(false);
    setApproveComment("");
    onClose();
  };

  const handleArchive = () => {
    archiveDocument(doc.id);
    setShowArchiveConfirm(false);
    onClose();
  };

  const canApprove =
    hasPermission("documents.approve") && doc.status === "Menunggu";

  const canArchive =
    hasPermission("documents.archive") && doc.status === "Disetujui";

  // Ambil isi catatan approve/reject dari kolom new_value
  const getEntryNote = (entry) => {
    const nv = entry?.new_value;

    if (!nv || typeof nv !== "object") return null;

    const note = nv.catatan || nv.alasan || null;

    return note && String(note).trim()
      ? String(note).trim()
      : null;
  };

  // Field internal database yang tidak perlu ditampilkan ke user
  const HIDDEN_METADATA_FIELDS = [
    "id",
    "document_id",
    "created_at",
    "updated_at",
  ];

  // Label metadata agar nama field database tampil lebih manusiawi
  const METADATA_LABELS = {
    // Data siswa
    nama_siswa: "Nama Siswa",
    nis: "NIS",
    nisn: "NISN",
    kelas: "Kelas",
    tahun_ajaran: "Tahun Ajaran",
    tempat_lahir: "Tempat Lahir",
    tanggal_lahir: "Tanggal Lahir",
    jenis_kelamin: "Jenis Kelamin",
    nama_orang_tua: "Nama Orang Tua",
    no_hp_orang_tua: "No. HP Orang Tua",

    // Data guru
    nama_guru: "Nama Guru",
    nip: "NIP",
    mata_pelajaran: "Mata Pelajaran",
    jabatan: "Jabatan",
    pangkat_golongan: "Pangkat / Golongan",

    // Sarana prasarana
    nama_barang: "Nama Barang",
    kode_barang: "Kode Barang",
    jumlah: "Jumlah",
    kondisi: "Kondisi",
    lokasi: "Lokasi",
    tahun_perolehan: "Tahun Perolehan",
    sumber_dana: "Sumber Dana",

    // Surat
    nomor_surat: "Nomor Surat",
    tanggal_surat: "Tanggal Surat",
    pengirim: "Pengirim",
    penerima: "Penerima",
    perihal: "Perihal",

    // SK
    nomor_sk: "Nomor SK",
    tanggal_sk: "Tanggal SK",
    tentang: "Tentang",
  };

  const metadataEntries =
    documentMetadata && typeof documentMetadata === "object"
      ? Object.entries(documentMetadata).filter(
          ([key, value]) =>
            !HIDDEN_METADATA_FIELDS.includes(key) &&
            value !== null &&
            value !== undefined &&
            value !== ""
        )
      : [];

  const formatMetadataValue = (value) => {
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(value)
    ) {
      const parsedDate = new Date(value);

      if (!Number.isNaN(parsedDate.getTime())) {
        return format(parsedDate, "dd/MM/yyyy");
      }
    }

    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      const parsedDate = new Date(`${value}T00:00:00`);

      if (!Number.isNaN(parsedDate.getTime())) {
        return format(parsedDate, "dd/MM/yyyy");
      }
    }

    if (typeof value === "boolean") {
      return value ? "Ya" : "Tidak";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const getMetadataLabel = (key) => {
    if (METADATA_LABELS[key]) {
      return METADATA_LABELS[key];
    }

    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in p-4"
        onClick={onClose}
      >
        <div
          className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <FileText size={20} className="text-primary" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {doc.judul}
                </h2>

                <p className="text-sm text-muted-foreground">
                  {doc.kategori} · {doc.kelas}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  STATUS_COLORS[doc.status]
                }`}
              >
                {doc.status}
              </span>

              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
            {/* Informasi umum dokumen */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Nomor Dokumen", doc.nomorDokumen],
                ["Kategori", doc.kategori],
                ["Kelas / Unit", doc.kelas],
                ["Pengunggah", null],
                [
                  "Tanggal Upload",
                  format(new Date(doc.tanggalUpload), "yyyy-MM-dd HH:mm"),
                ],
                [
                  "Tanggal Edit Terakhir",
                  format(new Date(doc.tanggalEdit), "yyyy-MM-dd HH:mm"),
                ],
                ["Versi", `v${doc.versi}`],
                ["Status", null],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-muted-foreground text-xs">
                    {label}
                  </div>

                  {label === "Pengunggah" ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-foreground">
                        {doc.pengunggah.nama}
                      </span>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ROLE_BADGE[doc.pengunggah.role] ||
                          "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {doc.pengunggah.role}
                      </span>
                    </div>
                  ) : label === "Status" ? (
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                        STATUS_COLORS[doc.status]
                      }`}
                    >
                      {doc.status}
                    </span>
                  ) : (
                    <div className="font-medium text-foreground">
                      {val}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Data Detail Dokumen / Metadata */}
            {metadataEntries.length > 0 && (
              <div className="border border-border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={17} className="text-primary" />

                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      Data Detail Dokumen
                    </h3>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Informasi metadata yang tersimpan pada dokumen
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key}>
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {getMetadataLabel(key)}
                      </div>

                      <div className="font-medium text-foreground break-words">
                        {formatMetadataValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lokasi field */}
            <div className="col-span-2">
              <div className="text-muted-foreground text-xs mb-1">
                Lokasi
              </div>

              <button
                onClick={() => {
                  onClose();
                  navigate(
                    `/archive?kategori=${encodeURIComponent(doc.kategori)}`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-[13px] text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Folder
                  size={16}
                  className="text-muted-foreground"
                />

                {doc.kategori}
              </button>
            </div>

            {doc.catatan && (
              <div className="px-3 py-2 rounded-lg bg-sakura-warning/10 border border-sakura-warning/30 text-sm text-sakura-warning font-medium">
                ⚠ {doc.catatan}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowPdf(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Eye size={16} />
                Preview
              </button>

              {canApprove && (
                <>
                  <button
                    onClick={() => setShowApproveForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sakura-success/20 text-sakura-success text-sm font-semibold hover:bg-sakura-success/30 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Setujui
                  </button>

                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    <XCircle size={16} />
                    Tolak
                  </button>
                </>
              )}

              {canArchive && (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Archive size={16} />
                  Masukkan ke Arsip Dokumen
                </button>
              )}
            </div>

            {/* Approve form */}
            {showApproveForm && (
              <div className="p-4 rounded-lg border border-sakura-success/30 bg-sakura-success/5 space-y-3">
                <h4 className="font-semibold text-sm text-sakura-success">
                  Konfirmasi Persetujuan
                </h4>

                <p className="text-sm text-foreground">
                  Apakah Anda yakin ingin menyetujui dokumen ini?
                </p>

                <textarea
                  value={approveComment}
                  onChange={(e) =>
                    setApproveComment(e.target.value)
                  }
                  placeholder="Komentar (opsional)..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 rounded-lg bg-sakura-success text-white text-sm font-semibold hover:opacity-90"
                  >
                    Setujui
                  </button>

                  <button
                    onClick={() => {
                      setShowApproveForm(false);
                      setApproveComment("");
                    }}
                    className="px-4 py-2 rounded-lg border border-input text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Archive confirmation */}
            {showArchiveConfirm && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <h4 className="font-semibold text-sm text-primary">
                  Konfirmasi Pengarsipan Dokumen
                </h4>

                <p className="text-sm text-foreground">
                  Apakah Anda yakin ingin memasukkan dokumen ini ke
                  Arsip Dokumen?
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleArchive}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                  >
                    Arsipkan Dokumen
                  </button>

                  <button
                    onClick={() =>
                      setShowArchiveConfirm(false)
                    }
                    className="px-4 py-2 rounded-lg border border-input text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Reject form */}
            {showRejectForm && (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
                <h4 className="font-semibold text-sm text-destructive">
                  Alasan Penolakan
                </h4>

                <textarea
                  value={rejectReason}
                  onChange={(e) =>
                    setRejectReason(e.target.value)
                  }
                  placeholder="Masukkan alasan penolakan..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90"
                  >
                    Tolak
                  </button>

                  <button
                    onClick={() =>
                      setShowRejectForm(false)
                    }
                    className="px-4 py-2 rounded-lg border border-input text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Lokasi File breadcrumb */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-primary" />

                <span className="font-semibold text-sm text-foreground">
                  Lokasi File
                </span>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => {
                    onClose();
                    navigate(
                      `/archive?kategori=${encodeURIComponent(
                        doc.kategori
                      )}`
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  {doc.kategori}
                </button>

                {doc.jenisDokumen && (
                  <>
                    <span className="text-muted-foreground text-xs mx-1">
                      ›
                    </span>

                    <button
                      onClick={() => {
                        onClose();
                        navigate(
                          `/archive?kategori=${encodeURIComponent(
                            doc.kategori
                          )}`
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {doc.jenisDokumen}
                    </button>
                  </>
                )}

                {doc.tahunAjaran &&
                  doc.tahunAjaran !== "-" && (
                    <>
                      <span className="text-muted-foreground text-xs mx-1">
                        ›
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground">
                        {doc.tahunAjaran}
                      </span>
                    </>
                  )}
              </div>
            </div>

            {/* Jejak Aktivitas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-primary" />

                <h3 className="font-bold text-foreground">
                  Jejak Aktivitas
                </h3>

                <span className="text-xs text-muted-foreground">
                  (Read-only)
                </span>
              </div>

              {trailLoading ? (
                <p className="text-sm text-muted-foreground py-4">
                  Memuat jejak aktivitas...
                </p>
              ) : !auditTrail || auditTrail.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada aktivitas tercatat.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditTrail.map((entry, i) => {
                    const note = getEntryNote(entry);

                    return (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <UserAvatar
                            userId={entry.user?.id}
                            avatar={entry.user?.avatar}
                            nama={
                              entry.user?.nama || "Sistem"
                            }
                            size={32}
                          />

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">
                                {entry.user?.nama ||
                                  "Sistem"}
                              </span>

                              {entry.user?.role && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    ROLE_BADGE[
                                      entry.user.role
                                    ] ||
                                    "bg-muted text-muted-foreground border border-border"
                                  }`}
                                >
                                  {entry.user.role}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-foreground/80 mt-0.5">
                              {entry.action}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {note && (
                            <button
                              onClick={() =>
                                setActiveNote({
                                  entry,
                                  note,
                                })
                              }
                              title="Lihat komentar"
                              className="flex items-center gap-1 px-2 py-1 rounded-full bg-sakura-success text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                            >
                              <MessageSquare size={12} />
                              1
                            </button>
                          )}

                          <span className="text-xs text-muted-foreground pt-1">
                            {format(
                              new Date(entry.time),
                              "yyyy-MM-dd HH:mm"
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPdf && (
        <PdfPreviewOverlay
          onClose={() => setShowPdf(false)}
          document={doc}
        />
      )}

      {/* Popup Komentar */}
      {activeNote && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setActiveNote(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="font-bold text-foreground">
                Komentar
              </h3>

              <button
                onClick={() => setActiveNote(null)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  userId={activeNote.entry.user?.id}
                  avatar={activeNote.entry.user?.avatar}
                  nama={
                    activeNote.entry.user?.nama ||
                    "Sistem"
                  }
                  size={36}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">
                      {activeNote.entry.user?.nama ||
                        "Sistem"}
                    </span>

                    {activeNote.entry.user?.role && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ROLE_BADGE[
                            activeNote.entry.user.role
                          ] ||
                          "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {activeNote.entry.user.role}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(
                      new Date(activeNote.entry.time),
                      "yyyy-MM-dd"
                    )}{" "}
                    ·{" "}
                    {format(
                      new Date(activeNote.entry.time),
                      "HH:mm"
                    )}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground whitespace-pre-wrap break-words">
                {activeNote.note}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════
   DocumentList (formerly DocumentListModal.jsx)
   ═══════════════════════════════════════ */

const LIST_STATUS_COLORS = {
  Menunggu: "bg-sakura-warning/20 text-sakura-warning",
  Disetujui: "bg-sakura-success/20 text-sakura-success",
  Ditolak: "bg-destructive/20 text-destructive",
  Diarsipkan: "bg-muted text-muted-foreground",
};

export function DocumentList({
  title,
  documents,
  onClose,
  onSelectDocument,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {documents.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Tidak ada dokumen ditemukan.
            </p>
          )}

          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <FileText
                  size={20}
                  className="text-primary"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">
                  {doc.judul}
                </div>

                <div className="text-xs text-muted-foreground">
                  {doc.nomorDokumen} · {doc.kategori} ·{" "}
                  {doc.kelas}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    LIST_STATUS_COLORS[doc.status]
                  }`}
                >
                  {doc.status}
                </span>

                <span className="text-xs text-muted-foreground">
                  {format(
                    new Date(doc.tanggalUpload),
                    "dd/MM/yyyy"
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}