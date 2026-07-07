import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff, Save, ShieldAlert } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

export default function ChangePasswordPage() {
  const { changePassword, currentUser } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  // Halaman ini bisa diakses lewat 2 jalur: (1) dipaksa oleh ProtectedRoute
  // karena akun masih memakai password default/awal, atau (2) dibuka manual
  // dari menu Pengaturan Akun. Simpan status "forced" di awal render supaya
  // tetap konsisten selama proses submit, walau flag di context sudah
  // di-reset ke false segera setelah password berhasil diganti.
  const [forcedFlow] = useState(!!currentUser?.mustChangePassword);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!currentPw) e.currentPw = "Password saat ini wajib diisi";
    if (!newPw) e.newPw = "Password baru wajib diisi";
    else if (newPw.length < 6) e.newPw = "Password minimal 6 karakter";
    if (newPw !== confirmPw) e.confirmPw = "Konfirmasi password tidak cocok";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrors({});
    try {
      await changePassword(currentPw, newPw);
      toast({ title: "Password berhasil diubah" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      // Alur wajib-ganti-password pertama kali: setelah berhasil, langsung
      // masuk ke Dashboard. Alur ganti password biasa (dari menu Pengaturan
      // Akun) tetap di halaman ini seperti sebelumnya.
      if (forcedFlow) {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const msg = err.message || "Gagal mengubah password";
      if (
        msg.toLowerCase().includes("lama") ||
        msg.toLowerCase().includes("old") ||
        msg.toLowerCase().includes("salah")
      ) {
        setErrors({ currentPw: "Password saat ini tidak sesuai" });
      } else {
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const pwField = (label, value, setter, show, toggleShow, errorKey) => (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => {
            setter(e.target.value);
            setErrors((p) => ({ ...p, [errorKey]: undefined }));
          }}
          className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          placeholder={label}
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[errorKey] && (
        <p className="text-xs text-destructive mt-1">{errors[errorKey]}</p>
      )}
    </div>
  );

  return (
    <>
      <AppHeader title="Ubah Password" subtitle="Perbarui password akun Anda" />
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto animate-fade-in">
        <div className="max-w-xl mx-auto">
          {forcedFlow && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-sakura-warning/30 bg-sakura-warning/[0.08] p-4">
              <ShieldAlert size={18} className="text-sakura-warning shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed">
                Akun Anda masih menggunakan password awal. Untuk keamanan, silakan ganti password terlebih dahulu sebelum melanjutkan ke Dashboard.
              </p>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <KeyRound size={18} className="text-primary" /> Ubah Password
            </h3>

            {pwField(
              "Password Saat Ini",
              currentPw,
              setCurrentPw,
              showCurrent,
              () => setShowCurrent(!showCurrent),
              "currentPw"
            )}
            {pwField(
              "Password Baru",
              newPw,
              setNewPw,
              showNew,
              () => setShowNew(!showNew),
              "newPw"
            )}
            {pwField(
              "Konfirmasi Password Baru",
              confirmPw,
              setConfirmPw,
              showConfirm,
              () => setShowConfirm(!showConfirm),
              "confirmPw"
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Menyimpan..." : "Simpan Password"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
