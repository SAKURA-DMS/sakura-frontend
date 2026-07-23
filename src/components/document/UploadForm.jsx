import { useState, useRef, useMemo, useCallback } from "react";
import { Upload, Camera, X, Eye, FileText, CalendarIcon, ChevronDown, Maximize, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, AlertTriangle, Lock, Search } from "lucide-react";
import CameraScanModal from "@/components/shared/CameraScan";
import { useApp } from "@/contexts/AppContext";
import PdfPreviewOverlay from "@/components/document/PdfPreview";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, DOCUMENT_TYPES, TAHUN_AJARAN_OPTIONS, CATEGORY_FORM_FIELDS, SURAT_TYPE_FORM_FIELDS, getAutoFolderPath, getFolderIdForDocument } from "@/data/mockData";
import { Calendar } from "@/components/ui/calendar";

export default function UploadForm({ onSuccess, onCancel, selectedModule, guruUploadOwn, lockedNip, lockedTypeId }) {
  const { uploadDocument, currentUser, generateDocumentNumber, users } = useApp();
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [scanPageImages, setScanPageImages] = useState([]); 
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCameraScan, setShowCameraScan] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [fullPreviewZoom, setFullPreviewZoom] = useState(100);
  const [fullPreviewPage, setFullPreviewPage] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const rotatePage = useCallback((pageIndex) => {
    const src = scanPageImages[pageIndex];
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotated = canvas.toDataURL("image/jpeg", 0.92);
      setScanPageImages((prev) => prev.map((p, i) => (i === pageIndex ? rotated : p)));
    };
    img.src = src;
  }, [scanPageImages]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  const [isUrgent, setIsUrgent] = useState(false);
  const [isSensitif, setIsSensitif] = useState(false);
  const [ownerNIPs, setOwnerNIPs] = useState(lockedNip ? [lockedNip] : []);
  const [nipSearch, setNipSearch] = useState("");
  const [nipDropdownOpen, setNipDropdownOpen] = useState(false);
  const nipUsers = useMemo(() => {
    return users.filter((u) => u.nip && u.nip.length > 0);
  }, [users]);

  const filteredNipUsers = useMemo(() => {
    if (!nipSearch) return nipUsers.filter((u) => !ownerNIPs.includes(u.nip));
    const q = nipSearch.toLowerCase();
    return nipUsers.filter((u) => !ownerNIPs.includes(u.nip) && (u.nama.toLowerCase().includes(q) || u.nip.includes(q)));
  }, [nipUsers, nipSearch, ownerNIPs]);

  const addNip = (nip) => {
    setOwnerNIPs((prev) => [...prev, nip]);
    setNipSearch("");
    setNipDropdownOpen(false);
  };

  const removeNip = (nip) => {
    if (guruUploadOwn) return;
    setOwnerNIPs((prev) => prev.filter((n) => n !== nip));
  };

  const [form, setForm] = useState({
    nomorDokumen: "",
    judul: "",
    jenisDokumen: "",
    kategori: "",
    catatan: "",
    tanggalUpload: new Date(),
  });

  const [metaData, setMetaData] = useState({});
  const dynamicFields = useMemo(() => {
    if (!selectedCategoryId || !selectedTypeId) return [];
    if (selectedCategoryId === 4) {
      return SURAT_TYPE_FORM_FIELDS[selectedTypeId] || [];
    }
    return CATEGORY_FORM_FIELDS[selectedCategoryId] || [];
  }, [selectedCategoryId, selectedTypeId]);

  const hasSelection = selectedCategoryId && selectedTypeId;
  const autoFolderDisplay = useMemo(() => {
    if (!selectedCategoryId || !selectedTypeId) return "";
    const tahun = metaData.tahunAjaran || "";
    return getAutoFolderPath(selectedCategoryId, selectedTypeId, tahun);
  }, [selectedCategoryId, selectedTypeId, metaData.tahunAjaran]);

  const handleFile = (f) => {
    const maxSize = 10 * 1024 * 1024;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(f.type)) {
      toast({ title: "Format tidak didukung", description: "Hanya PDF, JPG, PNG yang diizinkan.", variant: "destructive" });
      return;
    }
    if (f.size > maxSize) {
      toast({ title: "Ukuran terlalu besar", description: "Maksimal 10MB per file.", variant: "destructive" });
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.judul || !form.nomorDokumen) return;
    setShowConfirm(true);
  };

  const confirmUpload = () => {
    const folderId = getFolderIdForDocument(selectedCategoryId, selectedTypeId);

    uploadDocument({
      nomorDokumen: form.nomorDokumen,
      judul: form.judul,
      kategori: form.kategori || "-",
      category_id: selectedCategoryId,
      type_id: selectedTypeId,
      folder_id: folderId,
      jenisDokumen: form.jenisDokumen,
      ...metaData,
      kelas: metaData.kelas || "-",
      class_info: metaData.kelas || "-",
      namaSiswa: metaData.namaSiswa || "",
      nisn: metaData.nisn || "",
      tahunAjaran: metaData.tahunAjaran || "",
      nip: metaData.restrictedNip || metaData.nip || "",
      pengunggah: { id: currentUser.id, nama: currentUser.nama, role: currentUser.role, avatar: currentUser.avatar },
      tanggalUpload: form.tanggalUpload.toISOString(),
      fileUrl: filePreview || "/mock/sample.pdf",
      catatan: form.catatan || undefined,
      folderTujuan: autoFolderDisplay || undefined,
      urgent: isUrgent,
      sensitif: isSensitif,
      ownerNIPs: isSensitif ? ownerNIPs : [],
    });

    setShowConfirm(false);
    toast({
      title: "✓ Dokumen Berhasil Diunggah",
      description: (
        <div className="flex flex-col gap-2">
          <span>Dokumen masuk antrian persetujuan.</span>
          <button onClick={() => navigate("/archive")} className="text-xs text-primary font-semibold hover:underline text-left">
            → Lihat di Arsip Dokumen
          </button>
        </div>
      ),
    });

    setTimeout(() => {
      setFile(null);
      setFilePreview(null);
      setScanPageImages([]);
      setMetaData({});
      setForm({ nomorDokumen: "", judul: "", jenisDokumen: "", kategori: "", catatan: "", tanggalUpload: new Date() });
      setSelectedCategoryId(null);
      setSelectedTypeId(null);
      onSuccess?.();
    }, 1000);
  };

  const handleScanComplete = (scannedFile, pageImages) => {
    handleFile(scannedFile);
    if (pageImages && pageImages.length > 0) {
      setScanPageImages(pageImages);
    }
    setShowCameraScan(false);
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const updateMeta = (key, val) => setMetaData((p) => ({ ...p, [key]: val }));
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
    if (selectedCategoryId === 4) {
      const docType = DOCUMENT_TYPES.find((t) => t.type_id === selectedTypeId);
      return `Data ${docType?.type_name || "Surat"}`;
    }
    return "Data Tambahan";
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Urgent toggle */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-centr justify-between">
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

          {/* Sensitive toggle + Multi-select NIP */}
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
                            {!guruUploadOwn && (
                              <button type="button" onClick={() => removeNip(nip)} className="hover:text-destructive">
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {!guruUploadOwn && (
                    <div className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={nipSearch}
                          onChange={(e) => { setNipSearch(e.target.value); setNipDropdownOpen(true); }}
                          onFocus={() => setNipDropdownOpen(true)}
                          placeholder="Cari nama atau NIP..."
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      {nipDropdownOpen && filteredNipUsers.length > 0 && (
                        <div className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {filteredNipUsers.map((u) => (
                            <button
                              key={u.nip}
                              type="button"
                              onClick={() => addNip(u.nip)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
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

          {autoFolderDisplay && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm">
              <span className="text-muted-foreground">Masukkan ke folder: </span>
              <span className="font-semibold text-primary">{autoFolderDisplay}</span>
              <span className="text-muted-foreground"> (auto-mapping)</span>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><FileText size={18} className="text-primary" /> File Dokumen</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors ${isDragOver ? "border-primary bg-secondary/50" : "border-input hover:border-primary/50"}`}
            >
              <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-foreground">Seret file ke sini atau <span className="text-primary font-semibold">klik untuk memilih</span></p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (maks. 10MB)</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <button type="button" onClick={() => setShowCameraScan(true)} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
              <Camera size={18} /> Scan via Kamera
            </button>

            {file && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <FileText size={20} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button type="button" onClick={() => { setFile(null); setFilePreview(null); setScanPageImages([]); }} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
              </div>
            )}
          </div>

          {(file || filePreview || scanPageImages.length > 0) && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Eye size={18} className="text-primary" /> Pratinjau File</h3>
              {scanPageImages.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {scanPageImages.length} halaman hasil pindai
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                    {scanPageImages.map((imgSrc, i) => (
                      <div key={i} className="relative border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
                          <div className="flex items-center gap-2">
                            <FileText size={11} className="text-primary" />
                            <span className="text-xs text-muted-foreground font-medium">
                              Halaman {i + 1} dari {scanPageImages.length}
                            </span>
                          </div>
                          <button type="button" onClick={() => rotatePage(i)} className="p-1 rounded hover:bg-muted transition-colors" title="Putar 90°">
                            <RotateCw size={13} className="text-muted-foreground" />
                          </button>
                        </div>
                        <div className="p-3">
                          <img
                            src={imgSrc}
                            alt={`Halaman ${i + 1}`}
                            className="w-full h-auto object-contain rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setFullPreviewPage(0); setShowFullPreview(true); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
                    <Maximize size={14} /> Lihat Layar Penuh
                  </button>
                </div>
              ) : filePreview ? (
                <div className="relative group">
                  <img src={filePreview} alt="Preview" className="w-full rounded-lg max-h-64 object-contain bg-muted/30" />
                  <button type="button" onClick={() => setShowFullPreview(true)} className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/40 transition-colors rounded-lg">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-4 py-2 rounded-lg bg-card/90 text-foreground text-sm font-medium shadow-lg">
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
            </div>
          )}

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
                    <div className="p-4">
                      <img src={scanPageImages[fullPreviewPage]} alt={`Halaman ${fullPreviewPage + 1}`} className="w-full max-h-[80vh] object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <img src={filePreview} alt="Full preview" className="rounded-lg shadow-2xl transition-transform" style={{ transform: `scale(${fullPreviewZoom / 100})`, maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h3 className="font-bold text-foreground mb-4">Data Dokumen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nomor Dokumen *</label>
                <input required value={form.nomorDokumen} onChange={(e) => update("nomorDokumen", e.target.value)} placeholder="Contoh: 421/SMKN4/SK/2025" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nama Dokumen *</label>
                <input required value={form.judul} onChange={(e) => update("judul", e.target.value)} placeholder="Contoh: Ijazah SMP Ahmad Rizki" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Kategori Dokumen *</label>
                <select required value={selectedCategoryId || ""} onChange={(e) => {
                  const catId = Number(e.target.value);
                  const cat = CATEGORIES.find((c) => c.category_id === catId);
                  setSelectedCategoryId(catId || null);
                  setSelectedTypeId(null);
                  setMetaData({});
                  update("kategori", cat?.category_name || "");
                  update("jenisDokumen", "");
                  update("nomorDokumen", "");
                }} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Pilih kategori</option>
                  {CATEGORIES.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Jenis Dokumen *</label>
                <select required value={selectedTypeId || ""} onChange={(e) => {
                  const typeId = Number(e.target.value);
                  const docType = DOCUMENT_TYPES.find((t) => t.type_id === typeId);
                  setSelectedTypeId(typeId || null);
                  setMetaData({});
                  update("jenisDokumen", docType?.type_name || "");
                }} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={!selectedCategoryId}>
                  <option value="">{selectedCategoryId ? "Pilih jenis dokumen" : "Pilih kategori dulu"}</option>
                  {jenisOptions.map((t) => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
                </select>
              </div>

              {/* Folder auto-mapping */}
              {hasSelection && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Masukkan ke Folder</label>
                  <input readOnly value={autoFolderDisplay || "Menentukan..."} className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/50 text-sm text-muted-foreground cursor-not-allowed" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tanggal Upload</label>
                <div className="relative">
                  <input readOnly value={format(form.tanggalUpload, "dd/MM/yyyy")} onClick={() => setShowDatePicker(!showDatePicker)} className="w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><CalendarIcon size={16} /></button>
                  {showDatePicker && (
                    <div className="absolute z-50 top-full mt-1 right-0 bg-card border border-border rounded-xl shadow-lg">
                      <Calendar mode="single" selected={form.tanggalUpload} onSelect={(d) => { if (d) { setForm((p) => ({ ...p, tanggalUpload: d })); setShowDatePicker(false); } }} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Catatan (opsional)</label>
                <textarea value={form.catatan} onChange={(e) => update("catatan", e.target.value)} placeholder="Catatan tambahan jika ada" rows={3} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
          </div>

          {hasSelection && dynamicFields.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                {getCategorySectionTitle()}
              </h3>
              <div className="space-y-4">
                {dynamicFields.map((field) => renderField(field))}
              </div>
            </div>
          )}

          {hasSelection && (selectedCategoryId === 2 || selectedTypeId === 12) && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                <FileText size={18} className="text-destructive" />
                Akses Terbatas (Dokumen Sensitif)
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

          <div className="flex gap-3">
            {onCancel && (
              <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-lg border border-input text-sm font-semibold hover:bg-muted transition-colors">Batal</button>
            )}
            <button type="submit" className={`${onCancel ? "flex-1" : "w-full"} flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity`}>
              <Upload size={18} /> Upload Dokumen
            </button>
          </div>
        </div>
      </form>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg mb-2">Konfirmasi Upload</h3>
            <p className="text-sm text-muted-foreground mb-4">Apakah Anda yakin semua data dokumen sudah benar? Dokumen akan masuk antrian persetujuan setelah diunggah.</p>
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1 mb-4">
              <div><span className="text-muted-foreground">Nama:</span> <span className="font-medium text-foreground">{form.judul}</span></div>
              <div><span className="text-muted-foreground">Kategori:</span> <span className="font-medium text-foreground">{form.kategori}</span></div>
              <div><span className="text-muted-foreground">Jenis:</span> <span className="font-medium text-foreground">{form.jenisDokumen}</span></div>
              <div><span className="text-muted-foreground">Nomor:</span> <span className="font-medium text-foreground">{form.nomorDokumen}</span></div>
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

      {showPdfPreview && <PdfPreviewOverlay onClose={() => setShowPdfPreview(false)} document={{
        id: 0, nomorDokumen: form.nomorDokumen || "DRAFT", judul: form.judul || "Dokumen Baru",
        kategori: form.kategori || "Umum", kelas: metaData.kelas || "-", jenisDokumen: form.jenisDokumen,
        namaSiswa: metaData.namaSiswa || "", nisn: metaData.nisn || "", tahunAjaran: metaData.tahunAjaran || "",
        pengunggah: { id: currentUser.id, nama: currentUser.nama, role: currentUser.role, avatar: currentUser.avatar },
        tanggalUpload: new Date().toISOString(), tanggalEdit: new Date().toISOString(),
        status: "Menunggu", versi: 1, fileUrl: "", auditTrail: [],
      }} />}
      {showCameraScan && <CameraScanModal onClose={() => setShowCameraScan(false)} onComplete={handleScanComplete} />}
    </>
  );
}