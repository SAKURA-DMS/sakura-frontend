import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  Upload, Camera, X, Eye, FileText, CalendarIcon, Maximize,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw,
  AlertTriangle, Lock, Search, Info, CheckCircle, ChevronDown, Plus, Save, Users,
  RotateCcw, Clock, FileCheck, Wand2,
} from "lucide-react";
import CameraScanModal from "@/components/scan/CameraScanModal";
import OCRFillModal from "@/components/scan/OCRFillModal";
import { useApp } from "@/contexts/AppContext";
import PdfPreviewOverlay from "@/components/modals/PdfPreviewOverlay";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  CATEGORIES, DOCUMENT_TYPES, TAHUN_AJARAN_OPTIONS,
  CATEGORY_FORM_FIELDS, SURAT_TYPE_FORM_FIELDS,
  getAutoFolderPath, getFolderIdForDocument
} from "@/data/mockData";
import { Calendar } from "@/components/ui/calendar";
import api from "@/lib/apiClient";
import { saveDraft, loadDraft, clearDraft, hasDraft } from "@/services/uploadDraftService";
import { previewDocumentNumber } from "@/services/documentService";
import { OCR_FIELD_ORDER, OCR_FIELD_LABELS, DOCUMENT_TYPE_LABELS } from "@/services/ocrService";

// ─── Mode constants ────────────────────────────────────────────────────────
const MODE_JUDUL = "hanya_judul";
const MODE_LENGKAP = "isi_data_lengkap";

