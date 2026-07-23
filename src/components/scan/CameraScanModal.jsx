import { useState } from "react";
import DocumentScanner from "@/components/scan/DocumentScanner";

export default function CameraScanModal({ onClose, onComplete, onScanForOCR, ocrMode = false }) {
  const handleCapture = (file, pageImages) => {
    const images = Array.isArray(pageImages) ? pageImages : [pageImages].filter(Boolean);

    onComplete(file, images);

    if (onScanForOCR && images[0]) {
      onScanForOCR(images[0]);
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