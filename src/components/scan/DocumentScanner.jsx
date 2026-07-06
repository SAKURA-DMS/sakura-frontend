/**
 * DocumentScanner.jsx
 * Scanner dokumen lengkap mirip CamScanner:
 * - Auto detect document edge
 * - Perspective correction (4-point transform)
 * - Edge detection via canvas processing
 * - Brightness / Contrast adjustment
 * - Auto focus (native constraint)
 * - Sharpen text filter
 * - Compress hasil scan
 * - Preview hasil scan
 *
 * Library: hanya browser Canvas API bawaan (zero extra dependencies)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Camera, X, ZoomIn, ZoomOut, Sun, Contrast, Scan,
  RotateCw, Check, Sliders, ChevronRight, AlertTriangle,
  Focus, Maximize2, RefreshCw,
} from "lucide-react";

// ─── Konstanta kualitas kompresi ────────────────────────────────────────────
const COMPRESS_QUALITY = 0.82; // jpeg quality 0–1
const MAX_SCAN_WIDTH = 2048;   // px max setelah capture

// ─── Utilitas Canvas ─────────────────────────────────────────────────────────

/** Resize canvas ke lebar maks sambil mempertahankan aspek rasio */
function resizeCanvas(src, maxW = MAX_SCAN_WIDTH) {
  const scale = src.width > maxW ? maxW / src.width : 1;
  const dst = document.createElement("canvas");
  dst.width = Math.round(src.width * scale);
  dst.height = Math.round(src.height * scale);
  dst.getContext("2d").drawImage(src, 0, 0, dst.width, dst.height);
  return dst;
}

/** Grayscale sederhana — dipakai sebagai basis edge detection */
function toGrayscale(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  return imageData;
}

/** Sharpening kernel 3×3 (unsharp mask sederhana) */
function applySharpen(ctx, w, h) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const d = src.data;
  const o = dst.data;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            val += d[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        o[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, val));
      }
      o[(y * w + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
}

/** Brightness + Contrast adjustment (CSS filter fallback via canvas) */
function applyBrightnessContrast(ctx, w, h, brightness, contrast) {
  // brightness: -100..100, contrast: -100..100
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      v += brightness;                          // brightness
      v = factor * (v - 128) + 128;            // contrast
      d[i + c] = Math.max(0, Math.min(255, v));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Sobel edge detection — mengembalikan array skor tepi per piksel (0–255).
 * Dipakai untuk auto-detect sudut dokumen.
 */
function sobelEdgeMap(grayData, w, h) {
  const d = grayData.data;
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const g = (row, col) => d[((y + row) * w + (x + col)) * 4];
      const gx =
        -g(-1, -1) + g(-1, 1) - 2 * g(0, -1) + 2 * g(0, 1) - g(1, -1) + g(1, 1);
      const gy =
        -g(-1, -1) - 2 * g(-1, 0) - g(-1, 1) + g(1, -1) + 2 * g(1, 0) + g(1, 1);
      edge[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edge;
}

/**
 * Heuristic auto-detect 4 sudut dokumen dari edge map.
 * Strateginya: sampel tepi-tepi gambar dari setiap kuadran dan cari titik
 * tepi terdekat dari setiap sudut.
 * Return: [{x,y}, {x,y}, {x,y}, {x,y}] (TL, TR, BR, BL) atau null.
 */
function detectDocumentCorners(edgeMap, w, h) {
  const MARGIN = 0.05; // 5% margin dari tepi frame
  const threshold = 80;

  // Untuk setiap kuadran, scan dari pojok menuju tengah
  const candidates = { tl: null, tr: null, br: null, bl: null };
  const maxDist = { tl: Infinity, tr: Infinity, br: Infinity, bl: Infinity };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edgeMap[y * w + x] < threshold) continue;
      const nx = x / w, ny = y / h;
      // Ignore border pixels
      if (nx < MARGIN || nx > 1 - MARGIN || ny < MARGIN || ny > 1 - MARGIN) continue;

      const dTL = nx * nx + ny * ny;
      const dTR = (1 - nx) * (1 - nx) + ny * ny;
      const dBR = (1 - nx) * (1 - nx) + (1 - ny) * (1 - ny);
      const dBL = nx * nx + (1 - ny) * (1 - ny);

      if (dTL < maxDist.tl) { maxDist.tl = dTL; candidates.tl = { x, y }; }
      if (dTR < maxDist.tr) { maxDist.tr = dTR; candidates.tr = { x, y }; }
      if (dBR < maxDist.br) { maxDist.br = dBR; candidates.br = { x, y }; }
      if (dBL < maxDist.bl) { maxDist.bl = dBL; candidates.bl = { x, y }; }
    }
  }

  const { tl, tr, br, bl } = candidates;
  if (!tl || !tr || !br || !bl) return null;

  // Validasi: pastikan segiempat masuk akal (minimal 30% area gambar)
  const width1 = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const width2 = Math.hypot(br.x - bl.x, br.y - bl.y);
  const height1 = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const height2 = Math.hypot(br.x - tr.x, br.y - tr.y);
  const avgW = (width1 + width2) / 2;
  const avgH = (height1 + height2) / 2;
  if (avgW < w * 0.3 || avgH < h * 0.3) return null;

  return [tl, tr, br, bl];
}

