import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Camera, X, Scan,
  RotateCw, Check, ChevronRight, AlertTriangle,
  Focus, Maximize2, Plus, Images, Zap, ZapOff,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const COMPRESS_QUALITY = 0.82;
const MAX_SCAN_WIDTH = 2048;  

function resizeCanvas(src, maxW = MAX_SCAN_WIDTH) {
  const scale = src.width > maxW ? maxW / src.width : 1;
  const dst = document.createElement("canvas");
  dst.width = Math.round(src.width * scale);
  dst.height = Math.round(src.height * scale);
  dst.getContext("2d").drawImage(src, 0, 0, dst.width, dst.height);
  return dst;
}

function toGrayscale(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  return imageData;
}

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

function detectDocumentCorners(edgeMap, w, h) {
  const MARGIN = 0.05;
  const threshold = 80;

  const candidates = { tl: null, tr: null, br: null, bl: null };
  const maxDist = { tl: Infinity, tr: Infinity, br: Infinity, bl: Infinity };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edgeMap[y * w + x] < threshold) continue;
      const nx = x / w, ny = y / h;
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

  const width1 = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const width2 = Math.hypot(br.x - bl.x, br.y - bl.y);
  const height1 = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const height2 = Math.hypot(br.x - tr.x, br.y - tr.y);
  const avgW = (width1 + width2) / 2;
  const avgH = (height1 + height2) / 2;
  if (avgW < w * 0.3 || avgH < h * 0.3) return null;

  return [tl, tr, br, bl];
}

function perspectiveCorrect(srcCanvas, corners) {
  const [tl, tr, br, bl] = corners;
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

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const tx = ox / outW;
      const ty = oy / outH;
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
 * @param {string} dataUrl 
 * @param {object} opts 
 * @returns {Promise<{dataUrl: string, corners: Array|null}>}
 */
async function processImage(dataUrl, opts = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      canvas = resizeCanvas(canvas);
      const w = canvas.width, h = canvas.height;
      const pCtx = canvas.getContext("2d");

      // Auto-detect corners (hanya dijalankan jika fitur Auto-crop aktif)
      let detectedCorners = opts.perspectiveCorners || null;
      if (!detectedCorners && opts.detectCorners) {
        const grayData = pCtx.getImageData(0, 0, w, h);
        toGrayscale(grayData);
        const edgeMap = sobelEdgeMap(grayData, w, h);
        detectedCorners = detectDocumentCorners(edgeMap, w, h);
      }

      // Perspective correction
      if (detectedCorners && opts.applyPerspective !== false) {
        try {
          canvas = perspectiveCorrect(canvas, detectedCorners);
        } catch { }
      }

      const finalCtx = canvas.getContext("2d");

      // Sharpen
      if (opts.sharpen) {
        applySharpen(finalCtx, canvas.width, canvas.height);
      }

      // Compress & return
      const out = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);
      resolve({ dataUrl: out, corners: detectedCorners });
    };
    img.src = dataUrl;
  });
}

// Corner Overlay
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

