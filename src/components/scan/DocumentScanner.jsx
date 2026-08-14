import { useState, useRef, useCallback, useEffect } from "react";
import {
  X, Scan, RotateCw, Check, ChevronRight, AlertTriangle,
  Focus, Maximize2, Plus, Images, Zap, ZapOff,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const COMPRESS_QUALITY = 0.88;
const MAX_SCAN_WIDTH = 2048;
const OPENCV_URL = "https://docs.opencv.org/4.x/opencv.js";

function resizeCanvas(src, maxW = MAX_SCAN_WIDTH) {
  const scale = src.width > maxW ? maxW / src.width : 1;
  if (scale === 1) return src;

  const dst = document.createElement("canvas");
  dst.width = Math.round(src.width * scale);
  dst.height = Math.round(src.height * scale);
  dst.getContext("2d").drawImage(src, 0, 0, dst.width, dst.height);
  return dst;
}

function loadOpenCV() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.cv?.Mat) return Promise.resolve(window.cv);

  if (window.__sakuraOpenCVPromise) return window.__sakuraOpenCVPromise;

  window.__sakuraOpenCVPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-sakura-opencv="true"]');

    const finish = () => {
      const cv = window.cv;
      if (cv?.Mat) resolve(cv);
      else reject(new Error("OpenCV.js loaded but cv is unavailable"));
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("OpenCV.js failed to load")), { once: true });
      const timer = setInterval(() => {
        if (window.cv?.Mat) {
          clearInterval(timer);
          finish();
        }
      }, 100);
      setTimeout(() => clearInterval(timer), 15000);
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.dataset.sakuraOpencv = "true";
    script.onload = () => {
      const started = Date.now();
      const wait = () => {
        if (window.cv?.Mat) {
          resolve(window.cv);
          return;
        }
        if (Date.now() - started > 15000) {
          reject(new Error("OpenCV runtime initialization timeout"));
          return;
        }
        setTimeout(wait, 50);
      };
      wait();
    };
    script.onerror = () => reject(new Error("OpenCV.js failed to load"));
    document.head.appendChild(script);
  });

  return window.__sakuraOpenCVPromise;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function orderCorners(points) {
  const sorted = [...points];
  const sum = p => p.x + p.y;
  const diff = p => p.x - p.y;

  const tl = sorted.reduce((a, b) => sum(a) < sum(b) ? a : b);
  const br = sorted.reduce((a, b) => sum(a) > sum(b) ? a : b);
  const tr = sorted.reduce((a, b) => diff(a) > diff(b) ? a : b);
  const bl = sorted.reduce((a, b) => diff(a) < diff(b) ? a : b);

  return [tl, tr, br, bl];
}

function angleCosine(a, b, c) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  return den ? Math.abs(dot / den) : 1;
}

/*
 * Detects the largest strong quadrilateral in the camera frame.
 * This replaces the old "strongest edge in each quadrant" approach.
 *
 * OpenCV:
 *   grayscale -> blur -> Canny -> close -> contours
 *   contours -> polygon approximation -> 4 corners
 *
 * A candidate is accepted only when:
 * - it has exactly 4 corners
 * - it is convex
 * - it occupies enough of the frame
 * - its angles are reasonably rectangular
 */