// ─── Cara Mengisi Guide — full-width professional layout ─────────────────
function CaraMengisiGuide({ mode, onClose }) {
  const steps =
    mode === MODE_JUDUL
      ? [
          {
            icon: "📂",
            title: "Upload File",
            desc: "Unggah file dokumen yang akan diarsipkan dalam sistem SAKURA.",
            step: "01",
          },
          {
            icon: "📝",
            title: "Isi Informasi Dasar",
            desc: "Isi judul dokumen, pilih kategori, jenis, folder, dan tanggal upload.",
            step: "02",
          },
          {
            icon: "✅",
            title: "Verifikasi",
            desc: "Periksa kembali seluruh informasi yang telah diisi.",
            step: "03",
          },
          {
            icon: "💾",
            title: "Simpan & Unggah",
            desc: 'Klik tombol "Upload Dokumen" untuk mengunggah ke sistem.',
            step: "04",
          },
        ]
      : [
          {
            icon: "📂",
            title: "Upload File",
            desc: "Unggah file dokumen yang akan diarsipkan dalam sistem SAKURA.",
            step: "01",
          },
          {
            icon: "📝",
            title: "Isi Informasi Dasar",
            desc: "Isi judul dokumen, pilih kategori, jenis, folder, dan tanggal upload.",
            step: "02",
          },
          {
            icon: "👤",
            title: "Isi Data Detail",
            desc: "Lengkapi data sesuai jenis dokumen: data siswa, guru, inventaris, atau surat.",
            step: "03",
          },
          {
            icon: "💾",
            title: "Simpan & Unggah",
            desc: 'Periksa kembali data, lalu klik "Upload Dokumen" untuk menyelesaikan.',
            step: "04",
          },
        ];

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Info size={15} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Panduan Pengisian —{" "}
              <span className="text-primary">
                {mode === MODE_JUDUL ? "Mode Hanya Judul" : "Mode Isi Data Lengkap"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ikuti langkah berikut untuk mengunggah dokumen dengan benar
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Steps */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="relative flex flex-col">
              {/* Connector line (hidden on mobile, shown on lg) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+2rem)] right-0 h-px border-t-2 border-dashed border-border z-0" />
              )}

              <div className="relative z-10 flex flex-col items-center text-center p-4 rounded-xl bg-muted/20 border border-border/60 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group">
                {/* Step number badge */}
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <span className="text-[10px] font-bold text-primary tracking-wider">{s.step}</span>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center text-2xl mb-3 mt-2 group-hover:scale-105 transition-transform">
                  {s.icon}
                </div>

                {/* Title */}
                <p className="text-sm font-bold text-foreground mb-1.5">{s.title}</p>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>

              {/* Mobile connector */}
              {i < steps.length - 1 && (
                <div className="flex justify-center lg:hidden mt-2 mb-0">
                  <ChevronRight size={16} className="text-border rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mode tip */}
        <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-primary/[0.04] border border-primary/15">
          <CheckCircle size={15} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {mode === MODE_JUDUL ? (
              <>
                <strong className="text-foreground">Mode Hanya Judul</strong> cocok untuk dokumen tebal
                (buku absensi, laporan semester, arsip lama) di mana cukup mencatat judul dan kategorinya
                tanpa perlu mengisi data per-halaman.
              </>
            ) : (
              <>
                <strong className="text-foreground">Mode Isi Data Lengkap</strong> ideal untuk dokumen
                yang membutuhkan pencatatan metadata spesifik — seperti data siswa, data guru, inventaris,
                atau surat masuk/keluar — sehingga dokumen mudah ditemukan dan difilter di Arsip.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Draft restore banner ─────────────────────────────────────────────────
function DraftBanner({ draftDate, onRestore, onDiscard }) {
  const formatted = draftDate
    ? (() => {
        try {
          const d = new Date(draftDate);
          return `${format(d, "dd/MM/yyyy")} pukul ${format(d, "HH:mm")}`;
        } catch {
          return draftDate;
        }
      })()
    : null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 flex items-center justify-center shrink-0">
          <Clock size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Draft upload ditemukan
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
            Anda memiliki draft yang belum selesai diunggah
            {formatted ? `, disimpan pada ${formatted}` : ""}.
            Pulihkan untuk melanjutkan atau buang untuk memulai baru.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0 sm:ml-2">
        <button
          type="button"
          onClick={onDiscard}
          className="px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-600 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          Buang Draft
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
        >
          <FileCheck size={13} /> Pulihkan Draft
        </button>
      </div>
    </div>
  );
}

// ─── "Lainnya" custom input with save ──────────────────────────────────────
function LainnyaInput({ value, onChange, onSave, placeholder = "Masukkan nama baru..." }) {
  return (
    <div className="mt-2 flex gap-2 animate-fade-in">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={!value.trim()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Save size={14} /> Simpan
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function UploadForm({ onSuccess, onCancel, selectedModule, guruUploadOwn, lockedNip, lockedTypeId }) {
  const { uploadDocument, currentUser, users } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // ── Draft state ────────────────────────────────────────────────────────
  const [pendingDraft, setPendingDraft] = useState(null); // draft belum dipulihkan
  const [draftRestored, setDraftRestored] = useState(false);

  // ── Mode pengisian ─────────────────────────────────────────────────────
  const [fillMode, setFillMode] = useState(MODE_JUDUL);
  const [showCaraGuide, setShowCaraGuide] = useState(false);

  // ── File state ─────────────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [scanPageImages, setScanPageImages] = useState([]);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCameraScan, setShowCameraScan] = useState(false);
  const [scanForOCR, setScanForOCR] = useState(false);
  const [shouldAutoConfirmOCR, setShouldAutoConfirmOCR] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [lastScanUrl, setLastScanUrl] = useState(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [fullPreviewZoom, setFullPreviewZoom] = useState(100);
  const [fullPreviewPage, setFullPreviewPage] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(null);

  // ── Category / Type ────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [categoryList, setCategoryList] = useState(CATEGORIES);
  const [typeList, setTypeList] = useState(DOCUMENT_TYPES);

  // "Lainnya" flow
  const [kategoriValue, setKategoriValue] = useState("");
  const [showKategoriLainnya, setShowKategoriLainnya] = useState(false);
  const [kategoriLainnyaText, setKategoriLainnyaText] = useState("");
  const [jenisValue, setJenisValue] = useState("");
  const [showJenisLainnya, setShowJenisLainnya] = useState(false);
  const [jenisLainnyaText, setJenisLainnyaText] = useState("");

  // ── Sensitive / Urgent / NIP ───────────────────────────────────────────
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSensitif, setIsSensitif] = useState(false);
  const [ownerNIPs, setOwnerNIPs] = useState(lockedNip ? [lockedNip] : []);
  const [nipSearch, setNipSearch] = useState("");
  const [nipDropdownOpen, setNipDropdownOpen] = useState(false);

  // ── Form fields ────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    nomorDokumen: "",
    judul: "",
    jenisDokumen: "",
    kategori: "",
    versi: "v1",
    tanggalUpload: new Date(),
  });
  const [metaData, setMetaData] = useState({});

  // ── Mode OCR ────────────────────────────────────────────────────────────
  // Aktif setelah user menekan "Gunakan Data Ini" di OCRFillModal. Saat aktif,
  // section "Data Detail" reguler disembunyikan dan digantikan section
  // "Data Hasil OCR" (lihat render di bawah). Metadata reguler & flow upload
  // TIDAK diubah — ini hanya menambah jalur tampilan/isi baru di atasnya.
  const [ocrDataMode, setOcrDataMode] = useState(false);
  const [ocrDocType, setOcrDocType] = useState(null);
  const ocrFieldOrder = ocrDocType ? (OCR_FIELD_ORDER[ocrDocType] || []) : [];

  // ── Nomor Dokumen (generated, readonly) ───────────────────────────────
  // Nilai ini hanya preview sisi klien — nomor final (berurutan, unik)
  // di-generate ulang di server saat submit. Ditampilkan di form agar user
  // bisa melihat format nomor sebelum dokumen disimpan.
  const [nomorPreview, setNomorPreview] = useState("");
  const [nomorLoading, setNomorLoading] = useState(false);

  // Otomatis fetch preview nomor setiap kali kategori & jenis berubah
  useEffect(() => {
    if (!selectedCategoryId || !selectedTypeId) {
      setNomorPreview("");
      return;
    }
    let cancelled = false;
    setNomorLoading(true);
    previewDocumentNumber(selectedCategoryId, selectedTypeId)
      .then((nomor) => { if (!cancelled) setNomorPreview(nomor); })
      .catch(() => { if (!cancelled) setNomorPreview(""); })
      .finally(() => { if (!cancelled) setNomorLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCategoryId, selectedTypeId]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const updateMeta = (key, val) => setMetaData((p) => ({ ...p, [key]: val }));

  // ── Draft: check on mount ──────────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setPendingDraft(draft);
    }
  }, []);

  // ── Draft: auto-save on every form change ──────────────────────────────
  const draftPayload = useMemo(() => ({
    fillMode,
    isUrgent,
    isSensitif,
    ownerNIPs,
    form,
    metaData,
    selectedCategoryId,
    selectedTypeId,
    kategoriValue,
    jenisValue,
    filePreview,
    fileName: file?.name ?? null,
    fileSize: file?.size ?? null,
    fileType: file?.type ?? null,
    scanPageImages,
  }), [
    fillMode, isUrgent, isSensitif, ownerNIPs, form, metaData,
    selectedCategoryId, selectedTypeId, kategoriValue, jenisValue,
    filePreview, file, scanPageImages,
  ]);

  // Save draft whenever meaningful data changes (debounce 800ms)
  useEffect(() => {
    // Don't save an empty form or if upload is in progress
    if (uploadProgress !== null) return;
    const hasData = form.judul || selectedCategoryId || file || scanPageImages.length > 0;
    if (!hasData) return;

    const t = setTimeout(() => saveDraft(draftPayload), 800);
    return () => clearTimeout(t);
  }, [draftPayload, uploadProgress]);

  // Save draft on page unload / visibility change / navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      const hasData = form.judul || selectedCategoryId || file || scanPageImages.length > 0;
      if (hasData && uploadProgress === null) saveDraft(draftPayload);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleBeforeUnload();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [draftPayload, form, selectedCategoryId, file, scanPageImages, uploadProgress]);

  // ── Draft: restore handler ─────────────────────────────────────────────
  const handleRestoreDraft = () => {
    const d = pendingDraft;
    if (!d) return;

    if (d.fillMode) setFillMode(d.fillMode);
    if (d.isUrgent !== undefined) setIsUrgent(d.isUrgent);
    if (d.isSensitif !== undefined) setIsSensitif(d.isSensitif);
    if (d.ownerNIPs?.length) setOwnerNIPs(d.ownerNIPs);
    if (d.form) setForm({ ...form, ...d.form });
    if (d.metaData) setMetaData(d.metaData);
    if (d.selectedCategoryId) setSelectedCategoryId(d.selectedCategoryId);
    if (d.selectedTypeId) setSelectedTypeId(d.selectedTypeId);
    if (d.kategoriValue) setKategoriValue(d.kategoriValue);
    if (d.jenisValue) setJenisValue(d.jenisValue);
    if (d.filePreview) setFilePreview(d.filePreview);
    if (d.scanPageImages?.length) setScanPageImages(d.scanPageImages);

    setPendingDraft(null);
    setDraftRestored(true);
    toast({
      title: "✓ Draft Dipulihkan",
      description: d.fileName
        ? `Data draft dan preview "${d.fileName}" berhasil dimuat. Pilih file kembali untuk melanjutkan upload.`
        : "Data draft berhasil dimuat. Lanjutkan mengisi form.",
    });
  };

  // ── Draft: discard handler ─────────────────────────────────────────────
  const handleDiscardDraft = () => {
    clearDraft();
    setPendingDraft(null);
    toast({ title: "Draft dihapus", description: "Mulai pengisian baru." });
  };

  // ── Reset: hapus semua data + draft ───────────────────────────────────
  const handleReset = () => {
    clearDraft();
    setFile(null);
    setFilePreview(null);
    setScanPageImages([]);
    setMetaData({});
    setOcrDataMode(false);
    setOcrDocType(null);
    setForm({
      nomorDokumen: "",
      judul: "",
      jenisDokumen: "",
      kategori: "",
      versi: "v1",
      tanggalUpload: new Date(),
    });
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setKategoriValue("");
    setJenisValue("");
    setFillMode(MODE_JUDUL);
    setIsUrgent(false);
    setIsSensitif(false);
    setOwnerNIPs(lockedNip ? [lockedNip] : []);
    setShowKategoriLainnya(false);
    setShowJenisLainnya(false);
    setKategoriLainnyaText("");
    setJenisLainnyaText("");
    setDraftRestored(false);
    setPendingDraft(null);
    toast({ title: "Form dikosongkan", description: "Semua data dan draft telah dihapus." });
  };

  // ── Auto-fill category for Guru ────────────────────────────────────────
  // Guru hanya boleh upload ke kategori "Administrasi" (category_id 5) —
  // lihat migration_guru_document_types.sql untuk daftar jenis dokumennya.
  useEffect(() => {
    if (guruUploadOwn && !selectedCategoryId) {
      const cat = categoryList.find((c) => c.category_id === 5);
      setSelectedCategoryId(5);
      setKategoriValue("5");
      setForm((p) => ({ ...p, kategori: cat?.category_name || "Administrasi" }));
    }
  }, [guruUploadOwn, selectedCategoryId, categoryList]);

  // ── Derived lists ──────────────────────────────────────────────────────
  const jenisOptions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return typeList.filter((t) => t.category_id === selectedCategoryId);
  }, [selectedCategoryId, typeList]);

  const dynamicFields = useMemo(() => {
    if (!selectedCategoryId || !selectedTypeId) return [];
    if (selectedCategoryId === 4) return SURAT_TYPE_FORM_FIELDS[selectedTypeId] || [];
    return CATEGORY_FORM_FIELDS[selectedCategoryId] || [];
  }, [selectedCategoryId, selectedTypeId]);

  const hasSelection = selectedCategoryId && selectedTypeId;

  const autoFolderDisplay = useMemo(() => {
    if (!selectedCategoryId || !selectedTypeId) return "";
    const tahun = metaData.tahunAjaran || "";
    return getAutoFolderPath(selectedCategoryId, selectedTypeId, tahun);
  }, [selectedCategoryId, selectedTypeId, metaData.tahunAjaran]);

  // NIP helpers
  const nipUsers = useMemo(() => users.filter((u) => u.nip && u.nip.length > 0), [users]);
  const filteredNipUsers = useMemo(() => {
    const q = nipSearch.toLowerCase();
    return nipUsers.filter(
      (u) => !ownerNIPs.includes(u.nip) && (!q || u.nama.toLowerCase().includes(q) || u.nip.includes(q))
    );
  }, [nipUsers, nipSearch, ownerNIPs]);

  const addNip = (nip) => { setOwnerNIPs((p) => [...p, nip]); setNipSearch(""); setNipDropdownOpen(false); };
  const removeNip = (nip) => { if (!guruUploadOwn) setOwnerNIPs((p) => p.filter((n) => n !== nip)); };

  // ── Rotate scan page ───────────────────────────────────────────────────
  const rotatePage = useCallback((idx) => {
    const src = scanPageImages[idx];
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.height; c.height = img.width;
      const ctx = c.getContext("2d");
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      setScanPageImages((prev) => prev.map((p, i) => (i === idx ? c.toDataURL("image/jpeg", 0.92) : p)));
    };
    img.src = src;
  }, [scanPageImages]);

  // ── File handling ──────────────────────────────────────────────────────
  const handleFile = (f) => {
    const maxSize = 25 * 1024 * 1024;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(f.type)) {
      toast({ title: "Format tidak didukung", description: "Hanya PDF, JPG, PNG yang diizinkan.", variant: "destructive" });
      return;
    }
    if (f.size > maxSize) {
      toast({ title: "Ukuran terlalu besar", description: "Maksimal 25MB per file.", variant: "destructive" });
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
        setLastScanUrl(reader.result);
      };
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
      setLastScanUrl(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleScanComplete = (scannedFile, pageImages) => {
    handleFile(scannedFile);
    if (pageImages?.length > 0) {
      setScanPageImages(pageImages);
      setLastScanUrl(pageImages[0]);
    }
    setShowCameraScan(false);

    if (scanForOCR) {
      setShowOCRModal(true);
    }
    setScanForOCR(false);
  };

  const handleOCRConfirm = ({ mode, documentType, fields }) => {
    setShowOCRModal(false);
    setShouldAutoConfirmOCR(false);
    if (mode === "manual") return;

    // Masuk Mode OCR: metadata reguler (Data Detail) disembunyikan, digantikan
    // section "Data Hasil OCR" yang otomatis terisi dari hasil scan namun
    // tetap bisa diedit sebelum submit.
    setOcrDataMode(true);
    setOcrDocType(documentType || null);

    if (fields && Object.keys(fields).length > 0) {
      setMetaData((prev) => ({ ...prev, ...fields }));
      if (fields.judul && !form.judul) update("judul", fields.judul);
      toast({
        title: "✓ Form Diisi Otomatis",
        description: `${Object.keys(fields).length} field berhasil diisi dari OCR${
          DOCUMENT_TYPE_LABELS[documentType] ? ` (${DOCUMENT_TYPE_LABELS[documentType]})` : ""
        }. Anda tetap bisa mengedit sebelum menyimpan.`,
      });
    } else {
      toast({
        title: "OCR selesai",
        description: "Tidak ada field yang terdeteksi. Silakan isi field OCR secara manual.",
      });
    }
  };

  // ── Keluar dari Mode OCR (kembali ke metadata reguler) ─────────────────
  const exitOcrDataMode = () => {
    setOcrDataMode(false);
    setOcrDocType(null);
  };

  // ── "Lainnya" save handlers ────────────────────────────────────────────
  const saveKategoriLainnya = async () => {
    const name = kategoriLainnyaText.trim();
    if (!name) return;
    try {
      const res = await api.post("/categories/custom", { category_name: name });
      const newCat = res.data?.category || { category_id: Date.now(), category_name: name };
      setCategoryList((prev) => [...prev, newCat]);
      const newId = newCat.category_id;
      setSelectedCategoryId(newId);
      setKategoriValue(String(newId));
      update("kategori", name);
      update("jenisDokumen", "");
      setSelectedTypeId(null);
      setJenisValue("");
      if (!ocrDataMode) setMetaData({});
      setShowKategoriLainnya(false);
      setKategoriLainnyaText("");
      toast({ title: "Kategori baru ditambahkan", description: `"${name}" berhasil disimpan ke database.` });
    } catch {
      const newCat = { category_id: -(Date.now()), category_name: name };
      setCategoryList((prev) => [...prev, newCat]);
      setSelectedCategoryId(newCat.category_id);
      setKategoriValue(String(newCat.category_id));
      update("kategori", name);
      update("jenisDokumen", "");
      setSelectedTypeId(null);
      setJenisValue("");
      if (!ocrDataMode) setMetaData({});
      setShowKategoriLainnya(false);
      setKategoriLainnyaText("");
      toast({ title: "Kategori ditambahkan (lokal)", description: `"${name}" ditambahkan. Sinkronisasi ke server akan dilakukan saat upload.` });
    }
  };

  const saveJenisLainnya = async () => {
    const name = jenisLainnyaText.trim();
    if (!name || !selectedCategoryId) return;
    try {
      const res = await api.post("/categories/custom-type", { type_name: name, category_id: selectedCategoryId });
      const newType = res.data?.type || { type_id: Date.now(), category_id: selectedCategoryId, type_name: name, code_prefix: "LNR" };
      setTypeList((prev) => [...prev, newType]);
      setSelectedTypeId(newType.type_id);
      setJenisValue(String(newType.type_id));
      update("jenisDokumen", name);
      if (!ocrDataMode) setMetaData({});
      setShowJenisLainnya(false);
      setJenisLainnyaText("");
      toast({ title: "Jenis dokumen baru ditambahkan", description: `"${name}" berhasil disimpan ke database.` });
    } catch {
      const newType = { type_id: -(Date.now()), category_id: selectedCategoryId, type_name: name, code_prefix: "LNR" };
      setTypeList((prev) => [...prev, newType]);
      setSelectedTypeId(newType.type_id);
      setJenisValue(String(newType.type_id));
      update("jenisDokumen", name);
      if (!ocrDataMode) setMetaData({});
      setShowJenisLainnya(false);
      setJenisLainnyaText("");
      toast({ title: "Jenis dokumen ditambahkan (lokal)", description: `"${name}" ditambahkan.` });
    }
  };

  // ── Submit / Confirm ───────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.judul) { toast({ variant: "destructive", title: "Nama dokumen wajib diisi" }); return; }
    if (!selectedCategoryId) { toast({ variant: "destructive", title: "Pilih kategori dokumen terlebih dahulu" }); return; }
    if (!selectedTypeId) { toast({ variant: "destructive", title: "Pilih jenis dokumen terlebih dahulu" }); return; }
    if (!file) { toast({ variant: "destructive", title: "File wajib dipilih", description: "Pilih file dokumen sebelum melanjutkan." }); return; }
    setShowConfirm(true);
  };

  const confirmUpload = async () => {
    if (!file) { toast({ variant: "destructive", title: "File wajib dipilih" }); setShowConfirm(false); return; }

    const folderId = getFolderIdForDocument(selectedCategoryId, selectedTypeId);
    const metadata = {};

    if (fillMode === MODE_LENGKAP) {
      if (selectedCategoryId === 1) {
        Object.assign(metadata, {
          namaSiswa: metaData.namaSiswa || "", nis: metaData.nis || "", nisn: metaData.nisn || "",
          kelas: metaData.kelas || "", tahunAjaran: metaData.tahunAjaran || "",
          tempatLahir: metaData.tempatLahir || "", tanggalLahir: metaData.tanggalLahir || "",
          jenisKelamin: metaData.jenisKelamin || "", namaOrangTua: metaData.namaOrangTua || "",
          noHpOrangTua: metaData.noHpOrangTua || "",
        });
      } else if (selectedCategoryId === 2) {
        Object.assign(metadata, {
          namaGuru: metaData.namaGuru || metaData.nama || "", nip: metaData.restrictedNip || metaData.nip || "",
          nuptk: metaData.nuptk || "", mataPelajaran: metaData.mataPelajaran || "",
          pendidikanTerakhir: metaData.pendidikanTerakhir || "", statusKepegawaian: metaData.statusKepegawaian || "",
        });
      } else if (selectedCategoryId === 3) {
        Object.assign(metadata, {
          kodeBarang: metaData.kodeBarang || "", namaBarang: metaData.namaBarang || "",
          jumlah: metaData.jumlah || "", tahunPengadaan: metaData.tahunPengadaan || "",
          kondisi: metaData.kondisi || "", lokasi: metaData.lokasi || "",
        });
      } else if (selectedCategoryId === 4) {
        if (selectedTypeId === 10) {
          Object.assign(metadata, { nomorAgenda: metaData.nomorAgenda || "", nomorSurat: metaData.nomorSurat || "", tanggalSurat: metaData.tanggalSurat || "", tanggalDiterima: metaData.tanggalDiterima || "", pengirim: metaData.pengirim || "", perihal: metaData.perihal || "" });
        } else if (selectedTypeId === 11) {
          Object.assign(metadata, { nomorAgenda: metaData.nomorAgenda || "", nomorSurat: metaData.nomorSurat || "", tanggalSurat: metaData.tanggalSurat || "", tujuan: metaData.tujuan || "", perihal: metaData.perihal || "", penandatangan: metaData.penandatangan || "" });
        } else if (selectedTypeId === 12) {
          Object.assign(metadata, { nomorSK: metaData.nomorSK || "", tanggalSK: metaData.tanggalSK || "", tentang: metaData.tentang || "", penandatangan: metaData.penandatangan || "" });
        }
      }

      // Mode OCR: sertakan seluruh field hasil OCR (termasuk yang tidak ada
      // di template kategori reguler, mis. nomorPeserta/namaSekolah untuk
      // ijazah) ke payload metadata. Tidak menghapus/menimpa metadata reguler
      // di atas — hanya menambahkan.
      if (ocrDataMode && ocrFieldOrder.length > 0) {
        ocrFieldOrder.forEach((key) => {
          if (metaData[key]) metadata[key] = metaData[key];
        });
        metadata.ocrDocumentType = ocrDocType;
      }
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("judul", form.judul);
    formData.append("category_id", selectedCategoryId);
    formData.append("type_id", selectedTypeId);
    formData.append("fill_mode", fillMode);
    if (folderId) formData.append("folder_id", folderId);
    if (metaData.tahunAjaran) formData.append("tahun_ajaran", metaData.tahunAjaran);
    formData.append("metadata", JSON.stringify(metadata));

    setShowConfirm(false);
    setUploadProgress(0);
    const result = await uploadDocument(formData, (pct) => setUploadProgress(pct));
    setUploadProgress(null);

    if (!result.ok) {
      toast({ variant: "destructive", title: "❌ Gagal Mengunggah", description: result.error || "Terjadi kesalahan saat upload." });
      return;
    }

    // Upload sukses — hapus draft
    clearDraft();

    toast({
      title: "✓ Dokumen Berhasil Diunggah",
      description: (
        <div className="flex flex-col gap-2">
          <span>Dokumen masuk antrian persetujuan.</span>
          <button onClick={() => navigate("/archive")} className="text-xs text-primary font-semibold hover:underline text-left">→ Lihat di Arsip Dokumen</button>
        </div>
      ),
    });

    setTimeout(() => {
      setFile(null); setFilePreview(null); setScanPageImages([]); setMetaData({});
      setOcrDataMode(false); setOcrDocType(null);
      setForm({ nomorDokumen: "", judul: "", jenisDokumen: "", kategori: "", versi: "v1", tanggalUpload: new Date() });
      setSelectedCategoryId(null); setSelectedTypeId(null);
      setKategoriValue(""); setJenisValue("");
      setShowKategoriLainnya(false); setShowJenisLainnya(false);
      onSuccess?.();
    }, 1000);
  };

  // ── Dynamic field renderer ─────────────────────────────────────────────
  const renderField = (field) => {
    if (field.type === "tahun_ajaran") {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
          <select value={metaData[field.key] || "2024/2025"} onChange={(e) => updateMeta(field.key, e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {TAHUN_AJARAN_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            <option value="Lainnya">Lainnya</option>
          </select>
          {metaData[field.key] === "Lainnya" && (
            <input value={metaData[`${field.key}_custom`] || ""} onChange={(e) => updateMeta(`${field.key}_custom`, e.target.value)} placeholder="Contoh: 2026/2027" className="w-full mt-2 px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          )}
        </div>
      );
    }
    if (field.type === "select" && field.options) {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-foreground mb-1">{field.label}{field.required ? " *" : ""}</label>
          <select value={metaData[field.key] || ""} onChange={(e) => updateMeta(field.key, e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Pilih {field.label.toLowerCase()}</option>
            {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }
    if (field.type === "date") {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-foreground mb-1">{field.label}{field.required ? " *" : ""}</label>
          <input type="date" value={metaData[field.key] || ""} onChange={(e) => updateMeta(field.key, e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      );
    }
    if (field.type === "number") {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-foreground mb-1">{field.label}{field.required ? " *" : ""}</label>
          <input type="number" value={metaData[field.key] || ""} onChange={(e) => updateMeta(field.key, e.target.value)} placeholder={field.placeholder} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="block text-sm font-medium text-foreground mb-1">{field.label}{field.required ? " *" : ""}</label>
        <input value={metaData[field.key] || ""} onChange={(e) => updateMeta(field.key, e.target.value)} placeholder={field.placeholder} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
    );
  };

  const getCategorySectionTitle = () => {
    if (selectedCategoryId === 1) return "Data Siswa";
    if (selectedCategoryId === 2) return "Data Guru";
    if (selectedCategoryId === 3) return "Data Inventaris";
    if (selectedCategoryId === 4) return `Data ${typeList.find((t) => t.type_id === selectedTypeId)?.type_name || "Surat"}`;
    return "Data Tambahan";
  };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Draft Restore Banner ───────────────────────────────────────── */}
      {pendingDraft && (
        <DraftBanner
          draftDate={pendingDraft.savedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {/* ── Draft Restored Info ────────────────────────────────────────── */}
      {draftRestored && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 animate-fade-in">
          <FileCheck size={15} className="text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300 font-medium flex-1">
            Draft dipulihkan. Pilih file dokumen kembali untuk melanjutkan upload.
          </p>
          <button type="button" onClick={() => setDraftRestored(false)} className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Mode Selector ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pilih Mode Pengisian</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih cara pengisian data sesuai jenis dokumen yang akan diupload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCaraGuide((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <Info size={13} />
            Cara Mengisi Setiap Mode
            <ChevronDown size={13} className={`transition-transform ${showCaraGuide ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Isi Data Lengkap */}
          <button
            type="button"
            onClick={() => setFillMode(MODE_LENGKAP)}
            className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              fillMode === MODE_LENGKAP
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`mt-0.5 p-2 rounded-lg ${fillMode === MODE_LENGKAP ? "bg-primary/10" : "bg-muted"}`}>
              <FileText size={16} className={fillMode === MODE_LENGKAP ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${fillMode === MODE_LENGKAP ? "text-primary" : "text-foreground"}`}>Isi Data Lengkap</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Untuk dokumen yang memiliki informasi spesifik dan perlu dicatat detail.</p>
            </div>
            {fillMode === MODE_LENGKAP && (
              <CheckCircle size={18} className="text-primary absolute top-3 right-3 shrink-0" />
            )}
          </button>

          {/* Hanya Judul */}
          <button
            type="button"
            onClick={() => setFillMode(MODE_JUDUL)}
            className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              fillMode === MODE_JUDUL
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`mt-0.5 p-2 rounded-lg ${fillMode === MODE_JUDUL ? "bg-primary/10" : "bg-muted"}`}>
              <FileText size={16} className={fillMode === MODE_JUDUL ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${fillMode === MODE_JUDUL ? "text-primary" : "text-foreground"}`}>Hanya Judul</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Untuk dokumen tebal atau berisi banyak halaman yang tidak perlu diisi satu per satu.</p>
            </div>
            {fillMode === MODE_JUDUL && (
              <CheckCircle size={18} className="text-primary absolute top-3 right-3 shrink-0" />
            )}
          </button>
        </div>

        {/* Guide — full width below mode selector */}
        {showCaraGuide && (
          <CaraMengisiGuide mode={fillMode} onClose={() => setShowCaraGuide(false)} />
        )}
      </div>

      {/* ── Main Form ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Urgent */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Tandai sebagai Urgent</span>
              <button type="button" onClick={() => setIsUrgent(!isUrgent)} className={`relative w-11 h-6 rounded-full transition-colors ${isUrgent ? "bg-sakura-warning" : "bg-input"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${isUrgent ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {isUrgent && (
              <div className="flex items-start gap-2.5 mt-3 p-3 rounded-lg bg-sakura-warning/10 border border-sakura-warning/30">
                <AlertTriangle size={16} className="text-sakura-warning shrink-0 mt-0.5" />
                <p className="text-[13px] text-sakura-warning">Dokumen ini akan ditandai URGENT dan mendapat prioritas review lebih cepat.</p>
              </div>
            )}
          </div>

          {/* Sensitif */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Dokumen Sensitif (hanya bisa dilihat pemilik)</span>
              <button type="button" onClick={() => setIsSensitif(!isSensitif)} className={`relative w-11 h-6 rounded-full transition-colors ${isSensitif ? "bg-primary" : "bg-input"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${isSensitif ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {isSensitif && (
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/[0.06] border border-primary/20">
                  <Lock size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-[13px] text-primary">Dokumen ini hanya dapat diakses oleh pemilik berdasarkan NIP.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">NIP Pemilik Dokumen *</label>
                  {ownerNIPs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ownerNIPs.map((nip) => {
                        const user = nipUsers.find((u) => u.nip === nip);
                        return (
                          <span key={nip} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {user ? `${user.nama} — ${nip}` : nip}
                            {!guruUploadOwn && <button type="button" onClick={() => removeNip(nip)} className="hover:text-destructive"><X size={12} /></button>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {!guruUploadOwn && (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={nipSearch} onChange={(e) => { setNipSearch(e.target.value); setNipDropdownOpen(true); }} onFocus={() => setNipDropdownOpen(true)} placeholder="Cari nama atau NIP..." className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      {nipDropdownOpen && filteredNipUsers.length > 0 && (
                        <div className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {filteredNipUsers.map((u) => (
                            <button key={u.nip} type="button" onClick={() => addNip(u.nip)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <span className="font-medium text-foreground">{u.nama}</span>
                              <span className="text-muted-foreground"> — {u.nip}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upload File */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            {/* Header dengan tombol Reset */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Upload size={18} className="text-primary" /> Upload File Dokumen
              </h3>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/[0.04] transition-all"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors ${isDragOver ? "border-primary bg-secondary/50" : "border-input hover:border-primary/50"}`}
            >
              <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-foreground">Seret file ke sini atau <span className="text-primary font-semibold">klik untuk memilih</span></p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (maks. 25MB)</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <button
              type="button"
              onClick={() => { setShouldAutoConfirmOCR(false); setScanForOCR(false); setShowCameraScan(true); }}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors"
            >
              <Camera size={18} /> Scan Dokumen
            </button>
            {fillMode === MODE_LENGKAP && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (lastScanUrl || scanPageImages.length > 0) {
                      setShouldAutoConfirmOCR(false);
                      setShowOCRModal(true);
                    } else {
                      setShouldAutoConfirmOCR(true);
                      setScanForOCR(true);
                      setShowCameraScan(true);
                    }
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-primary/40 bg-primary/[0.04] text-primary hover:bg-primary/10 transition-colors"
                >
                  <Wand2 size={16} /> {lastScanUrl || scanPageImages.length > 0 ? "Isi Form dengan OCR" : "Scan OCR"}
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  OCR mendukung: Ijazah SMP, SKL/SKHU, Sertifikat, atau Transkrip/Rekap Nilai — tidak perlu memilih kategori/jenis dokumen dulu.
                </p>
              </>
            )}

            {/* File info — from actual file or restored draft */}
            {(file || (draftRestored && !file && (filePreview || scanPageImages.length > 0))) && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <FileText size={20} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  {file ? (
                    <>
                      <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-foreground truncate">
                        {pendingDraft?.fileName ?? "File dari draft"}
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ⚠ Pilih file kembali untuk upload
                      </div>
                    </>
                  )}
                </div>
                {file && (
                  <button type="button" onClick={() => { setFile(null); setFilePreview(null); setScanPageImages([]); }} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
                )}
              </div>
            )}
          </div>

          {/* Preview Dokumen */}
          {(file || filePreview || scanPageImages.length > 0) && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Eye size={18} className="text-primary" /> Preview Dokumen</h3>
                {file && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Halaman: 1 dari {scanPageImages.length || 1}</span>}
              </div>
              {scanPageImages.length > 0 ? (
                <div className="space-y-3">
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                    {scanPageImages.map((imgSrc, i) => (
                      <div key={i} className="relative border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
                          <span className="text-xs text-muted-foreground font-medium">Halaman {i + 1} dari {scanPageImages.length}</span>
                          <button type="button" onClick={() => rotatePage(i)} className="p-1 rounded hover:bg-muted" title="Putar 90°"><RotateCw size={13} className="text-muted-foreground" /></button>
                        </div>
                        <div className="p-3"><img src={imgSrc} alt={`Halaman ${i + 1}`} className="w-full h-auto object-contain rounded" /></div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setFullPreviewPage(0); setShowFullPreview(true); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">
                    <Maximize size={14} /> Lihat Layar Penuh
                  </button>
                </div>
              ) : filePreview ? (
                <div className="relative group">
                  <img src={filePreview} alt="Preview" className="w-full rounded-lg max-h-64 object-contain bg-muted/30" />
                  <button type="button" onClick={() => setShowFullPreview(true)} className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/40 transition-colors rounded-lg">
                    <span className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-4 py-2 rounded-lg bg-card/90 text-foreground text-sm font-medium shadow-lg">
                      <Maximize size={16} /> Lihat Layar Penuh
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <FileText size={48} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{file?.name}</p>
                  <button type="button" onClick={() => setShowPdfPreview(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Pratinjau PDF</button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                <Info size={12} /> Preview mungkin tidak menampilkan seluruh halaman. Pastikan file sudah benar sebelum upload.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Informasi Dokumen */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              Informasi Dokumen {fillMode === MODE_JUDUL ? "(Hanya Judul)" : ""}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Nomor Dokumen (generated otomatis, readonly) ── */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nomor Dokumen *
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={
                      nomorLoading
                        ? "Menghitung…"
                        : nomorPreview || (selectedCategoryId && selectedTypeId ? "" : "Pilih kategori & jenis dulu")
                    }
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-muted text-sm text-muted-foreground cursor-not-allowed font-mono"
                    placeholder="Akan terisi otomatis setelah memilih kategori & jenis"
                  />
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nomor dokumen dibuat otomatis oleh sistem.
                </p>
              </div>

              {/* Judul Dokumen */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Judul Dokumen *</label>
                <input required value={form.judul} onChange={(e) => update("judul", e.target.value)} placeholder="Contoh: Buku Absensi Kelas 7A Tahun 2025" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Tanggal Upload */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Tanggal Upload *</label>
                <div className="relative">
                  <input readOnly value={format(form.tanggalUpload, "dd/MM/yyyy")} onClick={() => setShowDatePicker(!showDatePicker)} className="w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><CalendarIcon size={16} /></button>
                  {showDatePicker && (
                    <div className="absolute z-50 top-full mt-1 right-0 bg-card border border-border rounded-xl shadow-lg">
                      <Calendar mode="single" selected={form.tanggalUpload} onSelect={(d) => { if (d) { update("tanggalUpload", d); setShowDatePicker(false); } }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Kategori Dokumen */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Kategori Dokumen *</label>
                <select
                  required
                  value={kategoriValue}
                  disabled={guruUploadOwn}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "lainnya") {
                      setKategoriValue("lainnya");
                      setShowKategoriLainnya(true);
                      return;
                    }
                    const catId = Number(val);
                    const cat = categoryList.find((c) => c.category_id === catId);
                    setKategoriValue(val);
                    setSelectedCategoryId(catId || null);
                    setSelectedTypeId(null);
                    setJenisValue("");
                    // Saat Mode OCR aktif, metadata hasil OCR tidak dihapus
                    // hanya karena kategori/jenis dokumen diganti.
                    if (!ocrDataMode) setMetaData({});
                    update("kategori", cat?.category_name || "");
                    update("jenisDokumen", "");
                    setShowKategoriLainnya(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                >
                  <option value="">Pilih kategori</option>
                  {(guruUploadOwn ? categoryList.filter((c) => c.category_id === 5) : categoryList)
                    .map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                  {/* Guru tidak boleh membuat kategori baru di luar Administrasi */}
                  {!guruUploadOwn && <option value="lainnya">+ Lainnya (tambah baru)</option>}
                </select>
                {showKategoriLainnya && (
                  <LainnyaInput
                    value={kategoriLainnyaText}
                    onChange={setKategoriLainnyaText}
                    onSave={saveKategoriLainnya}
                    placeholder="Nama kategori baru..."
                  />
                )}
              </div>

              {/* Versi */}
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Versi</label>
                <input value={form.versi} onChange={(e) => update("versi", e.target.value)} placeholder="v1" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Jenis Dokumen */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Jenis Dokumen *</label>
                <select
                  required
                  value={jenisValue}
                  disabled={!selectedCategoryId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "lainnya") {
                      setJenisValue("lainnya");
                      setShowJenisLainnya(true);
                      return;
                    }
                    const typeId = Number(val);
                    const docType = typeList.find((t) => t.type_id === typeId);
                    setJenisValue(val);
                    setSelectedTypeId(typeId || null);
                    // Saat Mode OCR aktif, metadata hasil OCR tidak dihapus
                    // hanya karena kategori/jenis dokumen diganti.
                    if (!ocrDataMode) setMetaData({});
                    update("jenisDokumen", docType?.type_name || "");
                    setShowJenisLainnya(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                >
                  <option value="">{selectedCategoryId ? "Pilih jenis dokumen" : "Pilih kategori dulu"}</option>
                  {jenisOptions.map((t) => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
                  {selectedCategoryId && <option value="lainnya">+ Lainnya (tambah baru)</option>}
                </select>
                {showJenisLainnya && (
                  <LainnyaInput
                    value={jenisLainnyaText}
                    onChange={setJenisLainnyaText}
                    onSave={saveJenisLainnya}
                    placeholder="Nama jenis dokumen baru..."
                  />
                )}
              </div>

              {/* Folder Penyimpanan */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Folder Penyimpanan *</label>
                <input readOnly value={autoFolderDisplay || (hasSelection ? "Menentukan..." : "")} placeholder="Otomatis ditentukan setelah kategori & jenis dipilih" className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/50 text-sm text-muted-foreground cursor-not-allowed" />
              </div>
            </div>

            {fillMode === MODE_JUDUL && (
              <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Pada mode <strong>"Hanya Judul"</strong>, hanya informasi dasar dokumen yang disimpan. Tidak ada data detail tambahan yang diisi.
                </p>
              </div>
            )}
          </div>

          {/* Data Detail — reguler, disembunyikan saat Mode OCR aktif */}
          {fillMode === MODE_LENGKAP && !ocrDataMode && hasSelection && dynamicFields.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Data Detail ({getCategorySectionTitle()})
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Isi data detail sesuai dokumen ini. Pilih atau tambahkan data yang termasuk dalam dokumen ini.</p>
              <div className="space-y-4">
                {dynamicFields.map((field) => renderField(field))}
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Data detail akan disimpan sebagai metadata dokumen dan dapat dilihat saat preview.</p>
              </div>
            </div>
          )}

          {/* Data Hasil OCR — muncul menggantikan Data Detail saat Mode OCR aktif */}
          {fillMode === MODE_LENGKAP && ocrDataMode && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Wand2 size={18} className="text-primary" />
                  Data Hasil OCR{DOCUMENT_TYPE_LABELS[ocrDocType] ? ` — ${DOCUMENT_TYPE_LABELS[ocrDocType]}` : ""}
                </h3>
                <button
                  type="button"
                  onClick={exitOcrDataMode}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Kembali ke Mode Reguler
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Field di bawah otomatis terisi dari hasil scan OCR. Periksa dan koreksi bila perlu sebelum menyimpan.
              </p>
              {ocrFieldOrder.length > 0 ? (
                <div className="space-y-4">
                  {ocrFieldOrder.map((key) =>
                    renderField({
                      key,
                      label: OCR_FIELD_LABELS[key] || key,
                      placeholder: `Masukkan ${OCR_FIELD_LABELS[key] || key}...`,
                    })
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada field OCR untuk jenis dokumen ini.</p>
              )}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Data hasil OCR akan disimpan sebagai metadata dokumen, terpisah dari metadata reguler.</p>
              </div>
            </div>
          )}

          {/* Restricted access */}
          {fillMode === MODE_LENGKAP && hasSelection && (selectedCategoryId === 2 || selectedTypeId === 12) && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                <Lock size={18} className="text-destructive" /> Akses Terbatas (Dokumen Sensitif)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Dokumen ini hanya dapat diakses oleh Admin dan guru terkait berdasarkan NIP.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nama Guru Terkait</label>
                  <input value={metaData.restrictedTeacherName || ""} onChange={(e) => updateMeta("restrictedTeacherName", e.target.value)} placeholder="Nama guru pemilik dokumen" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">NIP Guru Terkait</label>
                  <input value={metaData.restrictedNip || ""} onChange={(e) => updateMeta("restrictedNip", e.target.value)} placeholder="Nomor Induk Pegawai guru" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary animate-pulse" />
                  {uploadProgress < 100 ? "Mengunggah ke Firebase Storage..." : "Menyimpan ke database..."}
                </span>
                <span className="font-bold text-primary">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              {uploadProgress < 100 && <p className="text-xs text-muted-foreground">Jangan tutup halaman ini saat upload sedang berlangsung.</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {onCancel && (
              <button type="button" onClick={onCancel} disabled={uploadProgress !== null} className="flex-1 py-3 rounded-lg border border-input text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50">Batal</button>
            )}
            <button
              type="submit"
              disabled={uploadProgress !== null}
              className={`${onCancel ? "flex-1" : "w-full"} flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50`}
            >
              <Upload size={18} /> {uploadProgress !== null ? "Mengunggah..." : "Upload Dokumen"}
            </button>
          </div>
        </div>
      </form>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg mb-2">Konfirmasi Upload</h3>
            <p className="text-sm text-muted-foreground mb-4">Apakah Anda yakin semua data dokumen sudah benar? Dokumen akan masuk antrian persetujuan setelah diunggah.</p>
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1 mb-4">
              <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium text-foreground">{fillMode === MODE_JUDUL ? "Hanya Judul" : "Isi Data Lengkap"}</span></div>
              <div><span className="text-muted-foreground">Judul:</span> <span className="font-medium text-foreground">{form.judul}</span></div>
              <div><span className="text-muted-foreground">Kategori:</span> <span className="font-medium text-foreground">{form.kategori}</span></div>
              <div><span className="text-muted-foreground">Jenis:</span> <span className="font-medium text-foreground">{form.jenisDokumen}</span></div>
              <div><span className="text-muted-foreground">Folder:</span> <span className="font-medium text-foreground">{autoFolderDisplay}</span></div>
              {file && <div><span className="text-muted-foreground">File:</span> <span className="font-medium text-foreground">{file.name}</span></div>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Periksa Lagi</button>
              <button onClick={confirmUpload} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Ya, Upload Sekarang</button>
            </div>
          </div>
        </div>
      )}

      {/* Full preview overlay */}
      {showFullPreview && (filePreview || scanPageImages.length > 0) && (
        <div className="fixed inset-0 z-[100] bg-foreground/90 flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
            <span className="font-semibold text-sm text-foreground truncate max-w-md">{file?.name}</span>
            <div className="flex items-center gap-2">
              {scanPageImages.length > 1 && (
                <>
                  <button type="button" disabled={fullPreviewPage <= 0} onClick={() => setFullPreviewPage((p) => p - 1)} className="p-2 rounded hover:bg-muted disabled:opacity-30"><ChevronLeft size={18} /></button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Halaman {fullPreviewPage + 1} / {scanPageImages.length}</span>
                  <button type="button" disabled={fullPreviewPage >= scanPageImages.length - 1} onClick={() => setFullPreviewPage((p) => p + 1)} className="p-2 rounded hover:bg-muted disabled:opacity-30"><ChevronRight size={18} /></button>
                  <div className="w-px h-6 bg-border mx-1" />
                </>
              )}
              {scanPageImages.length > 0 && (
                <>
                  <button type="button" onClick={() => rotatePage(fullPreviewPage)} className="p-2 rounded hover:bg-muted" title="Putar 90°"><RotateCw size={18} /></button>
                  <div className="w-px h-6 bg-border mx-1" />
                </>
              )}
              <button type="button" onClick={() => setFullPreviewZoom((z) => Math.max(25, z - 25))} className="p-2 rounded hover:bg-muted"><ZoomOut size={18} /></button>
              <span className="text-sm text-muted-foreground w-12 text-center">{fullPreviewZoom}%</span>
              <button type="button" onClick={() => setFullPreviewZoom((z) => Math.min(300, z + 25))} className="p-2 rounded hover:bg-muted"><ZoomIn size={18} /></button>
              <button type="button" onClick={() => setFullPreviewZoom(100)} className="p-2 rounded hover:bg-muted text-xs font-medium">Reset</button>
              <div className="w-px h-6 bg-border mx-1" />
              <button type="button" onClick={() => { setShowFullPreview(false); setFullPreviewZoom(100); }} className="p-2 rounded hover:bg-destructive/10 text-destructive"><X size={20} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-8" onClick={() => { setShowFullPreview(false); setFullPreviewZoom(100); }}>
            {scanPageImages.length > 0 ? (
              <div className="bg-background rounded-lg shadow-2xl overflow-hidden border border-border max-w-4xl w-full" style={{ transform: `scale(${fullPreviewZoom / 100})`, transformOrigin: "top center" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
                  <FileText size={12} className="text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Halaman {fullPreviewPage + 1} dari {scanPageImages.length}</span>
                </div>
                <div className="p-4"><img src={scanPageImages[fullPreviewPage]} alt={`Halaman ${fullPreviewPage + 1}`} className="w-full max-h-[80vh] object-contain" /></div>
              </div>
            ) : (
              <img src={filePreview} alt="Full preview" className="rounded-lg shadow-2xl transition-transform" style={{ transform: `scale(${fullPreviewZoom / 100})`, maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
            )}
          </div>
        </div>
      )}

      {showPdfPreview && (
        <PdfPreviewOverlay onClose={() => setShowPdfPreview(false)} document={{
          id: 0, nomorDokumen: nomorPreview || "—", judul: form.judul || "Dokumen Baru",
          kategori: form.kategori || "Umum", kelas: metaData.kelas || "-", jenisDokumen: form.jenisDokumen,
          namaSiswa: metaData.namaSiswa || "", nisn: metaData.nisn || "", tahunAjaran: metaData.tahunAjaran || "",
          pengunggah: { id: currentUser.id, nama: currentUser.nama, role: currentUser.role, avatar: currentUser.avatar },
          tanggalUpload: new Date().toISOString(), tanggalEdit: new Date().toISOString(),
          status: "Menunggu", versi: 1, fileUrl: "", auditTrail: [],
        }} />
      )}
      {showCameraScan && <CameraScanModal onClose={() => { setShowCameraScan(false); setScanForOCR(false); setShouldAutoConfirmOCR(false); }} onComplete={handleScanComplete} onScanForOCR={scanForOCR ? (dataUrl) => { setLastScanUrl(dataUrl); setShowOCRModal(true); } : undefined} ocrMode={scanForOCR} />}
      {showOCRModal && (
        <OCRFillModal
          onClose={() => { setShowOCRModal(false); setShouldAutoConfirmOCR(false); }}
          onConfirm={handleOCRConfirm}
          onRetake={() => {
            setShowOCRModal(false);
            setShouldAutoConfirmOCR(true);
            setScanForOCR(true);
            setShowCameraScan(true);
          }}
          scanImageUrl={lastScanUrl || scanPageImages[0] || null}
        />
      )}
    </>
  );
}