/**
 * ocrService.js
 * OCR menggunakan Tesseract.js â€” library paling stabil untuk OCR di browser.
 * Load via dynamic import agar tidak mempengaruhi bundle size.
 *
 * Tesseract.js v5 (latest stable): https://github.com/naptha/tesseract.js
 * CDN: https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
 *
 * Cara kerja:
 * 1. Worker di-inisialisasi sekali (singleton).
 * 2. Recognize dari dataUrl atau File.
 * 3. Kembalikan teks mentah + confidence.
 */

let worker = null;
let workerLoading = false;
let workerReady = false;

/**
 * Muat Tesseract.js secara dinamis (lazy load).
 * Menggunakan versi CDN agar tidak perlu install npm package.
 */
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Gagal memuat Tesseract.js"));
    document.head.appendChild(script);
  });
}

/**
 * Inisialisasi worker (satu kali).
 * @param {function} onProgress - callback progress (0â€“1)
 */
export async function initOCR(onProgress) {
  if (workerReady) return worker;
  if (workerLoading) {
    // Tunggu sampai selesai
    while (workerLoading) await new Promise((r) => setTimeout(r, 100));
    return worker;
  }

  workerLoading = true;
  try {
    const Tesseract = await loadTesseract();

    worker = await Tesseract.createWorker("ind+eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(m.progress);
        }
      },
      // WASM path â€” Tesseract.js akan fetch dari CDN secara otomatis
    });

    workerReady = true;
  } catch (err) {
    workerLoading = false;
    throw err;
  }
  workerLoading = false;
  return worker;
}

/**
 * Jalankan OCR pada gambar.
 * @param {string|File|Blob} image - bisa berupa dataUrl, File, atau Blob
 * @param {function} onProgress - callback (0â€“1)
 * @returns {Promise<{text: string, confidence: number, words: Array}>}
 */
export async function recognizeImage(image, onProgress) {
  const w = await initOCR(onProgress);
  const result = await w.recognize(image);
  return {
    text: result.data.text || "",
    confidence: result.data.confidence || 0,
    words: result.data.words || [],
    lines: result.data.lines || [],
  };
}

export function getOCRTemplateByType(typeId, typeName) {
  const normalized = (typeName || "").toString().toLowerCase();

  if (typeId === 4 || /\bijazah\b/.test(normalized)) return "ijazah";
  if (
    typeId === 3 ||
    /\bskl\b/.test(normalized) ||
    /\bskhu\b/.test(normalized) ||
    /surat\s*keterangan\s*(?:lulus|hasil\s*ujian)/i.test(normalized)
  ) {
    return "skl";
  }
  if (typeId === 6 || /\bsertifikat\b/.test(normalized)) return "sertifikat";
  if (/\btranskrip\b/.test(normalized) || /rekap\s*nilai/i.test(normalized)) return "transkrip";

  return null;
}

/**
 * Terminate worker (opsional, panggil saat komponen di-unmount).
 */
export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
    workerReady = false;
  }
}

/**
 * Parse teks OCR dan ekstrak field-field umum dokumen sekolah.
 * Ini adalah heuristic parser â€” confidence bervariasi tergantung kualitas scan.
 *
 * @param {string} rawText - hasil OCR
 * @returns {object} field yang terdeteksi
 */
