import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Camera, X, ZoomIn, ZoomOut, Scan,
  RotateCw, Check, ChevronRight, AlertTriangle,
  Maximize2, Zap, ZapOff,
} from "lucide-react";

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

function applyBrightnessContrast(ctx, w, h, brightness, contrast) {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      v += brightness;
      v = factor * (v - 128) + 128;
      d[i + c] = Math.max(0, Math.min(255, v));
    }
  }
  ctx.putImageData(imgData, 0, 0);
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
      const w = canvas.width;
      const h = canvas.height;
      const pCtx = canvas.getContext("2d");

      let detectedCorners = opts.perspectiveCorners || null;

      if (!detectedCorners) {
        const DETECT_MAX = 960;
        const detectScale = Math.min(1, DETECT_MAX / Math.max(w, h));

        const detectCanvas = document.createElement("canvas");
        detectCanvas.width = Math.max(1, Math.round(w * detectScale));
        detectCanvas.height = Math.max(1, Math.round(h * detectScale));

        detectCanvas
          .getContext("2d")
          .drawImage(canvas, 0, 0, detectCanvas.width, detectCanvas.height);

        const detectCtx = detectCanvas.getContext("2d", {
          willReadFrequently: true,
        });

        const grayData = detectCtx.getImageData(
          0,
          0,
          detectCanvas.width,
          detectCanvas.height
        );

        toGrayscale(grayData);

        const edgeMap = sobelEdgeMap(
          grayData,
          detectCanvas.width,
          detectCanvas.height
        );

        const smallCorners = detectDocumentCorners(
          edgeMap,
          detectCanvas.width,
          detectCanvas.height
        );

        if (smallCorners) {
          detectedCorners = smallCorners.map((p) => ({
            x: p.x / detectScale,
            y: p.y / detectScale,
          }));
        }
      }

      if (detectedCorners && opts.applyPerspective !== false) {
        try {
          canvas = perspectiveCorrect(canvas, detectedCorners);

          detectedCorners = null;
        } catch (error) {
          console.warn("[Scanner] Perspective correction skipped:", error);
        }
      }

      const finalCtx = canvas.getContext("2d");

      const brightness = opts.brightness ?? 0;
      const contrast = opts.contrast ?? 0;

      if (brightness !== 0 || contrast !== 0) {
        applyBrightnessContrast(
          finalCtx,
          canvas.width,
          canvas.height,
          brightness,
          contrast
        );
      }

      if (opts.sharpen) {
        applySharpen(finalCtx, canvas.width, canvas.height);
      }

      const out = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);

      resolve({
        dataUrl: out,
        corners: detectedCorners,
      });
    };

    img.onerror = () => {
      resolve({
        dataUrl,
        corners: null,
      });
    };

    img.src = dataUrl;
  });
}

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

export default function DocumentScanner({ onClose, onCapture, ocrMode = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedRaw, setCapturedRaw] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [detectedCorners, setDetectedCorners] = useState(null);
  const [adjustedCorners, setAdjustedCorners] = useState(null);

  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState([1, 1]);
  const [torchOn, setTorchOn] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 1, h: 1 });

  const [step, setStep] = useState("camera");
  const [isProcessing, setIsProcessing] = useState(false);

  const [brightness, setBrightness] = useState(10);
  const [contrast, setContrast] = useState(15);
  const [sharpen, setSharpen] = useState(true);
  const [autoPerspective, setAutoPerspective] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: "continuous",
          advanced: [{ focusMode: "continuous-picture" }],
        },
        audio: false,
      });
      setStream(ms);

      const track = ms.getVideoTracks()[0];
      if (track) {
        const cap = track.getCapabilities?.() || {};
        if (cap.zoom) setZoomRange([cap.zoom.min, cap.zoom.max]);
      }
    } catch {
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

  const applyZoom = useCallback(
    async (val) => {
      setZoom(val);
      const track = stream?.getVideoTracks()[0];
      if (!track) return;
      try {
        await track.applyConstraints({ advanced: [{ zoom: val }] });
      } catch {}
    },
    [stream]
  );

  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch {}
  }, [stream, torchOn]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    const v = videoRef.current;
    const c = canvasRef.current;

    c.width = v.videoWidth;
    c.height = v.videoHeight;

    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0);

    const rawUrl = c.toDataURL("image/jpeg", 0.95);
    setCapturedRaw(rawUrl);

    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraReady(false);

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
    setStep("result");
  }, [brightness, contrast, sharpen, autoPerspective, stream]);

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

  const handleDone = useCallback(() => {
    if (!processedUrl) return;
    const byteString = atob(processedUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: "image/jpeg" });
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file, processedUrl);
  }, [processedUrl, onCapture]);

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

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
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
            onClick={() => { stream?.getTracks().forEach((t) => t.stop()); onClose(); }}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

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

      <div className="bg-black/90 px-4 py-4 shrink-0">
        {step === "camera" && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={toggleTorch}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${torchOn ? "bg-white/20 text-white" : "bg-white/10 text-white"}`}
              title="Lampu Flash"
            >
              {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </button>

            <button
              onClick={capture}
              disabled={!cameraReady || isProcessing}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-500 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            <div className="w-11 h-11" aria-hidden="true" />
          </div>
        )}

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