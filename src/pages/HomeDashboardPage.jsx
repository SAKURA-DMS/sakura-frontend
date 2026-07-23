import { useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, ShieldCheck, Building2, MapPin, GraduationCap, Users, BookOpen, CalendarDays, Award, Maximize2, Mail, ExternalLink, Navigation, X } from "lucide-react";
import logoSakura from "@/assets/logo_sakura.png";
import logoSMP from "@/assets/logosmpn4.jpg";
import schoolPlang from "@/assets/school_plang.jpg";

export default function HomeDashboardPage() {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const schoolLatitude = "-6.2629";
  const schoolLongitude = "107.1305";

  const mapsEmbedUrl =
    `https://www.google.com/maps?q=${schoolLatitude},${schoolLongitude}&z=16&output=embed`;

  const mapsDirectionUrl =
    `https://www.google.com/maps/search/?api=1&query=${schoolLatitude},${schoolLongitude}`;

  const officialProfileUrl =
    "https://sekolah.data.kemendikdasmen.go.id/profil-sekolah/90036C14-2CF5-E011-8736-7121EC53565B";

  return (
    <>
      <AppHeader
        title="Tentang SAKURA"
        subtitle="Informasi sistem dan profil sekolah"
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {/* INFORMASI SISTEM SAKURA */}
        <Card className="rounded-2xl border-border shadow-soft overflow-hidden">
          <div className="relative overflow-hidden border-b border-border bg-primary/8 dark:bg-primary/10 min-h-[170px]">
            <div
              className="absolute inset-0 pointer-events-none select-none"
              aria-hidden="true"
            >
              <img
                src="/branchwelcoming.png"
                alt=""
                className="absolute -right-2 -top-6 w-[360px] lg:w-[440px] max-w-[46%] h-auto object-contain object-top-right opacity-40"
              />

              <span className="absolute right-[31%] top-[24%] text-primary/20 text-lg rotate-[-20deg]">
                ❀
              </span>

              <span className="absolute right-[38%] top-[48%] text-primary/15 text-xs rotate-[25deg]">
                ❀
              </span>

              <span className="absolute right-[27%] top-[72%] text-primary/15 text-sm rotate-[45deg]">
                ❀
              </span>
            </div>

            <div className="relative z-10 p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Logo */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-lg scale-110" />

                  <div className="relative w-[74px] h-[74px] rounded-2xl bg-card border border-primary/15 shadow-sm flex items-center justify-center p-1.5">
                    <img
                      src={logoSakura}
                      alt="Logo SAKURA"
                      className="w-full h-full rounded-xl object-cover"
                    />
                  </div>
                </div>

                {/* Nama sistem */}
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-2 rounded-full bg-primary/10 text-primary">
                    <Archive size={12} />
                    <span className="text-[10px] uppercase tracking-[0.14em] font-bold">
                      Document Management System
                    </span>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-[0.08em]">
                    SAKURA
                  </h1>

                  <p className="text-muted-foreground text-sm lg:text-[15px] mt-1 leading-relaxed max-w-3xl">
                    Secure Archiving and Keeping of Unified Records for Administration
                  </p>
                </div>

              </div>
            </div>
          </div>

          <CardContent className="p-6 lg:p-8">

            {/* Tentang Sistem */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8">

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen size={19} className="text-primary" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Tentang Sistem
                    </h2>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sistem pengelolaan arsip digital sekolah
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    SAKURA adalah sistem manajemen arsip digital yang
                    dikembangkan untuk membantu SMP Negeri 4 Cikarang Barat
                    dalam menyimpan, mengelola, dan mengorganisasi dokumen
                    administrasi secara terpusat, aman, dan terstruktur.
                  </p>

                  <p>
                    Sistem ini dikembangkan sebagai bagian dari proyek
                    Capstone Design untuk mendukung digitalisasi proses
                    administrasi sekolah yang sebelumnya masih dilakukan
                    secara manual.
                  </p>
                </div>
              </div>

              {/* Highlight */}
              <div className="grid grid-cols-1 gap-3 self-start">

                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/[0.035] border border-primary/10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Archive size={18} className="text-primary" />
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-foreground">
                      Arsip Terpusat
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Dokumen tersimpan secara terorganisasi dalam satu sistem.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/[0.035] border border-primary/10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-primary" />
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-foreground">
                      Aman & Terstruktur
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Mendukung pengelolaan dan kontrol dokumen administrasi.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="h-px bg-border my-8" />

            {/* Pengembang Sistem */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users size={19} className="text-primary" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Pengembang Sistem
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Capstone Design Project
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">

                <div className="p-4 lg:p-5 border-b border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                      <GraduationCap size={19} className="text-primary" />
                    </div>

                    <div>
                      <p className="text-[14px] font-bold text-foreground">
                        President University
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Faculty of Artificial Intelligence and Smart Manufacturing
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-4 lg:p-5 md:border-r border-border">
                    <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-3">
                      Tim Pengembang
                    </p>

                    <div className="text-[13px] text-foreground leading-7">
                      <p>Aroliani Munte</p>
                      <p>Alfina Hilma Zein</p>
                      <p>Satwika Zahrani Putri</p>
                    </div>
                  </div>

                  <div className="p-4 lg:p-5 border-t md:border-t-0 border-border">
                    <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-3">
                      Dosen Pembimbing
                    </p>

                    <p className="text-[13px] font-semibold text-foreground">
                      Mrs. Rosalina, S.Kom., M.Kom.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </CardContent>
        </Card>

        {/* PROFIL SEKOLAH */}
        <Card className="rounded-2xl border-border shadow-soft overflow-hidden">
          <CardContent className="p-0">
            <div
              className="relative h-56 md:h-72 overflow-hidden cursor-zoom-in group"
              onClick={() => setImagePreviewOpen(true)}
              title="Klik untuk melihat foto penuh"
            >
              <img
                src={schoolPlang}
                alt="Papan Nama SMP Negeri 4 Cikarang Barat"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

              <div className="absolute left-6 bottom-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                  <Building2 size={14} className="text-primary" />
                  <span className="text-[11px] font-semibold text-foreground">
                    Institusi Pengguna SAKURA
                  </span>
                </div>
              </div>

              <div className="absolute right-5 top-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/55 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Maximize2 size={15} />
                <span className="text-xs font-medium">
                  Lihat Foto Penuh
                </span>
              </div>
            </div>

            <div className="p-6 lg:p-8">

              {/* School heading */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-7">

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl border border-primary/15 bg-primary/5 flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src={logoSMP}
                      alt="Logo SMPN 4 Cikarang Barat"
                      className="w-full h-full rounded-xl object-cover"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      SMP Negeri 4 Cikarang Barat
                    </h2>

                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      <MapPin size={13} />
                      <span className="text-sm">
                        Kabupaten Bekasi, Jawa Barat
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={officialProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] text-primary text-xs font-semibold hover:bg-primary/10 transition-colors shrink-0"
                >
                  Profil Resmi Sekolah
                  <ExternalLink size={14} />
                </a>

              </div>

              {/* School info cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

                <SchoolInfoCard
                  icon={Building2}
                  label="NPSN"
                  value="20218452"
                />

                <SchoolInfoCard
                  icon={Award}
                  label="Akreditasi"
                  value="A"
                />

                <SchoolInfoCard
                  icon={CalendarDays}
                  label="Tanggal Pendirian"
                  value="20 April 2005"
                />

                <SchoolInfoCard
                  icon={Maximize2}
                  label="Luas Tanah"
                  value="10.000 m²"
                />

              </div>

              {/* Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-7">

                <div className="p-4 rounded-xl bg-muted/35 border border-border/70">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin size={17} className="text-primary" />
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground mb-1">
                        Alamat Sekolah
                      </p>

                      <p className="text-[13px] font-medium text-foreground leading-relaxed">
                        Kp. Kali Jeruk, Desa Kalijaya, Kecamatan Cikarang Barat,
                        Kabupaten Bekasi, Jawa Barat 17520
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/35 border border-border/70">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail size={17} className="text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground mb-1">
                        Email
                      </p>

                      <p className="text-[13px] font-medium text-foreground break-all">
                        smpnegeri4cikarangbarat@gmail.com
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Deskripsi */}
              <div className="flex gap-3 p-4 rounded-xl border border-primary/10 bg-primary/[0.025] mb-7">
                <Building2
                  size={18}
                  className="text-primary shrink-0 mt-0.5"
                />

                <p className="text-sm text-muted-foreground leading-relaxed">
                  SMP Negeri 4 Cikarang Barat merupakan sekolah menengah
                  pertama berstatus negeri yang berada di Kecamatan Cikarang
                  Barat, Kabupaten Bekasi, Jawa Barat. Sekolah menjadi
                  institusi pengguna SAKURA dalam mendukung digitalisasi dan
                  pengelolaan dokumen administrasi secara lebih terstruktur.
                </p>
              </div>

              {/* LOCATION / MAPS */}
              <div className="rounded-2xl border border-border overflow-hidden">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-muted/25 border-b border-border">

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin size={18} className="text-primary" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Lokasi Sekolah
                      </h3>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Kalijaya, Cikarang Barat, Kabupaten Bekasi
                      </p>
                    </div>
                  </div>

                  <a
                    href={mapsDirectionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Navigation size={13} />
                    Buka di Google Maps
                  </a>

                </div>

                {/* Google Maps Embed */}
                <div className="relative w-full h-[300px] lg:h-[360px] bg-muted">
                  <iframe
                    title="Lokasi SMP Negeri 4 Cikarang Barat"
                    src={mapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 w-full h-full"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-card border-t border-border">
                  <p className="text-[11px] text-muted-foreground">
                    Koordinat lokasi berdasarkan data referensi sekolah
                  </p>

                  <p className="text-[11px] font-medium text-foreground">
                    {schoolLatitude}, {schoolLongitude}
                  </p>
                </div>

              </div>
            </div>

          </CardContent>
        </Card>

      </div>

      {/* FULLSCREEN IMAGE PREVIEW */}

      {imagePreviewOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
          onClick={() => setImagePreviewOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImagePreviewOpen(false);
            }}
            className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Tutup foto"
          >
            <X size={23} />
          </button>

          <div
            className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={schoolPlang}
              alt="Papan Nama SMP Negeri 4 Cikarang Barat"
              className="max-w-[95vw] max-h-[88vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
            />
          </div>

          {/* Caption */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 max-w-[90vw] px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white text-center pointer-events-none">
            <p className="text-sm font-semibold">
              SMP Negeri 4 Cikarang Barat
            </p>
            <p className="text-[11px] text-white/70 mt-0.5">
              Klik di luar gambar untuk menutup
            </p>
          </div>
        </div>
      )}

    </>
  );
}

/* SCHOOL INFO CARD */

function SchoolInfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="p-4 rounded-xl bg-muted/35 border border-border/70">

      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon
            size={15}
            className="text-primary"
          />
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground">
        {label}
      </p>

      <p className="text-[13px] lg:text-sm font-semibold text-foreground mt-1">
        {value}
      </p>

    </div>
  );
}