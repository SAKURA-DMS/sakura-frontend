import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Building, Hash, Clock, ArrowLeft } from "lucide-react";
import logoSakura from "@/assets/logo_sakura.png";
import SakuraPetals from "@/components/sakura/SakuraPetals";
import { useApp } from "@/contexts/AppContext";
import sakuraBg from "@/assets/sakura_branch.png";
import { DEPARTEMEN_OPTIONS } from "@/data/departemenOptions";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { registerUser } = useApp();
  const [showPass, setShowPass] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nama: "", nip: "", email: "", password: "", confirmPassword: "",
  });
  const [departemenSelect, setDepartemenSelect] = useState("");
  const [departemenCustom, setDepartemenCustom] = useState("");

  const update = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  // Saat pilihan dropdown berubah keluar dari "Lainnya", reset textbox custom
  // supaya tidak ada sisa nilai lama yang ikut ke-submit.
  const handleDepartemenSelectChange = (value) => {
    setDepartemenSelect(value);
    if (value !== "Lainnya") {
      setDepartemenCustom("");
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.nama || !formData.nip || !formData.email || !departemenSelect || !formData.password || !formData.confirmPassword) {
      setError("Semua field wajib diisi."); return;
    }
    if (departemenSelect === "Lainnya" && !departemenCustom.trim()) {
      setError("Silakan isi nama departemen."); return;
    }
    if (!/^\d{18}$/.test(formData.nip)) {
      setError("NIP harus 18 digit angka."); return;
    }
    if (formData.password.length < 8) {
      setError("Kata sandi minimal 8 karakter."); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok."); return;
    }

    const finalDepartemen = departemenSelect === "Lainnya" ? departemenCustom.trim() : departemenSelect;

    setSubmitting(true);
    try {
      await registerUser({
        nama: formData.nama,
        nip: formData.nip,
        email: formData.email,
        departemen: finalDepartemen,
        password: formData.password,
        role: "Guru",
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Pendaftaran gagal. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-muted-foreground mb-6">
            Akun Anda sedang menunggu persetujuan dari Operator TU. Anda akan mendapat notifikasi setelah akun diaktifkan.
          </p>
          <button onClick={() => navigate("/")} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-center w-5/12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "hsl(340 73% 65%)" }} />
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${sakuraBg})`, opacity: 0.55 }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(340 60% 30% / 0.45) 0%, hsl(340 55% 25% / 0.70) 60%, hsl(340 50% 20% / 0.85) 100%)" }} />

        <SakuraPetals count={10} />

        <div className="relative px-12 py-16 z-10">
          <div className="flex items-center gap-3 mb-10">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-white shadow-lg ring-2 ring-white/40 flex items-center justify-center hover:scale-110 hover:rotate-12 transition-transform">
                <img src={logoSakura} alt="SAKURA" className="w-10 h-10 rounded-lg" />
              </div>
              <div className="text-left">
                <div className="text-white font-bold text-xl tracking-wider drop-shadow">SAKURA</div>
                <div className="text-white/80 text-xs font-medium">Document Management System</div>
              </div>
            </button>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-[1.15] mb-4">Daftar Akun Baru</h1>
          <p className="text-white/80 text-base leading-relaxed max-w-lg">
            Bergabung dengan SAKURA untuk mengelola dokumen administrasi sekolah secara digital.
          </p>
          <p className="mt-auto text-white/50 text-[11px] pt-12 font-medium">© 2026 SAKURA · Developed by Group 5</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 bg-background py-8 h-screen overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <button onClick={() => navigate("/")} className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white shadow-md ring-1 ring-primary/20 flex items-center justify-center">
              <img src={logoSakura} alt="SAKURA" className="w-10 h-10 rounded-lg" />
            </div>
            <span className="text-xl font-bold tracking-wider" style={{ color: "hsl(347 45% 38%)" }}>SAKURA</span>
          </button>

          {/* Kembali */}
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-medium hover:underline transition-colors"
              style={{ color: "hsl(347 45% 38%)" }}
            >
              <ArrowLeft size={15} />
              Kembali
            </button>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1 lg:text-left text-center">Daftar Akun Guru</h2>
          <p className="text-muted-foreground mb-6 text-sm lg:text-left text-center">Akun akan diaktifkan oleh Operator TU setelah pendaftaran</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nama Lengkap *</label>
              <div className="relative group">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input required value={formData.nama} onChange={(e) => update("nama", e.target.value)} type="text" placeholder="Masukkan nama lengkap" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">NIP (Nomor Induk Pegawai) *</label>
              <div className="relative group">
                <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input required value={formData.nip} onChange={(e) => update("nip", e.target.value.replace(/\D/g, "").slice(0, 18))} type="text" placeholder="18 digit angka" maxLength={18} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email Institusi *</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input required value={formData.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="nama@sakura.sch.id" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Departemen / Mata Pelajaran *</label>
              <div className="relative group">
                <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <select required value={departemenSelect} onChange={(e) => handleDepartemenSelectChange(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all appearance-none">
                  <option value="">Pilih departemen</option>
                  {DEPARTEMEN_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {departemenSelect === "Lainnya" && (
                <div className="relative group mt-2">
                  <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    value={departemenCustom}
                    onChange={(e) => setDepartemenCustom(e.target.value)}
                    type="text"
                    placeholder="Masukkan nama mata pelajaran atau departemen"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Kata Sandi *</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input required value={formData.password} onChange={(e) => update("password", e.target.value)} type={showPass ? "text" : "password"} placeholder="Minimal 8 karakter" className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Konfirmasi Kata Sandi *</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input required value={formData.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} type="password" placeholder="Ulangi kata sandi" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all" />
              </div>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity text-white mt-4 disabled:opacity-60" style={{ background: "hsl(347 55% 42%)" }}>
              {submitting ? "Memproses..." : "Daftar Akun"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">Sudah punya akun?{" "}<button onClick={() => navigate("/login")} className="font-semibold hover:underline" style={{ color: "hsl(347 45% 38%)" }}>Masuk di sini</button></p>
          <div className="border-t border-border/50 mt-6" />
          <p className="text-center text-xs text-muted-foreground py-4">© 2026 SAKURA · Developed by Group 5</p>
        </div>
      </div>
    </div>
  );
}