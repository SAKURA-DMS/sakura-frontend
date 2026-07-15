import AppHeader from "@/components/layout/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import logoSakura from "@/assets/logo_sakura.png";
import schoolBuilding from "@/assets/school_building.jpg";

export default function HomeDashboardPage() {
  return (
    <>
      <AppHeader title="Beranda" subtitle="SMP Negeri 4 Cikarang Barat" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">

        {/* Section 1 — System Information */}
        <div>
          <Card className="rounded-2xl border-border shadow-soft overflow-hidden">
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center gap-4">
                <img src={logoSakura} alt="Logo SAKURA" className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-secondary" />
                <div>
                  <h1 className="text-2xl font-extrabold text-foreground tracking-wider">SAKURA</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Secure Archiving and Keeping of Unified Records for Administration
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">Tentang Sistem</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  SAKURA adalah sistem manajemen arsip digital yang dikembangkan untuk membantu SMP Negeri 4 Cikarang Barat dalam menyimpan, mengelola, dan mengorganisasi dokumen administrasi secara terpusat, aman, dan terstruktur.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sistem ini dirancang sebagai bagian dari proyek Capstone Design di bidang Ilmu Komputer, dengan tujuan mendigitalisasi proses administrasi sekolah yang sebelumnya dilakukan secara manual.
                </p>
              </div>

              {/* Developer Section */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">Pengembang Sistem</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Dikembangkan oleh mahasiswa Faculty of Computer Science, President University.
                </p>
                <div className="rounded-2xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold text-foreground">No.</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">Nama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        ["1", "Aroliani Munte"],
                        ["2", "Alfina Hilma Zein"],
                        ["3", "Satwika Zahrani Putri"],
                      ].map(([no, nama]) => (
                        <tr key={nama}>
                          <td className="px-4 py-3 text-muted-foreground">{no}</td>
                          <td className="px-4 py-3 text-foreground font-medium">{nama}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium text-foreground">Dosen Pembimbing:</span>{" "}
                  Mrs. Rosalina, S.Kom., M.Kom.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2 — School Information */}
        <div>
          <Card className="rounded-2xl border-border shadow-soft overflow-hidden">
            <CardContent className="p-0 overflow-hidden">
              <div className="relative">
                <img
                  src={schoolBuilding}
                  alt="Gedung SMP Negeri 4 Cikarang Barat"
                  className="w-full h-64 md:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
              </div>
              <div className="p-6 lg:p-8 space-y-4">
                <div className="flex items-center gap-4">
                  <img src={logoSakura} alt="Logo Sekolah" className="w-12 h-12 rounded-xl object-cover shrink-0 bg-secondary" />
                  <div>
                    <h2 className="text-xl font-bold text-foreground">SMP Negeri 4 Cikarang Barat</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Kab. Bekasi, Jawa Barat</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    ["Alamat", "Kp. Kali Jeruk, Desa Kalijaya, Kec. Cikarang Barat, Kab. Bekasi, Jawa Barat"],
                    ["NPSN", "20218452"],
                    ["Status", "Sekolah Negeri, Jenjang SMP"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-muted-foreground text-xs font-medium">{label}</span>
                      <p className="font-medium text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed">
                  SMP Negeri 4 Cikarang Barat berkomitmen pada digitalisasi administrasi sekolah demi transparansi, efisiensi, dan keamanan pengelolaan dokumen akademik.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}