/**
 * Perspective correction (4-point to rectangular crop).
 * Menggunakan pendekatan bilinear transform yang diimplementasi manual
 * (tidak butuh library eksternal).
 */
function perspectiveCorrect(srcCanvas, corners) {
  const [tl, tr, br, bl] = corners;

  // Hitung dimensi output
  const outW = Math.round(Math.max(
    Math.hypot(tr.x - tl.x, tr.y - tl.y),
    Math.hypot(br.x - bl.x, br.y - bl.y)
  ));
  const outH = Math.round(Math.max(
    Math.hypot(bl.x - tl.x, bl.y - tl.y),
    Math.hypot(br.x - tr.x, br.y - tr.y)
  ));

  const dst = document.createElement("canvas");
  dst.width = outW;
  dst.height = outH;
  const ctx = dst.getContext("2d");

  const srcCtx = srcCanvas.getContext("2d");
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height).data;
  const dstData = ctx.createImageData(outW, outH);
  const dd = dstData.data;

  // Inverse bilinear interpolation: untuk setiap piksel output, cari piksel sumber
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const tx = ox / outW;
      const ty = oy / outH;

      // Bilinear map dari output ke sumber
      const sx = (1 - ty) * ((1 - tx) * tl.x + tx * tr.x) + ty * ((1 - tx) * bl.x + tx * br.x);
      const sy = (1 - ty) * ((1 - tx) * tl.y + tx * tr.y) + ty * ((1 - tx) * bl.y + tx * br.y);

      const ix = Math.round(sx), iy = Math.round(sy);
      if (ix < 0 || ix >= srcCanvas.width || iy < 0 || iy >= srcCanvas.height) continue;

      const si = (iy * srcCanvas.width + ix) * 4;
      const di = (oy * outW + ox) * 4;
      dd[di] = srcData[si];
      dd[di + 1] = srcData[si + 1];
      dd[di + 2] = srcData[si + 2];
      dd[di + 3] = 255;
    }
  }
  ctx.putImageData(dstData, 0, 0);
  return dst;
}

/**
 * Pipeline lengkap post-processing setelah capture.
 * @param {string} dataUrl - jpeg dataUrl dari video capture
 * @param {object} opts - { brightness, contrast, sharpen, perspectiveCorners }
 * @returns {Promise<{dataUrl: string, corners: Array|null}>}
 */
async function processImage(dataUrl, opts = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Step 1: Buat canvas dari gambar asli
      let canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Step 2: Resize ke maks
      canvas = resizeCanvas(canvas);
      const w = canvas.width, h = canvas.height;
      const pCtx = canvas.getContext("2d");

      // Step 3: Auto-detect corners (gunakan grayscale + edge detection)
      let detectedCorners = opts.perspectiveCorners || null;
      if (!detectedCorners) {
        const grayData = pCtx.getImageData(0, 0, w, h);
        toGrayscale(grayData);
        const edgeMap = sobelEdgeMap(grayData, w, h);
        detectedCorners = detectDocumentCorners(edgeMap, w, h);
      }

      // Step 4: Perspective correction jika corners tersedia
      if (detectedCorners && opts.applyPerspective !== false) {
        try {
          canvas = perspectiveCorrect(canvas, detectedCorners);
        } catch {
          // fallback: skip perspective
        }
      }

      const finalCtx = canvas.getContext("2d");

      // Step 5: Brightness / Contrast
      const brightness = opts.brightness ?? 0;
      const contrast = opts.contrast ?? 0;
      if (brightness !== 0 || contrast !== 0) {
        applyBrightnessContrast(finalCtx, canvas.width, canvas.height, brightness, contrast);
      }

      // Step 6: Sharpen
      if (opts.sharpen) {
        applySharpen(finalCtx, canvas.width, canvas.height);
      }

      // Step 7: Compress & return
      const out = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);
      resolve({ dataUrl: out, corners: detectedCorners });
    };
    img.src = dataUrl;
  });
}

