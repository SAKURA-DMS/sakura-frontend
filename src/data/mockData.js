import avatarPrincipal from "@/assets/avatar_principal.jpg";
import avatarAdmin from "@/assets/avatar_admin.jpg";
import avatarStaff from "@/assets/avatar_staff.jpg";
import avatarTeacher from "@/assets/avatar_teacher.jpg";

export const USERS = [
  { id: 1, nama: "Budi Santoso", email: "admin@sakura.sch.id", role: "Operator/TU", avatar: avatarAdmin, departemen: "Operator / TU", nip: "" },
  { id: 2, nama: "Dr. Siti Rahayu", email: "principal@sakura.sch.id", role: "Kepala Sekolah", avatar: avatarPrincipal, departemen: "Kepala Sekolah", nip: "" },
  { id: 3, nama: "Ahmad Fauzi", email: "teacher@sakura.sch.id", role: "Guru", avatar: avatarTeacher, departemen: "Guru Mata Pelajaran", nip: "198723450001" },
];

// ===== Schema-aligned tables (mirrors MySQL) =====

// Mirror of `categories` table
export const CATEGORIES = [
  { category_id: 1, category_name: "Data Siswa" },
  { category_id: 2, category_name: "Data Guru" },
  { category_id: 3, category_name: "Sarana Prasarana" },
  { category_id: 4, category_name: "Surat Menyurat" },
  { category_id: 5, category_name: "Administrasi" },
];

// Mirror of `document_types` table
export const DOCUMENT_TYPES = [
  { type_id: 1, category_id: 1, type_name: "Buku Klapper", code_prefix: "BKL" },
  { type_id: 2, category_id: 1, type_name: "Buku Induk Register Peserta Didik", code_prefix: "BIR" },
  { type_id: 3, category_id: 1, type_name: "Surat Keterangan Hasil Ujian (SKHU)", code_prefix: "SKH" },
  { type_id: 4, category_id: 1, type_name: "Ijazah SMP", code_prefix: "IJZ" },
  { type_id: 5, category_id: 2, type_name: "Buku Induk Pegawai", code_prefix: "BIP" },
  { type_id: 6, category_id: 2, type_name: "Sertifikat Pendidik", code_prefix: "SRP" },
  { type_id: 7, category_id: 2, type_name: "Catatan Diklat", code_prefix: "CDK" },
  { type_id: 8, category_id: 3, type_name: "Buku Inventaris Barang dan Penghapusan Barang", code_prefix: "BIB" },
  { type_id: 9, category_id: 3, type_name: "Buku Pemeliharaan & Perbaikan", code_prefix: "BPP" },
  { type_id: 10, category_id: 4, type_name: "Buku Agenda Surat Masuk", code_prefix: "ASM" },
  { type_id: 11, category_id: 4, type_name: "Buku Agenda Surat Keluar", code_prefix: "ASK" },
  { type_id: 12, category_id: 4, type_name: "Kumpulan Surat Keputusan (SK)", code_prefix: "KSK" },
  { type_id: 13, category_id: 4, type_name: "Lainnya", code_prefix: "LNR" },
  // ── Dokumen milik Guru (category_id 5 = Administrasi) ──────────────────
  // Lihat migration_guru_document_types.sql — harus disinkronkan manual
  // di sini karena categoryList/typeList tidak di-fetch dari API /categories.
  { type_id: 19, category_id: 5, type_name: "Modul Ajar", code_prefix: "MDA" },
  { type_id: 20, category_id: 5, type_name: "RPP", code_prefix: "RPP" },
  { type_id: 21, category_id: 5, type_name: "Silabus", code_prefix: "SIL" },
  { type_id: 22, category_id: 5, type_name: "Program Tahunan (Prota)", code_prefix: "PTA" },
  { type_id: 23, category_id: 5, type_name: "Program Semester (Promes)", code_prefix: "PSM" },
  { type_id: 24, category_id: 5, type_name: "Bahan Ajar", code_prefix: "BJR" },
  { type_id: 25, category_id: 5, type_name: "Bank Soal", code_prefix: "BSL" },
  { type_id: 26, category_id: 5, type_name: "Kisi-kisi", code_prefix: "KSI" },
  { type_id: 27, category_id: 5, type_name: "Rubrik Penilaian", code_prefix: "RBP" },
  { type_id: 28, category_id: 5, type_name: "Rekap Nilai", code_prefix: "RKN" },
  { type_id: 29, category_id: 5, type_name: "Jurnal Mengajar", code_prefix: "JRM" },
  { type_id: 30, category_id: 5, type_name: "Absensi Siswa", code_prefix: "ABS" },
  { type_id: 31, category_id: 5, type_name: "Laporan Hasil Belajar", code_prefix: "LHB" },
  { type_id: 32, category_id: 5, type_name: "Portofolio Siswa", code_prefix: "PFS" },
  { type_id: 33, category_id: 5, type_name: "SK Mengajar", code_prefix: "SKM" },
  { type_id: 34, category_id: 5, type_name: "Sertifikat Diklat", code_prefix: "SRD" },
  { type_id: 35, category_id: 5, type_name: "Sertifikat Seminar", code_prefix: "SRS" },
  { type_id: 36, category_id: 5, type_name: "Portofolio Guru", code_prefix: "PFG" },
];