// Main Component
export default function DocumentScanner({ onClose, onCapture, ocrMode = false }) {
  const { settings } = useSettings();
  const autoCropEnabled = !!settings?.scan?.autoCrop;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedRaw, setCapturedRaw] = useState(null);       
  const [processedUrl, setProcessedUrl] = useState(null);     
  const [scannedPages, setScannedPages] = useState([]);      
  const [detectedCorners, setDetectedCorners] = useState(null); 
  const [adjustedCorners, setAdjustedCorners] = useState(null); 

  // Kamera
  const [zoomRange, setZoomRange] = useState([1, 1]);
  const [torchOn, setTorchOn] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 1, h: 1 });

  // Live edge detection (overlay auto-crop mengikuti tepi dokumen secara real-time)
  const [liveCorners, setLiveCorners] = useState(null);
  const liveDetectCanvasRef = useRef(null);

  // Mode
  const [step, setStep] = useState("camera"); 
  const [isProcessing, setIsProcessing] = useState(false);

  // Start kamera
  const startCamera = useCallback(async () => {
    setCameraReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const configureTrack = async (ms) => {
      const track = ms.getVideoTracks()[0];
      if (!track) return;

      const cap = track.getCapabilities?.() || {};

      if (cap.zoom) {
        const minZoom = Number(cap.zoom.min) || 1;
        const maxZoom = Number(cap.zoom.max) || 1;
        const defaultZoom = Math.min(Math.max(1, minZoom), maxZoom);
        setZoomRange([minZoom, maxZoom]);
        try {
          await track.applyConstraints({ advanced: [{ zoom: defaultZoom }] });
        } catch {}
      } else {
        setZoomRange([1, 1]);
      }

      if (Array.isArray(cap.focusMode) && cap.focusMode.includes("continuous")) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        } catch {}
      }
    };

    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      await configureTrack(ms);
      streamRef.current = ms;
      setStream(ms);
    } catch (primaryError) {
      console.warn("[Scanner] Kamera HD gagal, memakai fallback:", primaryError);

      try {
        const ms = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        await configureTrack(ms);
        streamRef.current = ms;
        setStream(ms);
      } catch {
        alert("Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan.");
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

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

  // Torch
  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch { }
  }, [stream, torchOn]);

  // Deteksi tepi dokumen secara live dari frame video (dipakai untuk overlay auto-crop real-time)
  const LIVE_DETECT_WIDTH = 240;
  const detectLiveCorners = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;

    const scale = LIVE_DETECT_WIDTH / v.videoWidth;
    const w = LIVE_DETECT_WIDTH;
    const h = Math.max(1, Math.round(v.videoHeight * scale));

    if (!liveDetectCanvasRef.current) {
      liveDetectCanvasRef.current = document.createElement("canvas");
    }
    const canvas = liveDetectCanvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(v, 0, 0, w, h);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch {
      return;
    }
    toGrayscale(imageData);
    const edgeMap = sobelEdgeMap(imageData, w, h);
    const corners = detectDocumentCorners(edgeMap, w, h);

    if (corners) {
      setLiveCorners(corners.map((c) => ({ x: (c.x / w) * 100, y: (c.y / h) * 100 })));
    } else {
      setLiveCorners(null);
    }
  }, []);

  // Jalankan deteksi tepi secara berkala selama mode kamera & Auto-crop aktif
  useEffect(() => {
    if (step !== "camera" || !cameraReady || !autoCropEnabled) {
      setLiveCorners(null);
      return;
    }
    const intervalId = setInterval(detectLiveCorners, 350);
    return () => clearInterval(intervalId);
  }, [step, cameraReady, autoCropEnabled, detectLiveCorners]);

  // Capture
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

    const { dataUrl, corners } = await processImage(rawUrl, {
      sharpen: true,
      detectCorners: autoCropEnabled,
      applyPerspective: autoCropEnabled,
    });

    setProcessedUrl(dataUrl);
    setDetectedCorners(corners);
    setAdjustedCorners(corners);
    setIsProcessing(false);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setStep("result");
  }, [autoCropEnabled]);

  const applyManualPerspective = useCallback(async () => {
    if (!capturedRaw || !adjustedCorners) return;
    setIsProcessing(true);

    const { dataUrl } = await processImage(capturedRaw, {
      sharpen: true,
      perspectiveCorners: adjustedCorners,
      applyPerspective: true,
    });

    setProcessedUrl(dataUrl);
    setIsProcessing(false);
    setStep("result");
  }, [capturedRaw, adjustedCorners]);

  const buildMultiPageFile = useCallback(async (pages) => {
    const images = await Promise.all(
      pages.map((src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      }))
    );

    const width = Math.max(...images.map((img) => img.naturalWidth || img.width));
    const heights = images.map((img) =>
      Math.round((img.naturalHeight || img.height) * (width / (img.naturalWidth || img.width)))
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = heights.reduce((sum, h) => sum + h, 0);
    const ctx = canvas.getContext("2d");

    let y = 0;
    images.forEach((img, index) => {
      ctx.drawImage(img, 0, y, width, heights[index]);
      y += heights[index];
    });

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY)
    );
    if (!blob) throw new Error("Gagal membuat file hasil scan");

    return new File(
      [blob],
      `scan-${pages.length}-halaman-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );
  }, []);

  // Scan halaman berikutnya 
  const scanAnotherPage = useCallback(() => {
    if (!processedUrl || ocrMode) return;
    setScannedPages((prev) => [...prev, processedUrl]);
    setCapturedRaw(null);
    setProcessedUrl(null);
    setDetectedCorners(null);
    setAdjustedCorners(null);
    setStep("camera");
    startCamera();
  }, [processedUrl, ocrMode, startCamera]);

  // kirim seluruh halaman ke parent
  const handleDone = useCallback(async () => {
    if (!processedUrl) return;
    setIsProcessing(true);
    try {
      const pages = ocrMode ? [processedUrl] : [...scannedPages, processedUrl];
      const file = await buildMultiPageFile(pages);
      onCapture(file, pages);
    } finally {
      setIsProcessing(false);
    }
  }, [processedUrl, scannedPages, ocrMode, buildMultiPageFile, onCapture]);

  const retake = useCallback(() => {
    setCapturedRaw(null);
    setProcessedUrl(null);
    setDetectedCorners(null);
    setAdjustedCorners(null);
    setStep("camera");
    startCamera();
  }, [startCamera]);

  const updateCorner = (index, pos) => {
    if (!adjustedCorners) return;
    const next = [...adjustedCorners];
    next[index] = { x: pos.x / 100 * videoSize.w, y: pos.y / 100 * videoSize.h };
    setAdjustedCorners(next);
  };

  // RENDER
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Header */}
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
            onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; onClose(); }}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
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

            {cameraReady && autoCropEnabled && (
              <div className="absolute inset-0 pointer-events-none">
                {liveCorners ? (
                  // Garis kuning mengikuti tepi dokumen yang terdeteksi secara real-time
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={liveCorners.map((c) => `${c.x},${c.y}`).join(" ")}
                      fill="rgba(250,204,21,0.12)"
                      stroke="#facc15"
                      strokeWidth="0.6"
                      vectorEffect="non-scaling-stroke"
                    />
                    {liveCorners.map((c, i) => (
                      <circle key={i} cx={c.x} cy={c.y} r="1.4" fill="#facc15" vectorEffect="non-scaling-stroke" />
                    ))}
                  </svg>
                ) : (
                  // Belum ada tepi terdeteksi: tampilkan guide sementara sampai dokumen terdeteksi
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4/5 h-3/4 relative">
                      {[
                        "top-0 left-0 border-t-2 border-l-2 rounded-tl-sm",
                        "top-0 right-0 border-t-2 border-r-2 rounded-tr-sm",
                        "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm",
                        "bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm",
                      ].map((cls, i) => (
                        <div key={i} className={`absolute border-yellow-400 w-6 h-6 ${cls}`} />
                      ))}
                      <div className="absolute inset-0 border border-dashed border-yellow-400/30 rounded" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border border-yellow-400/50 rounded flex items-center justify-center">
                          <Focus size={16} className="text-yellow-400/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {step === "adjust" && capturedRaw && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative" style={{ maxWidth: "100%", maxHeight: "100%" }}>
              <img
                src={capturedRaw}
                alt="Sesuaikan"
                className="block max-w-full max-h-[calc(100vh-200px)] object-contain"
                draggable={false}
              />
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

        {isProcessing && step === "camera" && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">Memproses gambar...</span>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/90 px-4 py-4 shrink-0">
        {step === "camera" && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={toggleTorch}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${torchOn ? "bg-yellow-500 text-black" : "bg-white/10 text-white"}`}
              title={torchOn ? "Matikan Flash" : "Nyalakan Flash"}
            >
              {torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>

            {/* Capture button */}
            <button
              onClick={capture}
              disabled={!cameraReady || isProcessing}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-500 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Spacer agar tombol shutter tetap center (simetris dengan tombol flash) */}
            <div className="w-11 h-11" aria-hidden="true" />
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
                  processImage(capturedRaw, { sharpen: true, applyPerspective: false })
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
              {autoCropEnabled && detectedCorners && (
                <span className="flex items-center gap-1">
                  <Scan size={12} className="text-blue-400" /> Deteksi otomatis berhasil
                </span>
              )}
              {autoCropEnabled && !detectedCorners && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle size={12} /> Sesuaikan manual
                </span>
              )}
            </div>
            {!ocrMode && scannedPages.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-xs text-blue-300">
                <Images size={14} />
                <span>{scannedPages.length} halaman sudah tersimpan</span>
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={retake}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <RotateCw size={16} /> {ocrMode ? "Ambil Ulang" : "Foto Ulang"}
              </button>
              {autoCropEnabled && (
                <button
                  onClick={() => setStep("adjust")}
                  className="py-3 px-4 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  title="Sesuaikan perspektif"
                >
                  <Maximize2 size={16} />
                </button>
              )}
              {!ocrMode && (
                <button
                  onClick={scanAnotherPage}
                  disabled={isProcessing}
                  className="flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <Plus size={16} /> Scan Halaman Lagi
                </button>
              )}
              <button
                onClick={handleDone}
                disabled={isProcessing}
                className="flex-[2] min-w-[170px] flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {ocrMode ? (
                  <><Scan size={16} /> Scan OCR</>
                ) : (
                  <><Check size={16} /> Gunakan {scannedPages.length + 1} Halaman</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}