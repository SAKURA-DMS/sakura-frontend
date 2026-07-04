/**
 * OCRFillModal.jsx
 * Modal pemilihan cara pengisian form:
 *  - Isi Form Manual
 *  - Isi Form Menggunakan OCR
 *
 * Jika OCR dipilih:
 * 1. Tampilkan preview gambar scan
 * 2. Jalankan OCR (Tesseract.js)
 * 3. Tampilkan hasil field yang dideteksi
 * 4. User dapat edit setiap field
 * 5. Konfirmasi → kirim ke parent via onConfirm(fields)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, FileText, Scan, Loader2, CheckCircle, AlertTriangle,
  Edit3, RotateCcw, ChevronRight, Eye, EyeOff,
} from "lucide-react";
import { recognizeImage, parseDocumentFields, getOCRTemplateByType } from "@/services/ocrService";

// ── Label mapping field → bahasa Indonesia ──────────────────────────────────
const FIELD_LABELS = {
  judul: "Judul Dokumen",
  namaSiswa: "Nama Siswa",
  nis: "NIS",
  nisn: "NISN",
  kelas: "Kelas",
  tahunAjaran: "Tahun Ajaran",
  tempatLahir: "Tempat Lahir",
  tanggalLahir: "Tanggal Lahir",
  jenisKelamin: "Jenis Kelamin",
  namaOrangTua: "Nama Orang Tua",
  noHpOrangTua: "No. HP Orang Tua",
  nip: "NIP",
  nomorSurat: "Nomor Surat",
  perihal: "Perihal",
  tanggalSurat: "Tanggal Surat",
  pengirim: "Pengirim",
  tujuan: "Tujuan",
  namaBarang: "Nama Barang",
  nomorAgenda: "Nomor Agenda",
  penandatangan: "Penandatangan",
};

// ── Field untuk setiap kategori ─────────────────────────────────────────────
const CATEGORY_FIELDS = {
  1: ["namaSiswa", "nis", "nisn", "kelas", "tahunAjaran", "tempatLahir", "tanggalLahir", "jenisKelamin", "namaOrangTua", "noHpOrangTua"],
  2: ["nip", "tahunAjaran"],
  3: ["namaBarang"],
  4: ["nomorSurat", "perihal", "tanggalSurat", "pengirim", "tujuan", "penandatangan", "nomorAgenda"],
};

// ─────────────────────────────────────────────────────────────────────────────

export default function OCRFillModal({
  onClose,
  onConfirm,
  scanImageUrl,      // dataUrl gambar yang sudah di-scan (untuk di-OCR)
  categoryId,        // untuk menentukan field mana yang relevan
  typeId,
  typeName,
  autoConfirm = false,
}) {
  const [mode, setMode] = useState(null); // null | "manual" | "ocr"
  const [ocrStep, setOcrStep] = useState("idle"); // idle | loading | done | error
  const [ocrProgress, setOcrProgress] = useState(0);
  const [rawText, setRawText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [fields, setFields] = useState({});
  const [showRaw, setShowRaw] = useState(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryId || 1);

  const templateKey = useMemo(() => getOCRTemplateByType(typeId, typeName), [typeId, typeName]);
  const isSupportedOCR = Boolean(templateKey);

  useEffect(() => {
    if (categoryId) setSelectedCategory(categoryId);
  }, [categoryId]);

  // Tentukan field yang relevan berdasarkan kategori
  const relevantFields = CATEGORY_FIELDS[selectedCategory] || Object.keys(FIELD_LABELS);

  // Supported doc types for user guidance
  const SUPPORTED_DOC_TYPES = [
    { id: 1, label: "Ijazah / Transkrip / Sertifikat" },
    { id: 2, label: "Formulir / Data Siswa (NIS/NISN)" },
    { id: 3, label: "Inventaris / Surat (nomor/agenda)" },
    { id: 4, label: "Surat Keputusan / Surat Tugas / Surat Keterangan" },
  ];

  // ── Jalankan OCR ──────────────────────────────────────────────────────────
  const runOCR = useCallback(async () => {
    if (!scanImageUrl) {
      setOcrStatusMessage("Scan dokumen terlebih dahulu untuk menggunakan OCR.");
      setOcrStep("error");
      return;
    }
    if (!isSupportedOCR) {
      setOcrStatusMessage(
        "OCR hanya mendukung dokumen terstruktur tertentu seperti Ijazah, SKL, Sertifikat, dan Transkrip/Rekap Nilai."
      );
      setOcrStep("error");
      return;
    }

    setOcrStep("loading");
    setOcrProgress(0);
    setOcrStatusMessage("");

    try {
      const result = await recognizeImage(scanImageUrl, (p) => setOcrProgress(Math.round(p * 100)));
      setRawText(result.text);
      setConfidence(Math.round(result.confidence));
      const parsed = parseDocumentFields(result.text, templateKey);

      // Hanya ambil field yang relevan dengan kategori ini
      const filteredFields = {};
      relevantFields.forEach((key) => {
        if (parsed[key]) filteredFields[key] = parsed[key];
      });

      setFields(filteredFields);
      setOcrStep("done");
    } catch (err) {
      console.error("OCR error:", err);
      setOcrStatusMessage("Terjadi kesalahan saat membaca dokumen. Coba lagi atau isi manual.");
      setOcrStep("error");
    }
  }, [scanImageUrl, relevantFields, templateKey, isSupportedOCR]);

  useEffect(() => {
    if (mode === "ocr") runOCR();
  }, [mode, runOCR]);

  useEffect(() => {
    if (autoConfirm && scanImageUrl && mode === null) {
      setMode("ocr");
      setOcrStep("idle");
    }
  }, [autoConfirm, scanImageUrl, mode]);

  useEffect(() => {
    if (autoConfirm && mode === "ocr" && ocrStep === "done") {
      onConfirm({ mode: "ocr", fields });
    }
  }, [autoConfirm, mode, ocrStep, fields, onConfirm]);

  // Cleanup worker saat modal ditutup
  useEffect(() => {
    return () => { /* jangan terminate — bisa dipakai lagi nanti */ };
  }, []);

  const handleConfirmOCR = () => {
    onConfirm({ mode: "ocr", fields });
  };

  const handleConfirmManual = () => {
    onConfirm({ mode: "manual", fields: {} });
  };

  // ── Render pilihan mode ───────────────────────────────────────────────────
  const renderModeSelect = () => (
    <div className="p-6 space-y-4">
      {/* Supported doc type selector - helps user choose correct OCR profile */}
      <div className="flex items-center justify-center gap-3">
        <label className="text-xs text-muted-foreground">Tipe Dokumen yang didukung:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(Number(e.target.value))}
          className="px-3 py-1 rounded-md border border-input bg-card text-sm"
        >
          {SUPPORTED_DOC_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <FileText size={22} className="text-primary" />
        </div>
        <h3 className="font-bold text-foreground text-lg">Pilih Cara Pengisian Form</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {scanImageUrl
            ? "Dokumen scan tersedia. Gunakan OCR untuk mengisi otomatis atau isi manual."
            : "Pilih cara mengisi data detail dokumen."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* OCR */}
        <button
          onClick={() => { setMode("ocr"); setOcrStep("idle"); }}
          disabled={!scanImageUrl || !isSupportedOCR}
          className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
            scanImageUrl && isSupportedOCR
              ? "border-primary/40 bg-primary/[0.03] hover:border-primary hover:bg-primary/[0.06]"
              : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Scan size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Isi Form Menggunakan OCR</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Sistem membaca isi dokumen scan secara otomatis dan mengisi form. Anda tetap dapat mengedit hasilnya.
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              OCR hanya mendukung dokumen cetak terstruktur seperti Ijazah, SKL, Sertifikat, dan Transkrip/Rekap Nilai.
            </p>
            {(!scanImageUrl || !isSupportedOCR) && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                {isSupportedOCR
                  ? "⚠ Scan dokumen terlebih dahulu untuk menggunakan OCR."
                  : "⚠ Dokumen ini tidak didukung untuk OCR. Pilih isi manual atau gunakan scan dokumen lain."}
              </p>
            )}
          </div>
          {scanImageUrl && (
            <ChevronRight size={16} className="text-primary shrink-0 mt-2" />
          )}
        </button>

        {/* Manual */}
        <button
          onClick={handleConfirmManual}
          className="flex items-start gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] text-left transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Edit3 size={18} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Isi Form Manual</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Isi setiap field secara manual sesuai data yang ada di dokumen.
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-2" />
        </button>
      </div>
    </div>
  );

  // ── Render OCR loading ────────────────────────────────────────────────────
  const renderOCRLoading = () => (
    <div className="p-8 flex flex-col items-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">Membaca Dokumen...</p>
        <p className="text-sm text-muted-foreground mt-1">Proses OCR sedang berjalan</p>
      </div>
      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${ocrProgress}%` }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">{ocrProgress}%</p>
      </div>
      {ocrProgress < 10 && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Pertama kali menggunakan OCR, model bahasa perlu diunduh (~10MB). Proses berikutnya akan lebih cepat.
        </p>
      )}
    </div>
  );

  // ── Render OCR error ──────────────────────────────────────────────────────
  const renderOCRError = () => (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle size={24} className="text-destructive" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">OCR Gagal</p>
        <p className="text-sm text-muted-foreground mt-1">
          {ocrStatusMessage || "Tidak dapat membaca dokumen. Pastikan koneksi internet tersedia untuk mengunduh model OCR."}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => { setOcrStep("idle"); setMode(null); }}
          className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
        >
          Kembali
        </button>
        <button
          onClick={runOCR}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={14} /> Coba Lagi
        </button>
      </div>
    </div>
  );

  // ── Render OCR result (editable) ──────────────────────────────────────────
  const renderOCRResult = () => {
    const detectedCount = Object.keys(fields).length;

    return (
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
              {detectedCount > 0
                ? `${detectedCount} field berhasil dideteksi (akurasi ${confidence}%)`
                : "Tidak ada field yang dapat dideteksi otomatis"}
            </p>
            <p className={`text-xs mt-0.5 ${detectedCount > 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
              {detectedCount > 0
                ? "Periksa dan koreksi nilai yang dideteksi sebelum menyimpan."
                : "Kualitas scan mungkin kurang baik. Isi field secara manual."}
            </p>
          </div>
        </div>

        {/* Preview gambar + raw text toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Hasil Deteksi Field
          </p>
          {rawText && (
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
              {showRaw ? "Sembunyikan" : "Lihat"} Teks Mentah
            </button>
          )}
        </div>

        {showRaw && rawText && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border max-h-32 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {rawText}
            </pre>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-3 max-h-[calc(92vh-280px)] overflow-y-auto pr-1">
          {relevantFields.map((key) => (
            <div key={key} className="space-y-2">
              <label className="block text-xs font-medium text-foreground mb-1">
                {FIELD_LABELS[key] || key}
                {fields[key] && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400 font-medium">
                    <CheckCircle size={10} /> Terdeteksi
                  </span>
                )}
              </label>
              <input
                value={fields[key] || ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={`Masukkan ${FIELD_LABELS[key] || key}...`}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                  fields[key]
                    ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20"
                    : "border-input bg-background"
                }`}
              />
            </div>
          ))}
        </div>

        {/* If no fields detected, show suggestions */}
        {detectedCount === 0 && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <p className="font-medium">Tidak ditemukan field otomatis.</p>
            <p className="mt-1">Tips:</p>
            <ul className="mt-1 list-disc list-inside text-xs">
              <li>Pastikan dokumen berupa cetakan (printed), bukan tulisan tangan.</li>
              <li>Pilih tipe dokumen yang sesuai pada dropdown dan coba ulang OCR.</li>
              <li>Perbaiki kualitas scan (kontras, crop, orientasi) jika perlu.</li>
            </ul>
            <div className="mt-2 flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(Number(e.target.value))}
                className="px-3 py-1 rounded-md border border-input bg-card text-sm"
              >
                {SUPPORTED_DOC_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <button onClick={runOCR} className="px-3 py-1 rounded-md bg-primary text-white">Coba OCR Lagi</button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-border">
          <button
            onClick={() => { setOcrStep("idle"); setMode(null); setFields({}); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors"
          >
            <RotateCcw size={14} /> Ulang
          </button>
          <button
            onClick={handleConfirmOCR}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <CheckCircle size={15} /> Gunakan Data Ini
          </button>
        </div>
      </div>
    );
  };

  // ── Shell modal ───────────────────────────────────────────────────────────
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
            {mode === "ocr" ? (
              <Scan size={18} className="text-primary" />
            ) : (
              <FileText size={18} className="text-primary" />
            )}
            <h3 className="font-bold text-foreground">
              {mode === null && "Cara Pengisian Form"}
              {mode === "ocr" && ocrStep === "loading" && "Memproses OCR..."}
              {mode === "ocr" && ocrStep === "done" && "Hasil OCR — Edit & Konfirmasi"}
              {mode === "ocr" && ocrStep === "error" && "OCR Gagal"}
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
          {mode === null && renderModeSelect()}
          {mode === "ocr" && ocrStep === "loading" && renderOCRLoading()}
          {mode === "ocr" && ocrStep === "done" && renderOCRResult()}
          {mode === "ocr" && ocrStep === "error" && renderOCRError()}
        </div>
      </div>
    </div>
  );
}