// Mirror of `document_counters` table (mutable state managed in AppContext)
export const INITIAL_DOCUMENT_COUNTERS = [];

// Mirror of `folders` table — hierarchical: categories → document types (→ tahun_ajaran for Data Siswa)
export const FOLDERS = [
  // Root category folders
  { folder_id: 1, folder_name: "Data Siswa", parent_id: null, category_id: 1, type_id: null, description: "Berisi dokumen administrasi siswa seperti buku klapper, buku induk, ijazah, dan SKHU." },
  { folder_id: 2, folder_name: "Data Guru", parent_id: null, category_id: 2, type_id: null, description: "Berisi dokumen kepegawaian guru seperti buku induk pegawai, sertifikat pendidik, dan catatan diklat." },
  { folder_id: 3, folder_name: "Sarana Prasarana", parent_id: null, category_id: 3, type_id: null, description: "Berisi dokumen inventaris barang dan pemeliharaan sarana prasarana sekolah." },
  { folder_id: 4, folder_name: "Surat Menyurat", parent_id: null, category_id: 4, type_id: null, description: "Berisi arsip surat masuk, surat keluar, dan surat keputusan (SK)." },
  // Data Siswa sub-folders (document types)
  { folder_id: 10, folder_name: "Buku Klapper", parent_id: 1, category_id: 1, type_id: 1, description: "Buku klapper berisi daftar nama siswa yang disusun menurut abjad." },
  { folder_id: 11, folder_name: "Buku Induk Register Peserta Didik", parent_id: 1, category_id: 1, type_id: 2, description: "Buku induk berisi data lengkap seluruh peserta didik." },
  { folder_id: 12, folder_name: "Surat Keterangan Hasil Ujian (SKHU)", parent_id: 1, category_id: 1, type_id: 3, description: "Arsip SKHU siswa yang telah menyelesaikan ujian." },
  { folder_id: 13, folder_name: "Ijazah SMP", parent_id: 1, category_id: 1, type_id: 4, description: "Arsip ijazah siswa SMP." },
  // Data Guru sub-folders
  { folder_id: 20, folder_name: "Buku Induk Pegawai", parent_id: 2, category_id: 2, type_id: 5, description: "Data pokok seluruh pegawai sekolah." },
  { folder_id: 21, folder_name: "Sertifikat Pendidik", parent_id: 2, category_id: 2, type_id: 6, description: "Arsip sertifikat profesional pendidik." },
  { folder_id: 22, folder_name: "Catatan Diklat", parent_id: 2, category_id: 2, type_id: 7, description: "Catatan pelatihan dan pendidikan guru." },
  // Sarana Prasarana sub-folders
  { folder_id: 30, folder_name: "Buku Inventaris Barang dan Penghapusan Barang", parent_id: 3, category_id: 3, type_id: 8, description: "Daftar inventaris barang milik sekolah." },
  { folder_id: 31, folder_name: "Buku Pemeliharaan & Perbaikan", parent_id: 3, category_id: 3, type_id: 9, description: "Catatan pemeliharaan dan perbaikan sarana sekolah." },
  // Surat Menyurat sub-folders
  { folder_id: 40, folder_name: "Buku Agenda Surat Masuk", parent_id: 4, category_id: 4, type_id: 10, description: "Arsip agenda surat masuk dari pihak luar." },
  { folder_id: 41, folder_name: "Buku Agenda Surat Keluar", parent_id: 4, category_id: 4, type_id: 11, description: "Arsip agenda surat keluar sekolah." },
  { folder_id: 42, folder_name: "Kumpulan Surat Keputusan (SK)", parent_id: 4, category_id: 4, type_id: 12, description: "Arsip surat keputusan resmi sekolah." },
  { folder_id: 43, folder_name: "Lainnya", parent_id: 4, category_id: 4, type_id: 13, description: "Folder untuk dokumen lain-lain yang belum terklasifikasi." },
];

// Backward-compatible derived exports
export const KATEGORI_OPTIONS = CATEGORIES.map((c) => c.category_name);

