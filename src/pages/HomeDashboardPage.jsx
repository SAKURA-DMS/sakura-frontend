import AppHeader from "@/components/layout/AppHeader";
import { Card, CardContent } from "@/components/ui/card";

import {
  Archive,
  ShieldCheck,
  Building2,
  MapPin,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
} from "lucide-react";

import logoSakura from "@/assets/logo_sakura.png";
import schoolBuilding from "@/assets/school_building.jpg";

export default function HomeDashboardPage() {
  return (
    <>
      <AppHeader
        title="Tentang SAKURA"
        subtitle="Informasi sistem dan profil sekolah"
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

        {/* =========================================================
            INFORMASI SISTEM SAKURA
        ========================================================= */}

        <Card className="rounded-2xl border-border shadow-soft overflow-hidden">

          {/* HEADER IDENTITAS SAKURA */}
          <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/[0.09] via-card to-primary/[0.03]">

            {/* Dekorasi background */}
            <div
              className="
                absolute
                -right-20
                -top-24
                w-64
                h-64
                rounded-full
                border
                border-primary/10
                pointer-events-none
              "
              aria-hidden="true"
            />

            <div
              className="
                absolute
                right-24
                -bottom-28
                w-52
                h-52
                rounded-full
                bg-primary/[0.04]
                pointer-events-none
              "
              aria-hidden="true"
            />

            <div
              className="
                absolute
                right-[28%]
                top-8
                text-primary/10
                pointer-events-none
              "
              aria-hidden="true"
            >
              <Sparkles size={34} />
            </div>

            <div className="relative z-10 p-6 lg:p-8">

              <div className="flex flex-col sm:flex-row sm:items-center gap-5">

                {/* Logo */}
                <div className="relative shrink-0">

                  <div
                    className="
                      absolute
                      inset-0
                      rounded-2xl
                      bg-primary/10
                      blur-lg
                      scale-110
                    "
                  />

                  <div
                    className="
                      relative
                      w-[74px]
                      h-[74px]
                      rounded-2xl
                      bg-card
                      border
                      border-primary/15
                      shadow-sm
                      flex
                      items-center
                      justify-center
                      p-1.5
                    "
                  >
                    <img
                      src={logoSakura}
                      alt="Logo SAKURA"
                      className="
                        w-full
                        h-full
                        rounded-xl
                        object-cover
                      "
                    />
                  </div>

                </div>

                {/* Nama sistem */}
                <div className="min-w-0">

                  <div
                    className="
                      inline-flex
                      items-center
                      gap-2
                      px-2.5
                      py-1
                      mb-2
                      rounded-full
                      bg-primary/10
                      text-primary
                    "
                  >
                    <Archive size={12} />

                    <span
                      className="
                        text-[10px]
                        uppercase
                        tracking-[0.14em]
                        font-bold
                      "
                    >
                      Document Management System
                    </span>
                  </div>

                  <h1
                    className="
                      text-2xl
                      lg:text-3xl
                      font-extrabold
                      text-foreground
                      tracking-[0.08em]
                    "
                  >
                    SAKURA
                  </h1>

                  <p
                    className="
                      text-muted-foreground
                      text-sm
                      lg:text-[15px]
                      mt-1
                      leading-relaxed
                      max-w-3xl
                    "
                  >
                    Secure Archiving and Keeping of Unified Records for
                    Administration
                  </p>

                </div>
              </div>
            </div>
          </div>


          <CardContent className="p-6 lg:p-8">

            {/* =====================================================
                TENTANG SISTEM
            ===================================================== */}

            <div
              className="
                grid
                grid-cols-1
                lg:grid-cols-[minmax(0,1fr)_300px]
                gap-8
              "
            >

              {/* Deskripsi */}
              <div>

                <div className="flex items-center gap-3 mb-4">

                  <div
                    className="
                      w-10
                      h-10
                      rounded-xl
                      bg-primary/10
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <BookOpen
                      size={19}
                      className="text-primary"
                    />
                  </div>

                  <div>

                    <h2
                      className="
                        text-lg
                        font-bold
                        text-foreground
                      "
                    >
                      Tentang Sistem
                    </h2>

                    <p
                      className="
                        text-xs
                        text-muted-foreground
                        mt-0.5
                      "
                    >
                      Sistem pengelolaan arsip digital sekolah
                    </p>

                  </div>
                </div>


                <div
                  className="
                    space-y-3
                    text-sm
                    text-muted-foreground
                    leading-relaxed
                  "
                >

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


              {/* Highlight sistem */}
              <div className="grid grid-cols-1 gap-3 self-start">

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    p-4
                    rounded-xl
                    bg-primary/[0.035]
                    border
                    border-primary/10
                  "
                >

                  <div
                    className="
                      w-10
                      h-10
                      rounded-xl
                      bg-primary/10
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <Archive
                      size={18}
                      className="text-primary"
                    />
                  </div>

                  <div>

                    <p
                      className="
                        text-[13px]
                        font-semibold
                        text-foreground
                      "
                    >
                      Arsip Terpusat
                    </p>

                    <p
                      className="
                        text-[11px]
                        text-muted-foreground
                        mt-0.5
                        leading-relaxed
                      "
                    >
                      Dokumen tersimpan secara terorganisasi dalam satu sistem.
                    </p>

                  </div>

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-3
                    p-4
                    rounded-xl
                    bg-primary/[0.035]
                    border
                    border-primary/10
                  "
                >

                  <div
                    className="
                      w-10
                      h-10
                      rounded-xl
                      bg-primary/10
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >
                    <ShieldCheck
                      size={18}
                      className="text-primary"
                    />
                  </div>

                  <div>

                    <p
                      className="
                        text-[13px]
                        font-semibold
                        text-foreground
                      "
                    >
                      Aman & Terstruktur
                    </p>

                    <p
                      className="
                        text-[11px]
                        text-muted-foreground
                        mt-0.5
                        leading-relaxed
                      "
                    >
                      Mendukung pengelolaan dan kontrol dokumen administrasi.
                    </p>

                  </div>

                </div>

              </div>
            </div>


            {/* Divider */}
            <div className="h-px bg-border my-8" />


            {/* =====================================================
                PENGEMBANG SISTEM
            ===================================================== */}

            <div>

              <div className="flex items-center gap-3 mb-5">

                <div
                  className="
                    w-10
                    h-10
                    rounded-xl
                    bg-primary/10
                    flex
                    items-center
                    justify-center
                  "
                >
                  <Users
                    size={19}
                    className="text-primary"
                  />
                </div>

                <div>

                  <h2
                    className="
                      text-lg
                      font-bold
                      text-foreground
                    "
                  >
                    Pengembang Sistem
                  </h2>

                  <p
                    className="
                      text-xs
                      text-muted-foreground
                      mt-0.5
                    "
                  >
                    Capstone Design Project
                  </p>

                </div>
              </div>


              <div
                className="
                  rounded-2xl
                  border
                  border-border
                  bg-muted/20
                  overflow-hidden
                "
              >

                {/* Universitas & Fakultas */}
                <div
                  className="
                    p-4
                    lg:p-5
                    border-b
                    border-border
                  "
                >

                  <div className="flex items-start gap-3">

                    <div
                      className="
                        w-10
                        h-10
                        rounded-xl
                        bg-card
                        border
                        border-border
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >
                      <GraduationCap
                        size={19}
                        className="text-primary"
                      />
                    </div>

                    <div>

                      <p
                        className="
                          text-[14px]
                          font-bold
                          text-foreground
                        "
                      >
                        President University
                      </p>

                      <p
                        className="
                          text-xs
                          text-muted-foreground
                          mt-1
                        "
                      >
                        Faculty of Artificial Intelligence and Smart Manufacturing
                      </p>

                    </div>

                  </div>

                </div>


                {/* Tim dan pembimbing */}
                <div className="grid grid-cols-1 md:grid-cols-2">

                  <div
                    className="
                      p-4
                      lg:p-5
                      md:border-r
                      border-border
                    "
                  >

                    <p
                      className="
                        text-[10px]
                        uppercase
                        tracking-[0.14em]
                        font-bold
                        text-muted-foreground
                        mb-3
                      "
                    >
                      Tim Pengembang
                    </p>

                    <div
                      className="
                        text-[13px]
                        text-foreground
                        leading-7
                      "
                    >
                      <p>Aroliani Munte</p>
                      <p>Alfina Hilma Zein</p>
                      <p>Satwika Zahrani Putri</p>
                    </div>

                  </div>


                  <div
                    className="
                      p-4
                      lg:p-5
                      border-t
                      md:border-t-0
                      border-border
                    "
                  >

                    <p
                      className="
                        text-[10px]
                        uppercase
                        tracking-[0.14em]
                        font-bold
                        text-muted-foreground
                        mb-3
                      "
                    >
                      Dosen Pembimbing
                    </p>

                    <p
                      className="
                        text-[13px]
                        font-semibold
                        text-foreground
                      "
                    >
                      Mrs. Rosalina, S.Kom., M.Kom.
                    </p>

                  </div>

                </div>

              </div>
            </div>

          </CardContent>
        </Card>


        {/* =========================================================
            INFORMASI SEKOLAH
        ========================================================= */}

        <Card className="rounded-2xl border-border shadow-soft overflow-hidden">

          <CardContent className="p-0">

            {/* Foto sekolah */}
            <div className="relative h-56 md:h-72 overflow-hidden">

              <img
                src={schoolBuilding}
                alt="Gedung SMP Negeri 4 Cikarang Barat"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-black/50
                  via-black/5
                  to-transparent
                "
              />

              <div className="absolute left-6 bottom-5">

                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-3
                    py-1.5
                    rounded-full
                    bg-white/90
                    backdrop-blur-sm
                    shadow-sm
                  "
                >

                  <Building2
                    size={14}
                    className="text-primary"
                  />

                  <span
                    className="
                      text-[11px]
                      font-semibold
                      text-foreground
                    "
                  >
                    Institusi Pengguna SAKURA
                  </span>

                </div>

              </div>

            </div>


            {/* Informasi sekolah */}
            <div className="p-6 lg:p-8">

              {/* School heading */}
              <div
                className="
                  flex
                  flex-col
                  sm:flex-row
                  sm:items-center
                  gap-4
                  mb-7
                "
              >

                <div
                  className="
                    w-14
                    h-14
                    rounded-2xl
                    border
                    border-primary/15
                    bg-primary/5
                    flex
                    items-center
                    justify-center
                    p-1.5
                    shrink-0
                  "
                >

                  <img
                    src={logoSakura}
                    alt="Logo SAKURA"
                    className="
                      w-full
                      h-full
                      rounded-xl
                      object-cover
                    "
                  />

                </div>


                <div>

                  <h2
                    className="
                      text-xl
                      font-bold
                      text-foreground
                    "
                  >
                    SMP Negeri 4 Cikarang Barat
                  </h2>

                  <div
                    className="
                      flex
                      items-center
                      gap-1.5
                      mt-1
                      text-muted-foreground
                    "
                  >

                    <MapPin size={13} />

                    <span className="text-sm">
                      Kabupaten Bekasi, Jawa Barat
                    </span>

                  </div>

                </div>

              </div>


              {/* Detail informasi */}
              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-3
                  gap-3
                  mb-6
                "
              >

                {/* Alamat */}
                <div
                  className="
                    md:col-span-2
                    p-4
                    rounded-xl
                    bg-muted/35
                    border
                    border-border/70
                  "
                >

                  <p
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.12em]
                      font-bold
                      text-muted-foreground
                      mb-1.5
                    "
                  >
                    Alamat
                  </p>

                  <p
                    className="
                      text-[13px]
                      font-medium
                      text-foreground
                      leading-relaxed
                    "
                  >
                    Kp. Kali Jeruk, Desa Kalijaya, Kec. Cikarang Barat,
                    Kab. Bekasi, Jawa Barat
                  </p>

                </div>


                {/* NPSN */}
                <div
                  className="
                    p-4
                    rounded-xl
                    bg-muted/35
                    border
                    border-border/70
                  "
                >

                  <p
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.12em]
                      font-bold
                      text-muted-foreground
                      mb-1.5
                    "
                  >
                    NPSN
                  </p>

                  <p
                    className="
                      text-[13px]
                      font-semibold
                      text-foreground
                    "
                  >
                    20218452
                  </p>

                </div>


                {/* Status */}
                <div
                  className="
                    md:col-span-3
                    p-4
                    rounded-xl
                    bg-muted/35
                    border
                    border-border/70
                  "
                >

                  <p
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.12em]
                      font-bold
                      text-muted-foreground
                      mb-1.5
                    "
                  >
                    Status
                  </p>

                  <p
                    className="
                      text-[13px]
                      font-medium
                      text-foreground
                    "
                  >
                    Sekolah Negeri · Jenjang SMP
                  </p>

                </div>

              </div>


              {/* Deskripsi sekolah */}
              <div
                className="
                  flex
                  gap-3
                  p-4
                  rounded-xl
                  border
                  border-primary/10
                  bg-primary/[0.025]
                "
              >

                <Building2
                  size={18}
                  className="
                    text-primary
                    shrink-0
                    mt-0.5
                  "
                />

                <p
                  className="
                    text-sm
                    text-muted-foreground
                    leading-relaxed
                  "
                >
                  SMP Negeri 4 Cikarang Barat berkomitmen mendukung
                  digitalisasi administrasi sekolah untuk meningkatkan
                  efisiensi, transparansi, serta keamanan dalam pengelolaan
                  dokumen administrasi.
                </p>

              </div>

            </div>

          </CardContent>

        </Card>

      </div>
    </>
  );
}