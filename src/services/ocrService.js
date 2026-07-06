/**
 * ocrService.js
 *
 * OCR dokumen — dipindahkan dari Tesseract.js (client-side, heuristic regex
 * parser) ke Gemini Vision API (backend, /api/ocr/scan). Gemini membaca
 * gambar dokumen secara langsung dan mengembalikan jenis dokumen + metadata
 * terstruktur, jauh lebih akurat dibanding OCR teks mentah + regex.
 *
 * Dokumen yang didukung: Ijazah SMP, Surat Keterangan Lulus (SKL/SKHU),
 * Sertifikat, Transkrip/Rekap Nilai. Selain itu backend mengembalikan
 * document_type: "unsupported".
 */

import { uploadApi } from "@/lib/apiClient";

// Mapping field hasil Gemini (snake_case, sesuai template dokumen sekolah)
// → key metaData yang dipakai form upload (camelCase, konsisten dengan
// CATEGORY_FORM_FIELDS di src/data/mockData.js).
const FIELD_KEY_MAP = {
  ijazah: {
    nama: "namaSiswa",
    tempat_tanggal_lahir: "__ttl__", // ditangani khusus (split tempat/tanggal)
    nama_orangtua_wali: "namaOrangTua",
    nis: "nis",
    nisn: "nisn",
    nomor_peserta: "nomorPeserta",
    tahun_pelajaran: "tahunAjaran",
    nama_sekolah: "namaSekolah",
    tanggal_kelulusan: "tanggalKelulusan",
  },
  skl: {
    nama: "namaSiswa",
    nisn: "nisn",
    tahun_pelajaran: "tahunAjaran",
    status_kelulusan: "statusKelulusan",
  },
  sertifikat: {
    nama_peserta: "namaPeserta",
    nomor_sertifikat: "nomorSertifikat",
    nama_kegiatan: "namaKegiatan",
    tanggal_terbit: "tanggalTerbit",
  },
  transkrip: {
    nama: "namaSiswa",
    nisn: "nisn",
    kelas: "kelas",
    tahun_pelajaran: "tahunAjaran",
  },
};

export const DOCUMENT_TYPE_LABELS = {
  ijazah: "Ijazah SMP",
  skl: "Surat Keterangan Lulus (SKL)",
  sertifikat: "Sertifikat",
  transkrip: "Transkrip / Rekap Nilai",
};

// Label tampilan untuk setiap key metaData hasil mapping di atas.
export const OCR_FIELD_LABELS = {
  namaSiswa: "Nama",
  tempatLahir: "Tempat Lahir",
  tanggalLahir: "Tanggal Lahir",
  namaOrangTua: "Nama Orang Tua/Wali",
  nis: "NIS",
  nisn: "NISN",
  nomorPeserta: "Nomor Peserta",
  tahunAjaran: "Tahun Pelajaran",
  namaSekolah: "Nama Sekolah",
  tanggalKelulusan: "Tanggal Kelulusan",
  statusKelulusan: "Status Kelulusan",
  namaPeserta: "Nama Peserta",
  nomorSertifikat: "Nomor Sertifikat",
  namaKegiatan: "Nama Kegiatan",
  tanggalTerbit: "Tanggal Terbit",
  kelas: "Kelas",
};

/** Urutan field yang ditampilkan di form hasil OCR, per jenis dokumen. */
export const OCR_FIELD_ORDER = {
  ijazah: [
    "namaSiswa", "tempatLahir", "tanggalLahir", "namaOrangTua",
    "nis", "nisn", "nomorPeserta", "tahunAjaran", "namaSekolah", "tanggalKelulusan",
  ],
  skl: ["namaSiswa", "nisn", "tahunAjaran", "statusKelulusan"],
  sertifikat: ["namaPeserta", "nomorSertifikat", "namaKegiatan", "tanggalTerbit"],
  transkrip: ["namaSiswa", "nisn", "kelas", "tahunAjaran"],
};

/** Ubah dataUrl (base64) menjadi Blob agar bisa dikirim sebagai multipart/form-data. */
function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Pecah "Kota, 12 Mei 2008" menjadi { tempatLahir, tanggalLahir }.
 * Kalau tidak ada koma, seluruh teks dianggap tempat lahir saja.
 */
function splitTempatTanggalLahir(value) {
  if (!value || typeof value !== "string") return {};
  const parts = value.split(",");
  if (parts.length >= 2) {
    return {
      tempatLahir: parts[0].trim(),
      tanggalLahir: parts.slice(1).join(",").trim(),
    };
  }
  return { tempatLahir: value.trim() };
}

/**
 * Terjemahkan { document_type, fields } dari backend menjadi objek metaData
 * yang siap digabungkan ke form upload (key camelCase, sama seperti field
 * form lain di UploadForm.jsx).
 */
export function mapOcrFieldsToMetadata(documentType, rawFields = {}) {
  const map = FIELD_KEY_MAP[documentType];
  if (!map) return {};

  const result = {};
  Object.entries(rawFields).forEach(([rawKey, rawValue]) => {
    if (!rawValue) return;
    const mapped = map[rawKey];
    if (!mapped) return;

    if (mapped === "__ttl__") {
      Object.assign(result, splitTempatTanggalLahir(rawValue));
      return;
    }
    result[mapped] = String(rawValue).trim();
  });
  return result;
}

/**
 * Kirim gambar hasil scan ke backend untuk dibaca oleh Gemini Vision.
 *
 * @param {string} imageDataUrl - dataUrl hasil scan (dari DocumentScanner)
 * @returns {Promise<{ documentType: string, confidence: number|null, fields: object, unsupported: boolean, message?: string }>}
 */
export async function scanDocumentOCR(imageDataUrl) {
  if (!imageDataUrl) {
    throw new Error("Tidak ada gambar untuk di-scan. Ambil foto dokumen terlebih dahulu.");
  }

  const blob = dataUrlToBlob(imageDataUrl);
  const formData = new FormData();
  formData.append("image", blob, "scan.jpg");

  const { data } = await uploadApi.post("/ocr/scan", formData);

  if (!data || data.document_type === "unsupported") {
    return {
      documentType: "unsupported",
      confidence: null,
      fields: {},
      unsupported: true,
      message: data?.message || "Dokumen tidak didukung OCR",
    };
  }

  return {
    documentType: data.document_type,
    confidence: data.confidence ?? null,
    fields: mapOcrFieldsToMetadata(data.document_type, data.fields || {}),
    unsupported: false,
  };
}
