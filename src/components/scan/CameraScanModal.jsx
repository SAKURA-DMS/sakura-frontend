/**
 * CameraScanModal.jsx  (VERSI BARU)
 *
 * Wrapper tipis yang:
 * 1. Menampilkan DocumentScanner (scanner CamScanner-like).
 * 2. Setelah scan selesai, menerima file + preview dari DocumentScanner.
 * 3. Meneruskan ke parent via onComplete(file, pageImages).
 *
 * Komponen ini menggantikan CameraScanModal lama yang hanya membuka
 * kamera biasa. Sekarang langsung menampilkan DocumentScanner full-screen.
 *
 * Props:
 *   onClose()                   — tutup modal
 *   onComplete(file, images)    — kirim hasil ke UploadForm
 *   onScanForOCR(dataUrl)       — opsional, kirim dataUrl ke OCR modal
 */

import { useState } from "react";
import DocumentScanner from "@/components/scan/DocumentScanner";

export default function CameraScanModal({ onClose, onComplete, onScanForOCR, ocrMode = false }) {
  const handleCapture = (file, dataUrl) => {
    // Kirim ke parent sebagai satu halaman
    onComplete(file, [dataUrl]);

    // Jika parent ingin langsung ke OCR
    if (onScanForOCR) {
      onScanForOCR(dataUrl);
    }
  };

  return (
    <DocumentScanner
      onClose={onClose}
      onCapture={handleCapture}
      ocrMode={ocrMode}
    />
  );
}