// Dynamic form field definitions per category (maps to separate DB tables)
// category_id → fields definition
export const CATEGORY_FORM_FIELDS = {
  // Data Siswa → student_records table
  1: [
    { key: "namaSiswa", label: "Nama Siswa", placeholder: "Nama lengkap siswa", required: true },
    { key: "nis", label: "NIS", placeholder: "Nomor Induk Siswa" },
    { key: "nisn", label: "NISN", placeholder: "00xxxxxxxx" },
    { key: "kelas", label: "Kelas", placeholder: "Contoh: Kelas 7A / Alumni 2024" },
    { key: "tahunAjaran", label: "Tahun Ajaran", type: "tahun_ajaran" },
    { key: "tempatLahir", label: "Tempat Lahir", placeholder: "Contoh: Bekasi" },
    { key: "tanggalLahir", label: "Tanggal Lahir", placeholder: "DD/MM/YYYY", type: "date" },
    { key: "jenisKelamin", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"] },
    { key: "namaOrangTua", label: "Nama Orang Tua", placeholder: "Nama lengkap orang tua/wali" },
    { key: "noHpOrangTua", label: "No HP Orang Tua", placeholder: "08xxxxxxxxxx" },
  ],
  // Data Guru → teacher_records table
  2: [
    { key: "namaGuru", label: "Nama Guru", placeholder: "Nama lengkap guru", required: true },
    { key: "nip", label: "NIP", placeholder: "Nomor Induk Pegawai" },
    { key: "nuptk", label: "NUPTK", placeholder: "Nomor Unik Pendidik" },
    { key: "mataPelajaran", label: "Mata Pelajaran", placeholder: "Contoh: Matematika" },
    { key: "pendidikanTerakhir", label: "Pendidikan Terakhir", placeholder: "Contoh: S1 Pendidikan" },
    { key: "statusKepegawaian", label: "Status Kepegawaian", type: "select", options: ["PNS", "PPPK", "Honorer", "GTT"] },
  ],
  // Sarana Prasarana → inventory_items table
  3: [
    { key: "kodeBarang", label: "Kode Barang", placeholder: "Contoh: INV-001", required: true },
    { key: "namaBarang", label: "Nama Barang", placeholder: "Contoh: Meja Guru" },
    { key: "jumlah", label: "Jumlah", placeholder: "Contoh: 10", type: "number" },
    { key: "tahunPengadaan", label: "Tahun Pengadaan", placeholder: "Contoh: 2024" },
    { key: "kondisi", label: "Kondisi", type: "select", options: ["Baik", "Rusak Ringan", "Rusak Berat"] },
    { key: "lokasi", label: "Lokasi", placeholder: "Contoh: Ruang Lab IPA" },
  ],
};

// Surat Menyurat has sub-type specific fields (maps to different tables per type)
export const SURAT_TYPE_FORM_FIELDS = {
  // Buku Agenda Surat Masuk (type_id: 10) → incoming_letters table
  10: [
    { key: "nomorAgenda", label: "Nomor Agenda", placeholder: "Contoh: 001/SM/2026", required: true },
    { key: "nomorSurat", label: "Nomor Surat", placeholder: "Nomor surat masuk" },
    { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "DD/MM/YYYY", type: "date" },
    { key: "tanggalDiterima", label: "Tanggal Diterima", placeholder: "DD/MM/YYYY", type: "date" },
    { key: "pengirim", label: "Pengirim", placeholder: "Contoh: Dinas Pendidikan" },
    { key: "perihal", label: "Perihal", placeholder: "Perihal surat" },
  ],
  // Buku Agenda Surat Keluar (type_id: 11) → outgoing_letters table
  11: [
    { key: "nomorAgenda", label: "Nomor Agenda", placeholder: "Contoh: 001/SK/2026", required: true },
    { key: "nomorSurat", label: "Nomor Surat", placeholder: "Nomor surat keluar" },
    { key: "tanggalSurat", label: "Tanggal Surat", placeholder: "DD/MM/YYYY", type: "date" },
    { key: "tujuan", label: "Tujuan", placeholder: "Contoh: Dinas Pendidikan Kab. Bekasi" },
    { key: "perihal", label: "Perihal", placeholder: "Perihal surat" },
    { key: "penandatangan", label: "Penandatangan", placeholder: "Nama penandatangan" },
  ],
  // Kumpulan Surat Keputusan (type_id: 12) → sk_records table
  12: [
    { key: "nomorSK", label: "Nomor SK", placeholder: "Contoh: 001/SK/2026", required: true },
    { key: "tanggalSK", label: "Tanggal SK", placeholder: "DD/MM/YYYY", type: "date" },
    { key: "tentang", label: "Tentang", placeholder: "Contoh: Pengangkatan Guru Tetap" },
    { key: "penandatangan", label: "Penandatangan", placeholder: "Nama penandatangan" },
  ],
};

// Keep backward compat
export const KATEGORI_DETAIL_FIELDS = {};

export const TAHUN_AJARAN_OPTIONS = ["2023/2024", "2024/2025", "2025/2026"];

// Mock documents with schema-aligned fields
export const DOCUMENTS = [
  {
    id: 1, nomorDokumen: "IJZ/2024/001", judul: "Ijazah - Ahmad Rizki",
    kategori: "Data Siswa", category_id: 1, type_id: 4, folder_id: 13,
    kelas: "Alumni 2024", class_info: "Alumni 2024",
    jenisDokumen: "Ijazah SMP", namaSiswa: "Ahmad Rizki", nisn: "0012345678", tahunAjaran: "2023/2024",
    pengunggah: { id: 1, nama: "Budi Santoso", role: "Operator/TU", avatar: avatarAdmin },
    tanggalUpload: "2025-08-22T15:49:05Z", tanggalEdit: "2025-08-23T10:12:00Z", status: "Disetujui", versi: 1,
    fileUrl: "/mock/sample.pdf",
    auditTrail: [
      { time: "2025-08-22T15:49:05Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengunggah dokumen" },
      { time: "2025-08-23T09:59:10Z", user: { nama: "Dr. Siti Rahayu", avatar: avatarPrincipal, role: "Kepala Sekolah" }, action: "Melihat dokumen" },
      { time: "2025-08-23T10:12:00Z", user: { nama: "Dr. Siti Rahayu", avatar: avatarPrincipal, role: "Kepala Sekolah" }, action: "Menyetujui dokumen" },
    ],
  },
  {
    id: 2, nomorDokumen: "BKL/2024/001", judul: "Buku Klapper Kelas 7A",
    kategori: "Data Siswa", category_id: 1, type_id: 1, folder_id: 10,
    kelas: "Kelas 7A", class_info: "Kelas 7A",
    jenisDokumen: "Buku Klapper", namaSiswa: "Kelas 7A", nisn: "-", tahunAjaran: "2024/2025",
    pengunggah: { id: 4, nama: "Ahmad Fauzi", role: "Guru", avatar: avatarTeacher },
    tanggalUpload: "2025-09-01T08:24:00Z", tanggalEdit: "2025-09-01T09:54:00Z", status: "Menunggu", versi: 1,
    fileUrl: "/mock/sample.pdf", catatan: "Dokumen sensitif - perlu review",
    auditTrail: [
      { time: "2025-09-01T08:24:00Z", user: { nama: "Ahmad Fauzi", avatar: avatarTeacher, role: "Guru" }, action: "Mengunggah dokumen" },
    ],
  },
  {
    id: 3, nomorDokumen: "BIP/2024/001", judul: "Data Pegawai - Rina Wati",
    kategori: "Data Guru", category_id: 2, type_id: 5, folder_id: 20,
    kelas: "-", class_info: "-",
    jenisDokumen: "Buku Induk Pegawai", tahunAjaran: "2024/2025",
    pengunggah: { id: 1, nama: "Budi Santoso", role: "Operator/TU", avatar: avatarAdmin },
    tanggalUpload: "2025-09-05T10:00:00Z", tanggalEdit: "2025-09-06T14:30:00Z", status: "Disetujui", versi: 2,
    fileUrl: "/mock/sample.pdf",
    auditTrail: [
      { time: "2025-09-05T10:00:00Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengunggah dokumen" },
      { time: "2025-09-06T14:30:00Z", user: { nama: "Dr. Siti Rahayu", avatar: avatarPrincipal, role: "Kepala Sekolah" }, action: "Menyetujui dokumen" },
    ],
  },
  {
    id: 4, nomorDokumen: "IJZ/2024/002", judul: "Ijazah - Siti Nurhaliza",
    kategori: "Data Siswa", category_id: 1, type_id: 4, folder_id: 13,
    kelas: "Alumni 2024", class_info: "Alumni 2024",
    jenisDokumen: "Ijazah SMP", namaSiswa: "Siti Nurhaliza", nisn: "0012345679", tahunAjaran: "2023/2024",
    pengunggah: { id: 1, nama: "Budi Santoso", role: "Operator/TU", avatar: avatarAdmin },
    tanggalUpload: "2025-09-10T11:00:00Z", tanggalEdit: "2025-09-10T15:00:00Z", status: "Ditolak", versi: 1,
    fileUrl: "/mock/sample.pdf", catatan: "Format tidak sesuai standar",
    auditTrail: [
      { time: "2025-09-10T11:00:00Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengunggah dokumen" },
      { time: "2025-09-10T15:00:00Z", user: { nama: "Dr. Siti Rahayu", avatar: avatarPrincipal, role: "Kepala Sekolah" }, action: "Menolak dokumen: Format tidak sesuai standar" },
    ],
  },
  {
    id: 5, nomorDokumen: "BIR/2024/001", judul: "Buku Induk Register Kelas 8B",
    kategori: "Data Siswa", category_id: 1, type_id: 2, folder_id: 11,
    kelas: "Kelas 8B", class_info: "Kelas 8B",
    jenisDokumen: "Buku Induk Register Peserta Didik", tahunAjaran: "2023/2024",
    pengunggah: { id: 1, nama: "Budi Santoso", role: "Operator/TU", avatar: avatarAdmin },
    tanggalUpload: "2025-07-15T09:00:00Z", tanggalEdit: "2025-08-01T10:00:00Z", status: "Diarsipkan", versi: 1,
    fileUrl: "/mock/sample.pdf",
    auditTrail: [
      { time: "2025-07-15T09:00:00Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengunggah dokumen" },
      { time: "2025-07-20T10:00:00Z", user: { nama: "Dr. Siti Rahayu", avatar: avatarPrincipal, role: "Kepala Sekolah" }, action: "Menyetujui dokumen" },
      { time: "2025-08-01T10:00:00Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengarsipkan dokumen" },
    ],
  },
  {
    id: 6, nomorDokumen: "SKH/2024/001", judul: "SKHU Kelas 9C",
    kategori: "Data Siswa", category_id: 1, type_id: 3, folder_id: 12,
    kelas: "Kelas 9C", class_info: "Kelas 9C",
    jenisDokumen: "Surat Keterangan Hasil Ujian (SKHU)", namaSiswa: "Kelas 9C", nisn: "-", tahunAjaran: "2024/2025",
    pengunggah: { id: 4, nama: "Ahmad Fauzi", role: "Guru", avatar: avatarTeacher },
    tanggalUpload: "2025-09-12T07:30:00Z", tanggalEdit: "2025-09-12T07:30:00Z", status: "Menunggu", versi: 1,
    fileUrl: "/mock/sample.pdf",
    auditTrail: [
      { time: "2025-09-12T07:30:00Z", user: { nama: "Ahmad Fauzi", avatar: avatarTeacher, role: "Guru" }, action: "Mengunggah dokumen" },
    ],
  },
  {
    id: 7, nomorDokumen: "SRP/2024/001", judul: "Sertifikat Pendidik - Andi Prasetyo",
    kategori: "Data Guru", category_id: 2, type_id: 6, folder_id: 21,
    kelas: "-", class_info: "-",
    jenisDokumen: "Sertifikat Pendidik", tahunAjaran: "2024/2025",
    pengunggah: { id: 1, nama: "Budi Santoso", role: "Operator/TU", avatar: avatarAdmin },
    tanggalUpload: "2025-09-08T13:00:00Z", tanggalEdit: "2025-09-09T08:00:00Z", status: "Disetujui", versi: 1,
    fileUrl: "/mock/sample.pdf",
    auditTrail: [
      { time: "2025-09-08T13:00:00Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengunggah dokumen" },
      { time: "2025-09-09T08:00:00Z", user: { nama: "Dr. Siti Rahayu", avatar: avatarPrincipal, role: "Kepala Sekolah" }, action: "Menyetujui dokumen" },
    ],
  },
  {
    id: 8, nomorDokumen: "ASM/2024/001", judul: "Surat Masuk Dinas Pendidikan",
    kategori: "Surat Menyurat", category_id: 4, type_id: 10, folder_id: 40,
    kelas: "-", class_info: "-",
    jenisDokumen: "Buku Agenda Surat Masuk", tahunAjaran: "2024/2025",
    pengunggah: { id: 1, nama: "Budi Santoso", role: "Operator/TU", avatar: avatarAdmin },
    tanggalUpload: "2025-09-15T10:00:00Z", tanggalEdit: "2025-09-15T10:00:00Z", status: "Menunggu", versi: 1,
    fileUrl: "/mock/sample.pdf",
    auditTrail: [
      { time: "2025-09-15T10:00:00Z", user: { nama: "Budi Santoso", avatar: avatarAdmin, role: "Operator/TU" }, action: "Mengunggah dokumen" },
    ],
  },
];

export const INITIAL_NOTIFICATIONS = [
  { id: 1, message: "Dokumen 'SKHU Kelas 9C' menunggu persetujuan", time: "2025-09-12T07:30:00Z", read: false, type: "upload", docId: 6 },
  { id: 2, message: "Dokumen 'Surat Masuk Dinas Pendidikan' menunggu persetujuan", time: "2025-09-15T10:00:00Z", read: false, type: "upload", docId: 8 },
  { id: 3, message: "Dokumen 'Ijazah - Siti Nurhaliza' telah ditolak", time: "2025-09-10T15:00:00Z", read: true, type: "rejection", docId: 4 },
];

export const PERMISSIONS = [
  { key: "dashboard.view", label: "Dashboard" },
  { key: "documents.upload", label: "Upload Dokumen" },
  { key: "documents.approve", label: "Setujui Dokumen" },
  { key: "documents.reject", label: "Tolak Dokumen" },
  { key: "documents.archive", label: "Akses Arsip" },
  { key: "documents.edit", label: "Edit Dokumen" },
  { key: "users.manage", label: "Kelola User" },
  { key: "roles.manage", label: "Kelola Role" },
  { key: "audit.view", label: "Log Sistem" },
  { key: "audit.addNote", label: "Tambah Catatan Jejak Aktivitas" },
  { key: "profile.edit", label: "Pengaturan Profil" },
];

export const ROLE_PERMISSIONS = {
  "Operator/TU": ["dashboard.view", "documents.upload", "documents.archive", "documents.edit", "users.view", "users.manage", "users.approve", "users.manageRole", "roles.manage", "audit.view", "audit.addNote", "profile.edit"],
  "Kepala Sekolah": ["dashboard.view", "documents.approve", "documents.reject", "documents.archive", "audit.view", "profile.edit"],
  "Guru": ["dashboard.view", "documents.upload", "documents.archive", "profile.edit"],
};

// ── Role-Based Folder Access ────────────────────────────────────────────────
// Satu sumber kebenaran untuk permission per-modul (mirip Google Drive Shared
// Folder): viewRoles = role yang boleh MELIHAT modul ini, manageRoles = role
// yang boleh upload/edit/delete dokumen di dalamnya. Tidak mengubah skema DB
// atau struktur folder yang ada — hanya lapisan permission di frontend,
// dipetakan dari category_id/type_id yang sudah ada.
export const MODULE_DEFINITIONS = [
  {
    id: "kesiswaan",
    label: "Data Siswa",
    category_id: 1,
    type_ids: [1, 2, 3, 4],
    viewRoles: ["Operator/TU", "Kepala Sekolah", "Guru"],
    manageRoles: ["Operator/TU"],
  },
  {
    id: "kepegawaian",
    label: "Data Guru",
    category_id: 2,
    type_ids: [5, 6, 7],
    viewRoles: ["Operator/TU", "Kepala Sekolah", "Guru"],
    manageRoles: ["Operator/TU"],
    // Guru tetap "view" tapi dibatasi ke dokumen relevan/miliknya sendiri —
    // filtering per-dokumen sudah ditangani accessibleDocuments di ArchivePage.jsx.
    guruViewOwnOnly: true,
  },
  {
    id: "inventaris",
    label: "Sarana Prasarana",
    category_id: 3,
    type_ids: [8, 9],
    viewRoles: ["Operator/TU", "Kepala Sekolah", "Guru"],
    manageRoles: ["Operator/TU"],
  },
  {
    id: "korespondensi",
    label: "Surat Menyurat",
    category_id: 4,
    type_ids: [10, 11, 12, 13],
    viewRoles: ["Operator/TU", "Kepala Sekolah", "Guru"],
    manageRoles: ["Operator/TU"],
  },
  {
    id: "administrasi-pembelajaran",
    label: "Administrasi Pembelajaran",
    category_id: 5,
    type_ids: [19, 20, 21, 22, 23, 24],
    viewRoles: ["Guru", "Kepala Sekolah", "Operator/TU"],
    manageRoles: ["Guru"],
  },
  {
    id: "penilaian",
    label: "Penilaian",
    category_id: 5,
    type_ids: [25, 26, 27, 28],
    viewRoles: ["Guru", "Kepala Sekolah", "Operator/TU"],
    manageRoles: ["Guru"],
  },
  {
    id: "administrasi-kelas",
    label: "Administrasi Kelas",
    category_id: 5,
    type_ids: [29, 30, 31, 32],
    viewRoles: ["Guru", "Kepala Sekolah", "Operator/TU"],
    manageRoles: ["Guru"],
  },
  {
    id: "pengembangan-profesi",
    label: "Pengembangan Profesi",
    category_id: 5,
    type_ids: [33, 34, 35, 36],
    viewRoles: ["Guru", "Kepala Sekolah", "Operator/TU"],
    manageRoles: ["Guru"],
  },
];

// Cari definisi modul dari path folder terstruktur ("cat:X/type:Y" atau "cat:X")
export function getModuleByPath(folderPath) {
  if (!folderPath) return null;
  const catMatch  = folderPath.match(/cat:(\d+)/);
  const typeMatch = folderPath.match(/type:(\d+)/);
  const catId  = catMatch  ? Number(catMatch[1])  : null;
  const typeId = typeMatch ? Number(typeMatch[1]) : null;
  return (
    MODULE_DEFINITIONS.find(
      (m) => m.category_id === catId && (typeId == null || m.type_ids.includes(typeId))
    ) || null
  );
}

// Cari definisi modul dari sebuah dokumen (category_id/type_id)
export function getModuleByDoc(doc) {
  if (!doc) return null;
  return (
    MODULE_DEFINITIONS.find(
      (m) => m.category_id === doc.category_id && m.type_ids.includes(doc.type_id)
    ) || null
  );
}

// Tidak ada definisi modul (mis. "Semua Dokumen") → default terlihat.
export function canViewModule(role, mod) {
  if (!mod) return true;
  return mod.viewRoles.includes(role);
}

// Tidak ada definisi modul → default tidak boleh kelola (aman/fail-closed).
export function canManageModule(role, mod) {
  if (!mod) return false;
  return mod.manageRoles.includes(role);
}

// Sidebar folder structure for archive navigation
export const SIDEBAR_FOLDERS = [
  { label: "Semua Dokumen", path: null, icon: "all" },
  {
    module: "Data Siswa", moduleId: "kesiswaan", children: [
      { label: "Buku Klapper", folder: "klapper", path: "cat:1/type:1" },
      { label: "Buku Induk Siswa", folder: "induk-siswa", path: "cat:1/type:2" },
      { label: "Ijazah SMP", folder: "ijazah", path: "cat:1/type:4" },
      { label: "Surat Keterangan", folder: "surat-ket", path: "cat:1/type:3" },
    ],
  },
  {
    module: "Data Guru", moduleId: "kepegawaian", children: [
      { label: "Sertifikat/Diklat", folder: "sertifikat", path: "cat:2/type:6" },
      { label: "Buku Induk Pegawai", folder: "induk-pegawai", path: "cat:2/type:5" },
      { label: "Catatan Diklat", folder: "catatan-diklat", path: "cat:2/type:7" },
    ],
  },
  {
    module: "Sarana Prasarana", moduleId: "inventaris", children: [
      { label: "Buku Barang", folder: "barang", path: "cat:3/type:8" },
      { label: "Kartu Perbaikan", folder: "perbaikan", path: "cat:3/type:9" },
    ],
  },
  {
    module: "Surat Menyurat", moduleId: "korespondensi", children: [
      { label: "Surat Masuk", folder: "surat-masuk", path: "cat:4/type:10" },
      { label: "Surat Keluar", folder: "surat-keluar", path: "cat:4/type:11" },
      { label: "SK & Edaran", folder: "sk", path: "cat:4/type:12" },
    ],
  },
  // ── Arsip Administrasi Guru ──────────────────────────────────────────────
  // Sebelumnya diberi flag `guruOnly: true` sehingga HANYA tampil untuk role
  // Guru dan disembunyikan total dari Operator/TU & Kepala Sekolah — ini yang
  // membuat sistem terasa "per-role" alih-alih "per-permission". Sekarang
  // visibilitas folder ditentukan oleh `canViewModule()` (lihat AppSidebar.jsx)
  // berdasarkan `moduleId` di MODULE_DEFINITIONS, bukan flag biner lagi. Semua
  // menumpang di category_id 5 yang sudah ada; struktur folder tidak berubah.
  {
    module: "Administrasi Pembelajaran", moduleId: "administrasi-pembelajaran", children: [
      { label: "Modul Ajar",                folder: "modul-ajar",  path: "cat:5/type:19" },
      { label: "RPP",                       folder: "rpp",         path: "cat:5/type:20" },
      { label: "Silabus",                   folder: "silabus",     path: "cat:5/type:21" },
      { label: "Program Tahunan (Prota)",   folder: "prota",       path: "cat:5/type:22" },
      { label: "Program Semester (Promes)", folder: "promes",      path: "cat:5/type:23" },
      { label: "Bahan Ajar",                folder: "bahan-ajar",  path: "cat:5/type:24" },
    ],
  },
  {
    module: "Penilaian", moduleId: "penilaian", children: [
      { label: "Bank Soal",         folder: "bank-soal",        path: "cat:5/type:25" },
      { label: "Kisi-kisi",         folder: "kisi-kisi",        path: "cat:5/type:26" },
      { label: "Rubrik Penilaian",  folder: "rubrik-penilaian", path: "cat:5/type:27" },
      { label: "Rekap Nilai",       folder: "rekap-nilai",      path: "cat:5/type:28" },
    ],
  },
  {
    module: "Administrasi Kelas", moduleId: "administrasi-kelas", children: [
      { label: "Jurnal Mengajar",         folder: "jurnal-mengajar",        path: "cat:5/type:29" },
      { label: "Absensi Siswa",           folder: "absensi-siswa",          path: "cat:5/type:30" },
      { label: "Laporan Hasil Belajar",   folder: "laporan-hasil-belajar",  path: "cat:5/type:31" },
      { label: "Portofolio Siswa",        folder: "portofolio-siswa",       path: "cat:5/type:32" },
    ],
  },
  {
    // NOTE: sebelumnya modul ini keliru diberi label "Kepegawaian" (bentrok
    // nama dengan modul "Data Guru" di atas). Diperbaiki menjadi
    // "Pengembangan Profesi" sesuai isi foldernya (SK Mengajar, Sertifikat
    // Diklat/Seminar Guru, Portofolio Guru).
    module: "Pengembangan Profesi", moduleId: "pengembangan-profesi", children: [
      { label: "SK Mengajar",         folder: "sk-mengajar-guru",       path: "cat:5/type:33" },
      { label: "Sertifikat Diklat",   folder: "sertifikat-diklat-guru", path: "cat:5/type:34" },
      { label: "Sertifikat Seminar",  folder: "sertifikat-seminar-guru",path: "cat:5/type:35" },
      { label: "Portofolio Guru",     folder: "portofolio-guru",        path: "cat:5/type:36" },
    ],
  },
];

export const CHART_MONTHS = [
  { label: "September 2025", value: "2025-09" },
  { label: "Agustus 2025", value: "2025-08" },
  { label: "Juli 2025", value: "2025-07" },
];

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function generateWeeklyData(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = Math.max(1, daysInMonth - 6);
  const labels = [];
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, startDay + i);
    const dayName = HARI[d.getDay()];
    const bulan = BULAN_SHORT[d.getMonth()];
    labels.push(`${dayName}, ${d.getDate()} ${bulan} ${year}`);
    dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return { labels, dates, uploads: [3, 5, 2, 4, 6, 3, 2], disetujui: [1, 2, 1, 1, 2, 1, 1], ditolak: [0, 1, 1, 0, 0, 1, 0], menunggu: [2, 2, 0, 3, 4, 1, 1] };
}

