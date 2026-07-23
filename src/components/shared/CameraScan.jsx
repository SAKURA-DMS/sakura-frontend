import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, RotateCcw, Plus, Crop, Download, FileText, Image, Trash2, Check, Pencil, ZoomIn, ZoomOut, Maximize, ChevronUp, ChevronDown, MoreVertical, ArrowUp, ArrowDown } from "lucide-react";
import CropOverlay from "./CropOverlay";

export default function CameraScanModal({ onClose, onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [pages, setPages] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [step, setStep] = useState("camera"); 
  const [cropPageIndex, setCropPageIndex] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activePageMenu, setActivePageMenu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsCameraActive(true);
    } catch {
      alert("Kamera tidak tersedia pada perangkat ini.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsCameraActive(false);
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setPages((p) => [...p, { id: Date.now(), imageData: c.toDataURL("image/jpeg", 0.92) }]);
  };

  // Crop
  const applyCrop = () => {
    const page = pages[cropPageIndex];
    if (!page) return;
    const img = new window.Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      const sx = (cropArea.x / 100) * img.width;
      const sy = (cropArea.y / 100) * img.height;
      const sw = (cropArea.w / 100) * img.width;
      const sh = (cropArea.h / 100) * img.height;
      cv.width = sw; cv.height = sh;
      cv.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const cropped = cv.toDataURL("image/jpeg", 0.92);
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, cropped } : p)));
      setStep("review");
    };
    img.src = page.imageData;
  };

  // Page management
  const confirmDelete = (index) => setDeleteConfirm(index);
  const executeDelete = (index) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) { setStep("camera"); startCamera(); }
      return next;
    });
    setDeleteConfirm(null);
    setActivePageMenu(null);
  };

  const movePage = (index, dir) => {
    setPages((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
    setActivePageMenu(null);
  };

  const openCrop = (index) => {
    setCropPageIndex(index);
    setCropArea({ x: 10, y: 10, w: 80, h: 80 });
    setStep("crop");
    setActivePageMenu(null);
  };

  // Convert
  const handleConvert = async () => {
    if (pages.length === 0) return;
    const pageImages = pages.map((p) => p.cropped || p.imageData);
    const ext = outputFormat === "pdf" ? "pdf" : outputFormat;
    const mimeType = outputFormat === "png" ? "image/png" : outputFormat === "jpg" ? "image/jpeg" : "application/pdf";

    if (outputFormat === "pdf" || pages.length > 1) {
      const imgs = await Promise.all(pageImages.map((src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      })));
      const totalWidth = Math.max(...imgs.map((im) => im.width));
      const totalHeight = imgs.reduce((sum, im) => sum + Math.round(im.height * (totalWidth / im.width)), 0);
      const canvas = document.createElement("canvas");
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext("2d");
      let yOffset = 0;
      for (const im of imgs) {
        const scaledH = Math.round(im.height * (totalWidth / im.width));
        ctx.drawImage(im, 0, yOffset, totalWidth, scaledH);
        yOffset += scaledH;
      }
      canvas.toBlob((blob) => {
        const file = new File([blob], `scan-${Date.now()}.${ext}`, { type: mimeType });
        onComplete(file, pageImages);
      }, outputFormat === "png" ? "image/png" : "image/jpeg", 0.92);
    } else {
      const data = pageImages[0];
      const byteString = atob(data.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeType });
      const file = new File([blob], `scan-${Date.now()}.${ext}`, { type: mimeType });
      onComplete(file, pageImages);
    }
  };

  // Zoom
  const zoomIn = () => setZoomLevel((z) => Math.min(z + 25, 300));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 25, 50));
  const fitWidth = () => setZoomLevel(100);

  // CAMERA STEP
  const renderCamera = () => (
    <>
      <div className="relative bg-muted/20 rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {isCameraActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Memulai kamera...</p>
          </div>
        )}
        <div className="absolute inset-4 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex items-center justify-center py-3">
        <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg">
          <Camera size={24} />
        </button>
      </div>
      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{pages.length} halaman dipindai</span>
            <button onClick={() => { stopCamera(); setStep("review"); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Check size={14} /> Selesai Pindai
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pages.map((page, i) => (
              <div key={page.id} className="relative shrink-0">
                <img src={page.cropped || page.imageData} alt={`Halaman ${i + 1}`} className="w-20 h-28 object-cover rounded-lg border border-border" />
                <span className="absolute bottom-1 left-1 text-xs bg-foreground/70 text-background px-1.5 py-0.5 rounded font-medium">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // CROP STEP
  const renderCrop = () => {
    const page = pages[cropPageIndex];
    if (!page) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Crop size={14} className="text-primary" />
          <span>Seret kotak atau sudut untuk memilih area potong — Halaman {cropPageIndex + 1}</span>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-muted/10">
          <CropOverlay imageUrl={page.imageData} cropArea={cropArea} onChange={setCropArea} />
        </div>

        {/* Manual slider controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/20 border border-border">
          {[
            { key: "x", label: "X (Posisi)" },
            { key: "y", label: "Y (Posisi)" },
            { key: "w", label: "Lebar" },
            { key: "h", label: "Tinggi" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type="range" min={0} max={100}
                value={cropArea[key]}
                onChange={(e) => setCropArea((p) => ({ ...p, [key]: Number(e.target.value) }))}
                className="w-full accent-primary h-1.5"
              />
              <span className="text-xs text-muted-foreground text-center block">{Math.round(cropArea[key])}%</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={applyCrop} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
            <Check size={14} /> Terapkan Potong
          </button>
          <button onClick={() => setStep("review")} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
            Batal
          </button>
        </div>
      </div>
    );
  };

  // REVIEW STEP
  const renderReview = () => {
    const isPdf = outputFormat === "pdf";
    const estimatedSize = pages.length * 0.3;

    return (
      <div className="flex flex-col gap-3 min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Perkecil">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">{zoomLevel}%</span>
            <button onClick={zoomIn} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Perbesar">
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={fitWidth} className="p-1.5 rounded-md hover:bg-muted transition-colors text-xs flex items-center gap-1" title="Sesuaikan Lebar">
              <Maximize size={14} /> <span className="hidden sm:inline">Sesuaikan Lebar</span>
            </button>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {pages.length} Halaman
          </span>
        </div>

        {/* Main content */}
        <div className="flex flex-col sm:flex-row gap-4 min-h-0 flex-1">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1" style={{ maxHeight: "58vh" }}>
            {pages.map((page, i) => (
              <div key={page.id} className="relative group">
                <div
                  className={`relative bg-background border rounded-lg overflow-hidden transition-all ${
                    isPdf ? "border-border shadow-md" : "border-border shadow-sm"
                  }`}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                >
                  {isPdf && (
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/50">
                      <FileText size={12} className="text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Halaman {i + 1} dari {pages.length}
                      </span>
                    </div>
                  )}
                  <div className={isPdf ? "p-4" : ""}>
                    <img
                      src={page.cropped || page.imageData}
                      alt={`Halaman ${i + 1}`}
                      className="w-full h-auto object-contain rounded"
                    />
                  </div>

                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <button
                        onClick={() => setActivePageMenu(activePageMenu === i ? null : i)}
                        className="p-1.5 rounded-md bg-background/90 border border-border shadow-sm hover:bg-muted transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activePageMenu === i && (
                        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                          <button
                            onClick={() => openCrop(i)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                          >
                            <Pencil size={12} /> Edit Scan
                          </button>
                          <button
                            onClick={() => openCrop(i)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                          >
                            <Crop size={12} /> Potong
                          </button>
                          {pages.length > 1 && i > 0 && (
                            <button
                              onClick={() => movePage(i, -1)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                            >
                              <ArrowUp size={12} /> Pindah ke Atas
                            </button>
                          )}
                          {pages.length > 1 && i < pages.length - 1 && (
                            <button
                              onClick={() => movePage(i, 1)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                            >
                              <ArrowDown size={12} /> Pindah ke Bawah
                            </button>
                          )}
                          <div className="border-t border-border my-1" />
                          <button
                            onClick={() => confirmDelete(i)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left"
                          >
                            <Trash2 size={12} /> Hapus Halaman
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1.5 px-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Halaman {i + 1}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openCrop(i)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-input hover:bg-muted transition-colors">
                      <Crop size={11} /> Potong
                    </button>
                    <button onClick={() => confirmDelete(i)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={11} /> Hapus
                    </button>
                  </div>
                </div>

                {deleteConfirm === i && (
                  <div className="mt-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                    <p className="text-xs text-foreground mb-2">Hapus halaman ini?</p>
                    <div className="flex gap-2">
                      <button onClick={() => executeDelete(i)} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90">
                        Hapus
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-md border border-input text-xs font-medium hover:bg-muted">
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* settings panel */}
          <div className="sm:w-52 shrink-0 space-y-3">
            <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Simpan Sebagai</h4>
              <div className="flex flex-row sm:flex-col gap-2">
                {[
                  { fmt: "pdf", icon: FileText, label: "PDF" },
                  { fmt: "png", icon: Image, label: "PNG" },
                  { fmt: "jpg", icon: Image, label: "JPG" },
                ].map(({ fmt, icon: Icon, label }) => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors w-full justify-center sm:justify-start ${
                      outputFormat === fmt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Ringkasan</h4>
              <p className="text-xs text-muted-foreground">Format: <span className="font-medium text-foreground">{outputFormat.toUpperCase()}</span></p>
              <p className="text-xs text-muted-foreground">Halaman: <span className="font-medium text-foreground">{pages.length}</span></p>
              <p className="text-xs text-muted-foreground">Ukuran: <span className="font-medium text-foreground">~{(estimatedSize).toFixed(1)} MB</span></p>
            </div>

            {/* Options */}
            <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Opsi</h4>
              <button onClick={() => { setStep("camera"); startCamera(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input text-xs hover:bg-muted w-full transition-colors">
                <Plus size={12} /> Tambah Halaman
              </button>
              <button onClick={() => { setPages([]); setStep("camera"); startCamera(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input text-xs hover:bg-muted w-full transition-colors">
                <RotateCcw size={12} /> Ulangi Pindai
              </button>
            </div>

            {/* Main action */}
            <button
              onClick={handleConvert}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Download size={16} /> Simpan & Gunakan untuk Unggah
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MODAL SHELL
  const subtitle = step === "camera"
    ? "Ambil foto dokumen"
    : step === "crop"
    ? `Potong halaman ${cropPageIndex + 1}`
    : `${pages.length} halaman dipindai`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-2 sm:p-4" onClick={(e) => { if (activePageMenu !== null) setActivePageMenu(null); }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Camera size={20} className="text-primary" />
            <div>
              <h2 className="font-bold text-foreground text-sm sm:text-base">Pindai Dokumen</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {step === "camera" && renderCamera()}
          {step === "crop" && renderCrop()}
          {step === "review" && renderReview()}
        </div>
      </div>
    </div>
  );
}