function detectDocumentCornersOpenCV(cv, canvas) {
  if (!cv?.Mat || !canvas?.width || !canvas?.height) return null;

  let src;
  let gray;
  let blurred;
  let edges;
  let kernel;
  let closed;
  let contours;
  let hierarchy;

  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    src = cv.matFromImageData(imageData);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    edges = new cv.Mat();
    kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    closed = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 45, 140);
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);

    cv.findContours(
      closed,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    const frameArea = canvas.width * canvas.height;
    const candidates = [];

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      let approx;

      try {
        const perimeter = cv.arcLength(contour, true);
        if (perimeter < Math.min(canvas.width, canvas.height) * 0.7) continue;

        approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, Math.max(2, perimeter * 0.018), true);

        if (approx.rows !== 4 || !cv.isContourConvex(approx)) continue;

        const points = [];
        for (let j = 0; j < 4; j++) {
          points.push({
            x: Number(approx.intPtr(j, 0)[0]),
            y: Number(approx.intPtr(j, 0)[1]),
          });
        }

        const area = polygonArea(points);
        const areaRatio = area / frameArea;
        if (areaRatio < 0.16 || areaRatio > 0.98) continue;

        const ordered = orderCorners(points);

        const cosines = ordered.map((_, idx) => {
          const prev = ordered[(idx + 3) % 4];
          const cur = ordered[idx];
          const next = ordered[(idx + 1) % 4];
          return angleCosine(prev, cur, next);
        });

        const maxCos = Math.max(...cosines);

        // Allows perspective, but rejects very sharp/irregular polygons.
        if (maxCos > 0.48) continue;

        const w1 = distance(ordered[0], ordered[1]);
        const w2 = distance(ordered[3], ordered[2]);
        const h1 = distance(ordered[0], ordered[3]);
        const h2 = distance(ordered[1], ordered[2]);

        const avgW = (w1 + w2) / 2;
        const avgH = (h1 + h2) / 2;
        if (avgW < canvas.width * 0.25 || avgH < canvas.height * 0.20) continue;

        const rectangularity = Math.min(avgW / avgH, avgH / avgW);
        const score =
          areaRatio * 10 +
          (1 - maxCos) * 2 +
          rectangularity * 0.25;

        candidates.push({ points: ordered, score, area });
      } finally {
        contour.delete();
        approx?.delete();
      }
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (Math.abs(b.area - a.area) > frameArea * 0.025) {
        return b.area - a.area;
      }
      return b.score - a.score;
    });

    return candidates[0].points;
  } catch (error) {
    console.warn("[Scanner] OpenCV detection failed:", error);
    return null;
  } finally {
    src?.delete();
    gray?.delete();
    blurred?.delete();
    edges?.delete();
    kernel?.delete();
    closed?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
}

function scaleCorners(corners, fromW, fromH, toW, toH) {
  if (!corners || corners.length !== 4) return null;
  return corners.map(c => ({
    x: c.x * (toW / fromW),
    y: c.y * (toH / fromH),
  }));
}

/*
 * Proper perspective transform.
 * Unlike the previous bilinear interpolation, this uses a real
 * projective transform so slanted documents are straightened correctly.
 */
function perspectiveCorrect(srcCanvas, corners) {
  if (!corners || corners.length !== 4) return srcCanvas;

  const cv = window.cv;
  if (!cv?.Mat) return srcCanvas;

  const [tl, tr, br, bl] = corners;

  const outW = Math.max(
    1,
    Math.round(Math.max(distance(tl, tr), distance(bl, br)))
  );
  const outH = Math.max(
    1,
    Math.round(Math.max(distance(tl, bl), distance(tr, br)))
  );

  let src;
  let srcPts;
  let dstPts;
  let matrix;
  let dst;

  try {
    const ctx = srcCanvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

    src = cv.matFromImageData(imageData);

    srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y,
      tr.x, tr.y,
      br.x, br.y,
      bl.x, bl.y,
    ]);

    dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      outW - 1, 0,
      outW - 1, outH - 1,
      0, outH - 1,
    ]);

    matrix = cv.getPerspectiveTransform(srcPts, dstPts);
    dst = new cv.Mat();

    cv.warpPerspective(
      src,
      dst,
      matrix,
      new cv.Size(outW, outH),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE
    );

    const output = document.createElement("canvas");
    output.width = outW;
    output.height = outH;
    cv.imshow(output, dst);
    return output;
  } catch (error) {
    console.warn("[Scanner] Perspective transform failed:", error);
    return srcCanvas;
  } finally {
    src?.delete();
    srcPts?.delete();
    dstPts?.delete();
    matrix?.delete();
    dst?.delete();
  }
}