function generateMonthlyData(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const bulan = BULAN_SHORT[month - 1];
  const labels = [];
  const dates = [];
  for (let i = 1; i <= daysInMonth; i++) {
    labels.push(`${i} ${bulan} ${year}`);
    dates.push(`${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
  }
  return {
    labels, dates,
    uploads: Array.from({ length: daysInMonth }, (_, i) => [3,5,2,4,6,3,2,4,1,3,5,2,6,3,4,2,5,3,1,4,6,2,3,5,4,2,3,1,4,5,2][i] ?? 2),
    disetujui: Array.from({ length: daysInMonth }, (_, i) => [1,2,1,1,2,1,1,2,0,1,2,1,3,1,2,1,2,1,0,1,3,1,1,2,2,1,1,0,2,2,1][i] ?? 1),
    ditolak: Array.from({ length: daysInMonth }, (_, i) => [0,1,1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,1,0,0,1,0][i] ?? 0),
    menunggu: Array.from({ length: daysInMonth }, (_, i) => [2,2,0,3,4,1,1,2,0,2,2,1,3,1,2,0,3,2,0,3,3,0,2,3,1,1,1,1,2,2,1][i] ?? 1),
  };
}

export function getChartData(period, monthStr) {
  return period === "weekly" ? generateWeeklyData(monthStr) : generateMonthlyData(monthStr);
}

// Build folder tree from FOLDERS table (schema-aligned) + academic year nodes for Data Siswa
export function buildFolderTree(documents) {
  const tree = [];

  // Build from FOLDERS table hierarchy
  const rootFolders = FOLDERS.filter((f) => f.parent_id === null);

  rootFolders.forEach((root) => {
    const children = FOLDERS.filter((f) => f.parent_id === root.folder_id);
    const childNodes = children.map((child) => {
      // For Data Siswa category, add tahun_ajaran sub-folders
      if (root.category_id === 1) {
        const yearSet = new Set();
        documents.forEach((doc) => {
          if (doc.type_id === child.type_id && doc.tahunAjaran) {
            yearSet.add(doc.tahunAjaran);
          }
        });
        const yearChildren = [...yearSet].sort().reverse().map((year) => ({
          name: year,
          path: `cat:${root.category_id}/type:${child.type_id}/year:${year}`,
          folder_id: child.folder_id,
          category_id: root.category_id,
          type_id: child.type_id,
          tahunAjaran: year,
          description: "",
          children: [],
        }));
        return {
          name: child.folder_name,
          path: `cat:${root.category_id}/type:${child.type_id}`,
          folder_id: child.folder_id,
          category_id: root.category_id,
          type_id: child.type_id,
          description: child.description || "",
          children: yearChildren,
        };
      }
      return {
        name: child.folder_name,
        path: `cat:${root.category_id}/type:${child.type_id}`,
        folder_id: child.folder_id,
        category_id: root.category_id,
        type_id: child.type_id,
        description: child.description || "",
        children: [],
      };
    });

    tree.push({
      name: root.folder_name,
      path: `cat:${root.category_id}`,
      folder_id: root.folder_id,
      category_id: root.category_id,
      description: root.description || "",
      children: childNodes,
    });
  });

  return tree;
}

// Match document to folder path using schema-aligned path format
// If strict=true, only match docs at the exact leaf level (not parent folders that have children)
export function docMatchesFolder(doc, folderPath, strict = false) {
  // Parse the structured path: cat:X, cat:X/type:Y, cat:X/type:Y/year:Z
  const parts = folderPath.split("/");
  const catPart = parts.find((p) => p.startsWith("cat:"));
  const typePart = parts.find((p) => p.startsWith("type:"));
  const yearPart = parts.find((p) => p.startsWith("year:"));

  const catId = catPart ? Number(catPart.split(":")[1]) : null;
  const typeId = typePart ? Number(typePart.split(":")[1]) : null;
  const year = yearPart ? yearPart.split(":")[1] : null;

  if (catId && doc.category_id !== catId) return false;
  if (typeId && doc.type_id !== typeId) return false;
  if (year && doc.tahunAjaran !== year) return false;

  // If only category specified, match all docs in that category
  if (catId && !typeId) return doc.category_id === catId;
  // If category+type, match docs with that type
  if (catId && typeId && !year) return doc.category_id === catId && doc.type_id === typeId;
  // If all three, exact match
  return true;
}

// Strict matching: only show docs at leaf folder level
// For Data Siswa (cat 1) with type selected but no year: don't show docs (they belong in year sub-folders)
export function docMatchesFolderStrict(doc, folderPath, folderHasChildren) {
  if (folderHasChildren) return false; // docs only in leaf folders
  return docMatchesFolder(doc, folderPath);
}

// Helper: get auto-mapped folder path for upload
export function getAutoFolderPath(categoryId, typeId, tahunAjaran) {
  const cat = CATEGORIES.find((c) => c.category_id === categoryId);
  const docType = DOCUMENT_TYPES.find((t) => t.type_id === typeId);
  if (!cat || !docType) return "";

  let path = `${cat.category_name} / ${docType.type_name}`;
  // For Data Siswa, include tahun ajaran
  if (categoryId === 1 && tahunAjaran) {
    path += ` / ${tahunAjaran}`;
  }
  return path;
}

// Helper: get folder_id for a document based on category and type
export function getFolderIdForDocument(categoryId, typeId) {
  const folder = FOLDERS.find((f) => f.category_id === categoryId && f.type_id === typeId);
  return folder ? folder.folder_id : null;
}