export function parseDocumentFields(rawText, templateKey) {
  const normalizedText = rawText.replace(/\r\n/g, "\n").trim();
  const text = normalizedText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  const lines = normalizedText.split(/\n/).map((l) => l.trim()).filter(Boolean);

  if (!templateKey) return {};
  const fields = {};

  const extract = (pattern) => {
    const m = normalizedText.match(pattern) || text.match(pattern);
    return m ? m[1].trim() : "";
  };

  const setCommonSchoolFields = () => {
    fields.namaSiswa =
      extract(/nama\s*(?:siswa|lengkap)?[\s:]*([A-Za-z\s]{3,80}?)(?=\s*(?:NIS|NISN|TTL|Kelas|Tahun|$))/i) ||
      extract(/nama[\s:]+([A-Za-z\s]{3,80})/i);
    fields.nis = extract(/NIS[\s:]+(\d{4,12})/i);
    fields.nisn = extract(/NISN[\s:]+(\d{6,12})/i);
    fields.kelas = extract(/kelas[\s:]+([0-9A-Za-z\s/-]{1,15})/i);
    fields.tahunAjaran = extract(/tahun\s*ajaran[\s:]+(\d{4}[/\\-]\d{4})/i) ||
      extract(/semester[\s:]+(\d{4}[/\\-]\d{4})/i);
    fields.tempatLahir = extract(/tempat\s*(?:lahir|ttl)[\s:,]+([A-Za-z\s]{3,30})/i);
    fields.tanggalLahir =
      extract(/(?:tanggal\s*lahir|tgl\.?\s*lahir)[\s:]+(\d{1,2}[/\\-]\d{1,2}[/\\-]\d{4})/i) ||
      extract(/ttl[\s:]+[A-Za-z\s,]+,\s*(\d{1,2}[/\\-]\d{1,2}[/\\-]\d{4})/i);
    if (/\b(laki-laki|laki laki|L\b)/i.test(text)) fields.jenisKelamin = "Laki-Laki";
    else if (/\b(perempuan|P\b)/i.test(text)) fields.jenisKelamin = "Perempuan";
  };

  const setCommonDocumentTitle = () => {
    const titleCandidates = lines.slice(0, 7).filter((line) => line.length > 8 && line.length < 120);
    if (titleCandidates.length) fields.judul = titleCandidates[0];
  };

  switch (templateKey) {
    case "ijazah":
      setCommonSchoolFields();
      setCommonDocumentTitle();
      break;
    case "transkrip":
      setCommonSchoolFields();
      fields.judul =
        extract(/(transkrip\s+nilai|rekap\s+nilai|daftar\s+nilai|daftar\s+nilai\s*siswa|nilai\s*siswa)[^\n]{0,80}/i) ||
        fields.judul;
      setCommonDocumentTitle();
      break;
    case "sertifikat":
      fields.judul =
        extract(/(sertifikat[^\n]{3,80})/i) ||
        extract(/judul[\s:]+([^\n]{3,80})/i);
      fields.namaSiswa =
        extract(/(?:nama\s*(?:peserta|penerima)?|kepada)[\s:]+([A-Za-z\s]{3,80})/i) ||
        extract(/nama[\s:]+([A-Za-z\s]{3,80})/i);
      fields.tanggalSurat = extract(/(?:tanggal|tgl\.?)[\s:]+(\d{1,2}\s+\w+\s+\d{4})/i);
      fields.pengirim = extract(/(?:diberikan oleh|oleh|instansi|sekolah|lembaga)[\s:]+([^\n]{3,80})/i);
      fields.perihal = extract(/(?:perihal|atas nama|diberikan kepada)[\s:]+([^\n]{3,80})/i);
      setCommonDocumentTitle();
      break;
    case "skl":
      setCommonSchoolFields();
      fields.judul =
        extract(/(surat\s+keterangan\s+lulus|surat\s+lulus|skl|skhu)[^\n]{0,80}/i) ||
        fields.judul;
      fields.tanggalSurat = extract(/(?:tanggal|tgl\.?)[\s:]+(\d{1,2}\s+\w+\s+\d{4})/i);
      setCommonDocumentTitle();
      break;
    default:
      return {};
  }

  fields.nomorSurat = extract(/(?:nomor\s*surat|no\.?\s*surat|no\s*:\s*)([A-Za-z0-9/\-.]{4,50})/i);
  fields.namaOrangTua =
    extract(/(?:nama\s*)?orang\s*tua[\s:]+([A-Za-z\s]{3,40})/i) ||
    extract(/(?:nama\s*)?ayah[\s:]+([A-Za-z\s]{3,40})/i);
  fields.noHpOrangTua = extract(/(?:no\.?\s*hp|telepon|hp)[\s:]+(\+?[\d\s-]{9,15})/i);
  fields.nip = extract(/NIP[\s:]+(\d{10,20})/i);
  fields.perihal = fields.perihal || extract(/(?:perihal|hal)[\s:]+([^\n]{3,80})/i);
  fields.pengirim = fields.pengirim || extract(/(?:dari|pengirim|asal|lembaga)[\s:]+([^\n]{3,60})/i);
  fields.tujuan = extract(/(?:kepada|tujuan|yth)[\s.,:]+([^\n]{3,60})/i);

  Object.keys(fields).forEach((k) => {
    if (!fields[k]) delete fields[k];
  });

  return fields;
}
