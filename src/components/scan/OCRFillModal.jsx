/**
 * OCRFillModal.jsx
 *
 * Modal hasil OCR dokumen. Dipanggil setelah user menekan tombol "Scan OCR"
 * pada hasil scan (lihat DocumentScanner/CameraScanModal). Begitu modal ini
 * terbuka, ia langsung mengirim gambar ke backend (/api/ocr/scan) yang
 * memanggil Gemini Vision API — tidak perlu memilih kategori/jenis dokumen
 * terlebih dahulu, karena jenis dokumen ditentukan langsung oleh Gemini.
 *
 * Alur:
 * 1. Modal terbuka → tampilkan loading → panggil scanDocumentOCR(scanImageUrl).
 * 2. Jika dokumen didukung → tampilkan document_type + field hasil OCR,
 *    semua bisa diedit sebelum dikonfirmasi.
 * 3. Jika dokumen tidak didukung / gagal dibaca → tampilkan pesan dan opsi
 *    untuk mengisi manual atau mengambil ulang foto.
 */

import { useState, useEffect, useCallback } from "react";
import {
  X, FileText, Scan, Loader2, CheckCircle, AlertTriangle,
  RotateCcw, Camera,
} from "lucide-react";
import {
  scanDocumentOCR,
  DOCUMENT_TYPE_LABELS,
  OCR_FIELD_LABELS,
  OCR_FIELD_ORDER,
} from "@/services/ocrService";

const SUPPORTED_DOC_LIST = [
  "Ijazah SMP",
  "Surat Keterangan Lulus (SKL/SKHU)",
  "Sertifikat",
  "Transkrip / Rekap Nilai",
];

export default function OCRFillModal({ onClose, onConfirm, onRetake, scanImageUrl }) {
  // idle | loading | done | unsupported | error
  const [step, setStep] = useState("idle");
  const [documentType, setDocumentType] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [fields, setFields] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const runOCR = useCallback(async () => {
    if (!scanImageUrl) {
      setErrorMessage("Scan dokumen terlebih dahulu untuk menggunakan OCR.");
      setStep("error");
      return;
    }

    setStep("loading");
    setErrorMessage("");

    try {
      const result = await scanDocumentOCR(scanImageUrl);

      if (result.unsupported) {
        setDocumentType(null);
        setStep("unsupported");
        return;
      }

      setDocumentType(result.documentType);
      setConfidence(result.confidence);
      setFields(result.fields || {});
      setStep("done");
    } catch (err) {
      console.error("OCR error:", err);
      setErrorMessage(
        err?.message || "Terjadi kesalahan saat membaca dokumen. Coba lagi atau isi manual."
      );
      setStep("error");
    }
  }, [scanImageUrl]);

  // Jalankan OCR otomatis begitu modal terbuka dengan gambar yang valid.
  useEffect(() => {
    runOCR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanImageUrl]);

  const handleConfirm = () => {
    // documentType disertakan agar parent (UploadForm) tahu template field
    // OCR mana yang harus ditampilkan di form (mis. "ijazah", "skl", dst).
    onConfirm({ mode: "ocr", documentType, fields });
  };

  const handleFillManual = () => {
    onConfirm({ mode: "manual", fields: {} });
  };

  const fieldOrder = documentType ? OCR_FIELD_ORDER[documentType] || Object.keys(fields) : [];
  const detectedCount = Object.keys(fields).filter((k) => fields[k]).length;

  // ── Loading ────────────────────────────────────────────────────────────────
  const renderLoading = () => (
    <div className="p-10 flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">Membaca dokumen...</p>
        <p className="text-sm text-muted-foreground mt-1">
          Gambar sedang dianalisis menggunakan Gemini Vision. Mohon tunggu sebentar.
        </p>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  const renderError = () => (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle size={24} className="text-destructive" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">OCR Gagal</p>
        <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={handleFillManual}
          className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
        >
          Isi Manual
        </button>
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
          >
            <Camera size={14} /> Ambil Ulang
          </button>
        )}
        <button
          onClick={runOCR}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={14} /> Coba Lagi
        </button>
      </div>
    </div>
  );

  // ── Unsupported document ─────────────────────────────────────────────────
  const renderUnsupported = () => (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
        <AlertTriangle size={24} className="text-amber-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">Dokumen tidak didukung OCR</p>
        <p className="text-sm text-muted-foreground mt-1">
          OCR hanya dapat membaca dokumen berikut:
        </p>
        <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside text-left inline-block">
          {SUPPORTED_DOC_LIST.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={handleFillManual}
          className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
        >
          Isi Manual
        </button>
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Camera size={14} /> Ambil Ulang
          </button>
        )}
      </div>
    </div>
  );

  // ── OCR result (editable) ─────────────────────────────────────────────────
  const renderResult = () => (
    <div className="p-5 space-y-4">
      {/* Status */}
      <div className={`flex items-start gap-3 p-3 rounded-xl border ${
        detectedCount > 0
          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
          : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
      }`}>
        {detectedCount > 0 ? (
          <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${detectedCount > 0 ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"}`}>
            {DOCUMENT_TYPE_LABELS[documentType] || "Dokumen"} terdeteksi
            {typeof confidence === "number" ? ` (keyakinan ${confidence}%)` : ""}
          </p>
          <p className={`text-xs mt-0.5 ${detectedCount > 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
            {detectedCount > 0
              ? "Periksa dan koreksi nilai yang dideteksi sebelum menyimpan."
              : "Tidak ada field yang dapat dideteksi otomatis. Isi field secara manual."}
          </p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-3 max-h-[calc(92vh-320px)] overflow-y-auto pr-1">
        {fieldOrder.map((key) => (
          <div key={key} className="space-y-2">
            <label className="block text-xs font-medium text-foreground mb-1">
              {OCR_FIELD_LABELS[key] || key}
              {fields[key] && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle size={10} /> Terdeteksi
                </span>
              )}
            </label>
            <input
              value={fields[key] || ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={`Masukkan ${OCR_FIELD_LABELS[key] || key}...`}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                fields[key]
                  ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20"
                  : "border-input bg-background"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors"
          >
            <Camera size={14} /> Ambil Ulang
          </button>
        )}
        <button
          onClick={runOCR}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors"
          title="Scan ulang gambar yang sama"
        >
          <RotateCcw size={14} /> Scan Ulang
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <CheckCircle size={15} /> Gunakan Data Ini
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {step === "done" ? (
              <Scan size={18} className="text-primary" />
            ) : (
              <FileText size={18} className="text-primary" />
            )}
            <h3 className="font-bold text-foreground">
              {step === "loading" && "Memproses OCR..."}
              {step === "done" && "Hasil OCR — Edit & Konfirmasi"}
              {step === "error" && "OCR Gagal"}
              {step === "unsupported" && "Dokumen Tidak Didukung"}
              {step === "idle" && "OCR"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === "loading" && renderLoading()}
          {step === "done" && renderResult()}
          {step === "error" && renderError()}
          {step === "unsupported" && renderUnsupported()}
        </div>
      </div>
    </div>
  );
}