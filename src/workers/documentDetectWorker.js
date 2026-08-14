/* eslint-disable no-restricted-globals */
// Worker deteksi tepi dokumen (OpenCV.js) — dijalankan DI LUAR main thread
// supaya kompilasi WASM & pemrosesan gambar tidak pernah membekukan UI kamera
// (tombol X / flash / shutter tetap responsif selama proses ini berjalan).

const OPENCV_JS_URL = "https://docs.opencv.org/4.9.0/opencv.js";

let cvReadyPromise = null;

function loadOpenCVInWorker() {
  if (self.cv && self.cv.Mat) return Promise.resolve(self.cv);
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = new Promise((resolve, reject) => {
    try {
      self.importScripts(OPENCV_JS_URL);
    } catch (err) {
      reject(err);
      return;
    }
    if (self.cv && self.cv.Mat) {
      resolve(self.cv);
    } else if (self.cv) {
      self.cv["onRuntimeInitialized"] = () => resolve(self.cv);
    } else {
      reject(new Error("OpenCV.js gagal dimuat di worker"));
    }
  });

  return cvReadyPromise;
}

// Urutkan 4 titik hasil approxPolyDP menjadi [top-left, top-right, bottom-right, bottom-left]
function orderCorners(pts) {
  const sums = pts.map((p) => p.x + p.y);
  const diffs = pts.map((p) => p.x - p.y);
  const tl = pts[sums.indexOf(Math.min(...sums))];
  const br = pts[sums.indexOf(Math.max(...sums))];
  const tr = pts[diffs.indexOf(Math.max(...diffs))];
  const bl = pts[diffs.indexOf(Math.min(...diffs))];
  return [tl, tr, br, bl];
}

// Deteksi 4 sudut dokumen dari data piksel RGBA memakai OpenCV.js
// (Canny edge detection + findContours + approxPolyDP)
function detectCorners(cv, width, height, rgbaData) {
  const src = new cv.Mat(height, width, cv.CV_8UC4);
  src.data.set(rgbaData);

  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edged = new cv.Mat();
  const dilated = new cv.Mat();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let best = null;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edged, 50, 150);
    cv.dilate(edged, dilated, kernel);
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = width * height;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > bestArea && area > imgArea * 0.15) {
          bestArea = area;
          if (best) best.delete();
          best = approx.clone();
        }
      }
      approx.delete();
      cnt.delete();
    }

    if (!best) return null;

    const pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: best.data32S[i * 2], y: best.data32S[i * 2 + 1] });
    }
    return orderCorners(pts);
  } finally {
    src.delete(); gray.delete(); blurred.delete(); edged.delete(); dilated.delete();
    kernel.delete(); contours.delete(); hierarchy.delete();
    if (best) best.delete();
  }
}

// Beritahu main thread begitu OpenCV.js siap (dipakai untuk indikator "Memuat mesin deteksi...")
loadOpenCVInWorker()
  .then(() => self.postMessage({ type: "ready" }))
  .catch((err) => self.postMessage({ type: "error", error: String((err && err.message) || err) }));

self.onmessage = (e) => {
  const { id, width, height, buffer } = e.data;
  loadOpenCVInWorker()
    .then((cv) => {
      const rgbaData = new Uint8ClampedArray(buffer);
      const corners = detectCorners(cv, width, height, rgbaData);
      self.postMessage({ id, corners });
    })
    .catch((err) => {
      self.postMessage({ id, corners: null, error: String((err && err.message) || err) });
    });
};