// ─── Corner Overlay (4-titik draggable) ──────────────────────────────────────
function CornerHandle({ label, xPct, yPct, onChange, color = "#3b82f6" }) {
  const handleRef = useRef(null);

  const onPointerDown = (e) => {
    e.preventDefault();
    const container = handleRef.current?.parentElement;
    if (!container) return;

    const move = (me) => {
      const rect = container.getBoundingClientRect();
      const cx = (me.touches ? me.touches[0].clientX : me.clientX) - rect.left;
      const cy = (me.touches ? me.touches[0].clientY : me.clientY) - rect.top;
      onChange({
        x: Math.max(0, Math.min(100, (cx / rect.width) * 100)),
        y: Math.max(0, Math.min(100, (cy / rect.height) * 100)),
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  return (
    <div
      ref={handleRef}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      title={label}
      style={{
        position: "absolute",
        left: `calc(${xPct}% - 10px)`,
        top: `calc(${yPct}% - 10px)`,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: color,
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        cursor: "grab",
        zIndex: 30,
        touchAction: "none",
      }}
    />
  );
}

/** Gambar garis polygon dari 4 titik (dalam %) */
function toPercent(value, base = 100) {
  if (typeof value === "string" && value.endsWith("%")) {
    return Number(value.replace("%", "")) || 0;
  }
  return (Number(value) / base) * 100;
}

function PerspectiveOverlay({ corners, containerW, containerH }) {
  if (!corners || corners.length !== 4) return null;
  const pts = corners
    .map((c) => `${toPercent(c.x, containerW)}%,${toPercent(c.y, containerH)}%`)
    .join(" ");
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 25 }}
    >
      <polygon points={pts} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DocumentScanner({ onClose, onCapture, ocrMode = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedRaw, setCapturedRaw] = useState(null);       // raw dataUrl setelah foto
  const [processedUrl, setProcessedUrl] = useState(null);     // setelah post-process
  const [detectedCorners, setDetectedCorners] = useState(null); // [{x,y}×4] dalam piksel
  const [adjustedCorners, setAdjustedCorners] = useState(null); // user-dragged corners

  // Kamera
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState([1, 1]);
  const [torchOn, setTorchOn] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 1, h: 1 }); // actual video pixel size

  // Mode
  const [step, setStep] = useState("camera"); // camera | adjust | result
  const [isProcessing, setIsProcessing] = useState(false);

  // Pengaturan
  const [showSettings, setShowSettings] = useState(false);
  const [brightness, setBrightness] = useState(10);
  const [contrast, setContrast] = useState(15);
  const [sharpen, setSharpen] = useState(true);
  const [autoPerspective, setAutoPerspective] = useState(false);

  // ── Start kamera ──
  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: "continuous",     // auto focus
          advanced: [{ focusMode: "continuous-picture" }],
        },
        audio: false,
      });
      setStream(ms);

      // Cek zoom capability
      const track = ms.getVideoTracks()[0];
      if (track) {
        const cap = track.getCapabilities?.() || {};
        if (cap.zoom) setZoomRange([cap.zoom.min, cap.zoom.max]);
      }
    } catch {
      // Fallback tanpa constraint advanced
      try {
        const ms = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(ms);
      } catch {
        alert("Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan.");
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      videoRef.current.onloadedmetadata = () => {
        setCameraReady(true);
        setVideoSize({
          w: videoRef.current.videoWidth,
          h: videoRef.current.videoHeight,
        });
      };
    }
  }, [stream]);

  // ── Zoom ──
  const applyZoom = useCallback(
    async (val) => {
      setZoom(val);
      const track = stream?.getVideoTracks()[0];
      if (!track) return;
      try {
        await track.applyConstraints({ advanced: [{ zoom: val }] });
      } catch { /* tidak semua browser/device support zoom API */ }
    },
    [stream]
  );

  // ── Torch ──
  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch { /* torch tidak tersedia */ }
  }, [stream, torchOn]);

  // ── Capture ──
  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);

    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const rawUrl = c.toDataURL("image/jpeg", 0.95);
    setCapturedRaw(rawUrl);

    // Post-process
    const { dataUrl, corners } = await processImage(rawUrl, {
      brightness,
      contrast,
      sharpen,
      applyPerspective: autoPerspective,
    });

    setProcessedUrl(dataUrl);
    setDetectedCorners(corners);
    setAdjustedCorners(corners);
    setIsProcessing(false);

    // Hentikan kamera
    stream?.getTracks().forEach((t) => t.stop());
    setStep(autoPerspective && corners ? "result" : "result");
  }, [brightness, contrast, sharpen, autoPerspective, stream]);

  // ── Terapkan perspektif manual ──
  const applyManualPerspective = useCallback(async () => {
    if (!capturedRaw || !adjustedCorners) return;
    setIsProcessing(true);

    const { dataUrl } = await processImage(capturedRaw, {
      brightness,
      contrast,
      sharpen,
      perspectiveCorners: adjustedCorners,
      applyPerspective: true,
    });

    setProcessedUrl(dataUrl);
    setIsProcessing(false);
    setStep("result");
  }, [capturedRaw, adjustedCorners, brightness, contrast, sharpen]);

  // ── Re-process saat settings berubah (hanya di step result) ──
  const reprocess = useCallback(async () => {
    if (!capturedRaw) return;
    setIsProcessing(true);
    const { dataUrl } = await processImage(capturedRaw, {
      brightness,
      contrast,
      sharpen,
      perspectiveCorners: adjustedCorners,
      applyPerspective: autoPerspective,
    });
    setProcessedUrl(dataUrl);
    setIsProcessing(false);
  }, [capturedRaw, brightness, contrast, sharpen, adjustedCorners, autoPerspective]);

  useEffect(() => {
    if (step !== "result" || !capturedRaw) return;
    reprocess();
  }, [step, brightness, contrast, sharpen, autoPerspective, reprocess]);

  // ── Selesai / kirim ke parent ──
  const handleDone = useCallback(() => {
    if (!processedUrl) return;
    // Konversi dataUrl ke File
    const byteString = atob(processedUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/jpeg" });
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file, processedUrl);
  }, [processedUrl, onCapture]);

  // ── Ulang scan ──
  const retake = useCallback(() => {
    setCapturedRaw(null);
    setProcessedUrl(null);
    setDetectedCorners(null);
    setAdjustedCorners(null);
    setStep("camera");
    startCamera();
  }, [startCamera]);

  // ── Corner drag handlers ──
  const updateCorner = (index, pos) => {
    if (!adjustedCorners) return;
    const next = [...adjustedCorners];
    next[index] = { x: pos.x / 100 * videoSize.w, y: pos.y / 100 * videoSize.h };
    setAdjustedCorners(next);
  };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 shrink-0">
        <div className="flex items-center gap-2">
          <Scan size={18} className="text-blue-400" />
          <span className="text-white font-semibold text-sm">
            {step === "camera" && "Pindai Dokumen"}
            {step === "adjust" && "Sesuaikan Batas Dokumen"}
            {step === "result" && "Preview Hasil Scan"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-blue-600 text-white" : "bg-white/10 text-white"}`}
            title="Pengaturan Scan"
          >
            <Sliders size={16} />
          </button>
          <button
            onClick={() => { stream?.getTracks().forEach((t) => t.stop()); onClose(); }}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Brightness */}
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <Sun size={12} /> Kecerahan: {brightness > 0 ? "+" : ""}{brightness}
              </label>
              <input
                type="range" min={-80} max={80} value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full h-1.5 accent-blue-500"
              />
            </div>
            {/* Contrast */}
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <Contrast size={12} /> Kontras: {contrast > 0 ? "+" : ""}{contrast}
              </label>
              <input
                type="range" min={-80} max={80} value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1.5 accent-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox" checked={sharpen}
                onChange={(e) => setSharpen(e.target.checked)}
                className="accent-blue-500"
              />
              Pertajam Teks
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox" checked={autoPerspective}
                onChange={(e) => setAutoPerspective(e.target.checked)}
                className="accent-blue-500"
              />
              Koreksi Perspektif Otomatis
            </label>
          </div>
          {step === "result" && (
            <button
              onClick={reprocess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={12} /> Terapkan Ulang
            </button>
          )}
        </div>
      )}

      {/* ── Main View ── */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {/* CAMERA STEP */}
        {step === "camera" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-black"
              style={{ display: cameraReady ? "block" : "none" }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Memulai kamera...</span>
              </div>
            )}

            {/* Document boundary guide */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-3/4 relative">
                  {/* Corner brackets */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl-sm",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr-sm",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute border-blue-400 w-6 h-6 ${cls}`} />
                  ))}
                  <div className="absolute inset-0 border border-dashed border-blue-400/30 rounded" />
                  {/* Auto focus indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border border-blue-400/50 rounded flex items-center justify-center">
                      <Focus size={16} className="text-blue-400/60" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Zoom control (jika kamera mendukung) */}
            {zoomRange[1] > 1 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <button
                  onClick={() => applyZoom(Math.min(zoom + 0.5, zoomRange[1]))}
                  className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <ZoomIn size={16} />
                </button>
                <span className="text-white text-xs font-medium bg-black/50 px-1.5 py-0.5 rounded-full">
                  {zoom.toFixed(1)}×
                </span>
                <button
                  onClick={() => applyZoom(Math.max(zoom - 0.5, zoomRange[0]))}
                  className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <ZoomOut size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ADJUST STEP — perspektif manual */}
        {step === "adjust" && capturedRaw && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative" style={{ maxWidth: "100%", maxHeight: "100%" }}>
              <img
                src={capturedRaw}
                alt="Sesuaikan"
                className="block max-w-full max-h-[calc(100vh-200px)] object-contain"
                draggable={false}
              />
              {/* Overlay corners draggable */}
              {adjustedCorners && adjustedCorners.map((c, i) => (
                <CornerHandle
                  key={i}
                  label={["TL", "TR", "BR", "BL"][i]}
                  xPct={(c.x / videoSize.w) * 100}
                  yPct={(c.y / videoSize.h) * 100}
                  onChange={(pos) => updateCorner(i, pos)}
                />
              ))}
              {adjustedCorners && (
                <PerspectiveOverlay
                  corners={adjustedCorners.map((c) => ({
                    x: (c.x / videoSize.w) * 100 + "%",
                    y: (c.y / videoSize.h) * 100 + "%",
                  }))}
                  containerW={100}
                  containerH={100}
                />
              )}
            </div>
          </div>
        )}

        {/* RESULT STEP */}
        {step === "result" && processedUrl && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={processedUrl}
              alt="Hasil Scan"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ opacity: isProcessing ? 0.4 : 1 }}
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && step === "camera" && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">Memproses gambar...</span>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ── Bottom Controls ── */}
      <div className="bg-black/90 px-4 py-4 shrink-0">
        {/* CAMERA controls */}
        {step === "camera" && (
          <div className="flex items-center justify-center gap-6">
            {/* Torch */}
            <button
              onClick={toggleTorch}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${torchOn ? "bg-yellow-500 text-black" : "bg-white/10 text-white"}`}
              title="Lampu Flash"
            >
              ⚡
            </button>

            {/* Capture button */}
            <button
              onClick={capture}
              disabled={!cameraReady || isProcessing}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-500 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Settings shortcut */}
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center"
              title="Pengaturan"
            >
              <Sliders size={18} />
            </button>
          </div>
        )}

        {/* ADJUST controls */}
        {step === "adjust" && (
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-xs">
              Seret titik sudut untuk menyesuaikan area dokumen
            </p>
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <RotateCw size={16} /> Foto Ulang
              </button>
              <button
                onClick={() => {
                  // Skip perspective: gunakan capturedRaw, proses tanpa perspektif
                  processImage(capturedRaw, { brightness, contrast, sharpen, applyPerspective: false })
                    .then(({ dataUrl }) => { setProcessedUrl(dataUrl); setStep("result"); });
                }}
                className="py-3 px-4 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                title="Tanpa koreksi perspektif"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={applyManualPerspective}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <ChevronRight size={16} /> Terapkan
              </button>
            </div>
          </div>
        )}

        {/* RESULT controls */}
        {step === "result" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <Check size={12} className="text-green-400" /> Siap digunakan
              </span>
              {detectedCorners && (
                <span className="flex items-center gap-1">
                  <Scan size={12} className="text-blue-400" /> Deteksi otomatis berhasil
                </span>
              )}
              {!detectedCorners && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle size={12} /> Sesuaikan manual
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <RotateCw size={16} /> {ocrMode ? "Ambil Ulang" : "Foto Ulang"}
              </button>
              {!autoPerspective && (
                <button
                  onClick={() => setStep("adjust")}
                  className="py-3 px-4 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  title="Sesuaikan perspektif"
                >
                  <Maximize2 size={16} />
                </button>
              )}
              <button
                onClick={handleDone}
                disabled={isProcessing}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {ocrMode ? <><Scan size={16} /> Scan OCR</> : <><Check size={16} /> Gunakan Hasil Ini</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}