function applySharpen(ctx, w, h) {
  if (w < 3 || h < 3) return;

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

async function processImage(dataUrl, opts = {}) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);

      const originalW = canvas.width;
      const originalH = canvas.height;

      let corners = opts.perspectiveCorners || null;

      canvas = resizeCanvas(canvas);

      if (corners) {
        corners = scaleCorners(
          corners,
          originalW,
          originalH,
          canvas.width,
          canvas.height
        );
      }

      if (!corners && opts.detectCorners && window.cv?.Mat) {
        corners = detectDocumentCornersOpenCV(window.cv, canvas);
      }

      if (corners && opts.applyPerspective !== false) {
        canvas = perspectiveCorrect(canvas, corners);
      }

      const finalCtx = canvas.getContext("2d");

      if (opts.sharpen) {
        applySharpen(finalCtx, canvas.width, canvas.height);
      }

      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", COMPRESS_QUALITY),
        corners,
      });
    };

    img.onerror = () => {
      resolve({ dataUrl, corners: null });
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
      const point = me.touches?.[0] || me;
      const rect = container.getBoundingClientRect();

      onChange({
        x: Math.max(0, Math.min(100, ((point.clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((point.clientY - rect.top) / rect.height) * 100)),
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

function PerspectiveOverlay({ corners, color = "#facc15", fill = "rgba(250,204,21,0.10)", dashed = false }) {
  if (!corners || corners.length !== 4) return null;

  const pts = corners
    .map(c => `${c.x}%,${c.y}%`)
    .join(" ");

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 25,
      }}
    >
      <polygon
        points={pts}
        fill={fill}
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "6,4" : undefined}
      />
    </svg>
  );
}

function mapVideoCornersToDisplayPercent(corners, videoEl) {
  if (!videoEl || !corners?.length) return null;

  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const dw = videoEl.clientWidth;
  const dh = videoEl.clientHeight;

  if (!vw || !vh || !dw || !dh) return null;

  // Must match object-cover exactly.
  const scale = Math.max(dw / vw, dh / vh);
  const renderedW = vw * scale;
  const renderedH = vh * scale;
  const offsetX = (dw - renderedW) / 2;
  const offsetY = (dh - renderedH) / 2;

  return corners.map(c => ({
    x: ((offsetX + c.x * scale) / dw) * 100,
    y: ((offsetY + c.y * scale) / dh) * 100,
  }));
}

export default function DocumentScanner({ onClose, onCapture, ocrMode = false }) {
  const { settings } = useSettings();
  const autoCropEnabled = !!settings?.scan?.autoCrop;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const liveNativeCornersRef = useRef(null);
  const liveDetectBusyRef = useRef(false);
  const lastDetectionTimeRef = useRef(0);
  const animationRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedRaw, setCapturedRaw] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [scannedPages, setScannedPages] = useState([]);
  const [detectedCorners, setDetectedCorners] = useState(null);
  const [adjustedCorners, setAdjustedCorners] = useState(null);
  const [liveCorners, setLiveCorners] = useState(null);
  const [cvReady, setCvReady] = useState(false);

  const [zoomRange, setZoomRange] = useState([1, 1]);
  const [torchOn, setTorchOn] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 1, h: 1 });
  const [step, setStep] = useState("camera");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load OpenCV only for this scanner component.
  useEffect(() => {
    if (!autoCropEnabled) return;

    let cancelled = false;

    loadOpenCV()
      .then(() => {
        if (!cancelled) setCvReady(true);
      })
      .catch((error) => {
        console.warn("[Scanner] OpenCV unavailable:", error);
        if (!cancelled) setCvReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoCropEnabled]);

  const startCamera = useCallback(async () => {
    setCameraReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
          await track.applyConstraints({
            advanced: [{ zoom: defaultZoom }],
          });
        } catch {}
      } else {
        setZoomRange([1, 1]);
      }

      if (Array.isArray(cap.focusMode) && cap.focusMode.includes("continuous")) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          });
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
      console.warn("[Scanner] HD camera failed:", primaryError);

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
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {});

    const onMetadata = () => {
      setCameraReady(true);
      setVideoSize({
        w: video.videoWidth || 1,
        h: video.videoHeight || 1,
      });
    };

    video.addEventListener("loadedmetadata", onMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", onMetadata);
    };
  }, [stream]);

  /*
   * Live detector.
   * - 640px working image so mobile devices stay responsive.
   * - Runs about 4 times/sec, not 1 detection every 700ms.
   * - Keeps the previous valid polygon briefly when one frame fails.
   * - NO corner dots are rendered.
   */
  useEffect(() => {
    if (
      step !== "camera" ||
      !cameraReady ||
      !autoCropEnabled ||
      !cvReady
    ) {
      cancelAnimationFrame(animationRef.current);
      liveNativeCornersRef.current = null;
      setLiveCorners(null);
      return;
    }

    let cancelled = false;

    const detectLoop = (timestamp) => {
      if (cancelled) return;

      animationRef.current = requestAnimationFrame(detectLoop);

      if (timestamp - lastDetectionTimeRef.current < 250) return;
      if (liveDetectBusyRef.current) return;

      const video = videoRef.current;
      if (!video?.videoWidth || !video?.videoHeight) return;

      lastDetectionTimeRef.current = timestamp;
      liveDetectBusyRef.current = true;

      try {
        if (!previewCanvasRef.current) {
          previewCanvasRef.current = document.createElement("canvas");
        }

        const canvas = previewCanvasRef.current;
        const workW = 640;
        const scale = workW / video.videoWidth;
        const workH = Math.max(1, Math.round(video.videoHeight * scale));

        canvas.width = workW;
        canvas.height = workH;

        const ctx = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        ctx.drawImage(video, 0, 0, workW, workH);

        const corners = detectDocumentCornersOpenCV(
          window.cv,
          canvas
        );

        if (corners) {
          const nativeCorners = corners.map(c => ({
            x: c.x / scale,
            y: c.y / scale,
          }));

          liveNativeCornersRef.current = nativeCorners;

          const mapped = mapVideoCornersToDisplayPercent(
            nativeCorners,
            video
          );

          if (!cancelled) setLiveCorners(mapped);
        }
      } catch (error) {
        console.warn("[Scanner] Live detection:", error);
      } finally {
        liveDetectBusyRef.current = false;
      }
    };

    animationRef.current = requestAnimationFrame(detectLoop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationRef.current);
      liveNativeCornersRef.current = null;
    };
  }, [step, cameraReady, autoCropEnabled, cvReady]);

  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;

    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(v => !v);
    } catch {}
  }, [stream, torchOn]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const rawUrl = canvas.toDataURL("image/jpeg", 0.96);
    setCapturedRaw(rawUrl);

    // Use exactly the same corners that the user was seeing on screen.
    // If detection was lost on the last frame, do one final detection.
    let captureCorners = liveNativeCornersRef.current;

    if (!captureCorners && autoCropEnabled && cvReady) {
      const work = document.createElement("canvas");
      const workW = 960;
      const scale = workW / video.videoWidth;
      work.width = workW;
      work.height = Math.round(video.videoHeight * scale);

      work.getContext("2d").drawImage(
        video,
        0,
        0,
        work.width,
        work.height
      );

      const finalDetected = detectDocumentCornersOpenCV(
        window.cv,
        work
      );

      if (finalDetected) {
        captureCorners = finalDetected.map(c => ({
          x: c.x / scale,
          y: c.y / scale,
        }));
      }
    }

    const { dataUrl, corners } = await processImage(rawUrl, {
      sharpen: false,
      perspectiveCorners: autoCropEnabled ? captureCorners : null,
      detectCorners: autoCropEnabled && !captureCorners,
      applyPerspective: autoCropEnabled,
    });

    setProcessedUrl(dataUrl);
    setDetectedCorners(corners);
    setAdjustedCorners(corners);
    setIsProcessing(false);

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setLiveCorners(null);
    setStep("result");
  }, [autoCropEnabled, cvReady]);

  const applyManualPerspective = useCallback(async () => {
    if (!capturedRaw || !adjustedCorners) return;

    setIsProcessing(true);

    const { dataUrl } = await processImage(capturedRaw, {
      sharpen: false,
      perspectiveCorners: adjustedCorners,
      applyPerspective: true,
    });

    setProcessedUrl(dataUrl);
    setIsProcessing(false);
    setStep("result");
  }, [capturedRaw, adjustedCorners]);

  const buildMultiPageFile = useCallback(async (pages) => {
    const images = await Promise.all(
      pages.map(src =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        })
      )
    );

    const width = Math.max(
      ...images.map(img => img.naturalWidth || img.width)
    );

    const heights = images.map(img =>
      Math.round(
        (img.naturalHeight || img.height) *
        (width / (img.naturalWidth || img.width))
      )
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

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY)
    );

    if (!blob) throw new Error("Gagal membuat file hasil scan");

    return new File(
      [blob],
      `scan-${pages.length}-halaman-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );
  }, []);

  const scanAnotherPage = useCallback(() => {
    if (!processedUrl || ocrMode) return;

    setScannedPages(prev => [...prev, processedUrl]);
    setCapturedRaw(null);
    setProcessedUrl(null);
    setDetectedCorners(null);
    setAdjustedCorners(null);
    setLiveCorners(null);
    liveNativeCornersRef.current = null;
    setStep("camera");
    startCamera();
  }, [processedUrl, ocrMode, startCamera]);

  const handleDone = useCallback(async () => {
    if (!processedUrl) return;

    setIsProcessing(true);

    try {
      const pages = ocrMode
        ? [processedUrl]
        : [...scannedPages, processedUrl];

      const file = await buildMultiPageFile(pages);
      onCapture(file, pages);
    } finally {
      setIsProcessing(false);
    }
  }, [
    processedUrl,
    scannedPages,
    ocrMode,
    buildMultiPageFile,
    onCapture,
  ]);

  const retake = useCallback(() => {
    setCapturedRaw(null);
    setProcessedUrl(null);
    setDetectedCorners(null);
    setAdjustedCorners(null);
    setLiveCorners(null);
    liveNativeCornersRef.current = null;
    setStep("camera");
    startCamera();
  }, [startCamera]);

  const updateCorner = (index, pos) => {
    if (!adjustedCorners) return;

    const next = [...adjustedCorners];

    next[index] = {
      x: (pos.x / 100) * videoSize.w,
      y: (pos.y / 100) * videoSize.h,
    };

    setAdjustedCorners(next);
  };

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

        <button
          onClick={() => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            onClose();
          }}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
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
              style={{
                display: cameraReady ? "block" : "none",
              }}
            />

            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">
                  Memulai kamera...
                </span>
              </div>
            )}

            {/* REAL document border — no corner dots */}
            {cameraReady && autoCropEnabled && liveCorners && (
              <PerspectiveOverlay
                corners={liveCorners}
                color="#facc15"
                fill="rgba(250,204,21,0.08)"
              />
            )}

            {/* Neutral guide only when no document has been detected.
                It does NOT pretend to be the document. */}
            {cameraReady && autoCropEnabled && !liveCorners && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[82%] h-[72%] relative">
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md",
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={`absolute border-yellow-400 w-7 h-7 ${cls}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === "adjust" && capturedRaw && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className="relative"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              <img
                src={capturedRaw}
                alt="Sesuaikan"
                className="block max-w-full max-h-[calc(100vh-200px)] object-contain"
                draggable={false}
              />

              {adjustedCorners?.map((c, i) => (
                <CornerHandle
                  key={i}
                  label={["TL", "TR", "BR", "BL"][i]}
                  xPct={(c.x / videoSize.w) * 100}
                  yPct={(c.y / videoSize.h) * 100}
                  onChange={pos => updateCorner(i, pos)}
                />
              ))}

              {adjustedCorners && (
                <PerspectiveOverlay
                  corners={adjustedCorners.map(c => ({
                    x: (c.x / videoSize.w) * 100,
                    y: (c.y / videoSize.h) * 100,
                  }))}
                  color="#3b82f6"
                  fill="rgba(59,130,246,0.10)"
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
              style={{
                opacity: isProcessing ? 0.4 : 1,
              }}
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
            <span className="text-white text-sm">
              Memproses gambar...
            </span>
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
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                torchOn
                  ? "bg-yellow-500 text-black"
                  : "bg-white/10 text-white"
              }`}
              title={torchOn ? "Matikan Flash" : "Nyalakan Flash"}
            >
              {torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>

            <button
              onClick={capture}
              disabled={!cameraReady || isProcessing}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-500 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            <div
              className="w-11 h-11"
              aria-hidden="true"
            />
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
                <RotateCw size={16} />
                Foto Ulang
              </button>

              <button
                onClick={() => {
                  processImage(capturedRaw, {
                    sharpen: false,
                    applyPerspective: false,
                  }).then(({ dataUrl }) => {
                    setProcessedUrl(dataUrl);
                    setStep("result");
                  });
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
                <ChevronRight size={16} />
                Terapkan
              </button>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-3">

            <div className="flex items-center justify-between text-xs text-gray-400 px-1">

              <span className="flex items-center gap-1">
                <Check size={12} className="text-green-400" />
                Siap digunakan
              </span>

              {autoCropEnabled && detectedCorners && (
                <span className="flex items-center gap-1">
                  <Scan size={12} className="text-blue-400" />
                  Deteksi otomatis berhasil
                </span>
              )}

              {autoCropEnabled && !detectedCorners && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle size={12} />
                  Sesuaikan manual
                </span>
              )}
            </div>

            {!ocrMode && scannedPages.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-xs text-blue-300">
                <Images size={14} />
                <span>
                  {scannedPages.length} halaman sudah tersimpan
                </span>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">

              <button
                onClick={retake}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <RotateCw size={16} />
                {ocrMode ? "Ambil Ulang" : "Foto Ulang"}
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
                  <Plus size={16} />
                  Scan Halaman Lagi
                </button>
              )}

              <button
                onClick={handleDone}
                disabled={isProcessing}
                className="flex-[2] min-w-[170px] flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {ocrMode ? (
                  <>
                    <Scan size={16} />
                    Scan OCR
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Gunakan {scannedPages.length + 1} Halaman
                  </>
                )}
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}