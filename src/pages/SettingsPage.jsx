import { useState, useEffect } from "react";
import * as authService from "@/services/authService";
import { Sun, Moon, Monitor, Bell, Camera, Shield, ChevronRight, Mail, CheckCircle2, Lock, Send, KeyRound, Smartphone, Info, AlertTriangle, RefreshCw, Eye, EyeOff, X } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useSettings } from "@/contexts/SettingsContext";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

const SECTIONS = [
  { id: "tema", label: "Tema", icon: Sun },
  { id: "notif", label: "Notifikasi", icon: Bell },
  { id: "scan", label: "Scan & Upload", icon: Camera },
  { id: "security", label: "Privacy & Security", icon: Shield },
];

/* Step indicator */
function StepBadge({ number, active, done }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
        done
          ? "bg-sakura-success text-white"
          : active
          ? "bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {done ? <CheckCircle2 size={14} /> : number}
    </div>
  );
}

/* Panduan langkah aktivasi */
function ActivationTutorial({ currentStep, email }) {
  const steps = [
    {
      icon: Send,
      title: "Kirim Kode OTP",
      desc: "Klik tombol di samping untuk mengirim kode OTP ke email Anda.",
    },
    {
      icon: Mail,
      title: "Cek Email Anda",
      desc: `Buka email dan salin kode OTP 6 digit yang kami kirimkan ke ${email}.`,
    },
    {
      icon: KeyRound,
      title: "Masukkan Kode OTP",
      desc: "Tempel atau masukkan kode 6 digit untuk memverifikasi dan mengaktifkan 2FA.",
    },
  ];

  return (
    <div className="space-y-3 mt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Langkah-langkah aktivasi Email OTP
      </p>

      {steps.map((step, i) => {
        const Icon = step.icon;
        const stepNum = i + 1;
        const isDone = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <div
            key={i}
            className={`flex gap-3 p-3 rounded-xl border transition-all ${
              isDone
                ? "border-sakura-success/30 bg-sakura-success/[0.04]"
                : isActive
                ? "border-primary/40 bg-primary/[0.04] shadow-sm"
                : "border-border bg-muted/30 opacity-50"
            }`}
          >
            <StepBadge number={stepNum} active={isActive} done={isDone} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon
                  size={14}
                  className={
                    isDone
                      ? "text-sakura-success"
                      : isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                />

                <span
                  className={`text-sm font-semibold ${
                    isDone
                      ? "text-sakura-success"
                      : isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>

                {isDone && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sakura-success/20 text-sakura-success ml-auto">
                    Selesai
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}

      <div className="flex gap-2 p-3 rounded-xl border border-sakura-warning/30 bg-sakura-warning/[0.04] mt-2">
        <AlertTriangle
          size={14}
          className="text-sakura-warning mt-0.5 shrink-0"
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-sakura-warning">
            Jangan bagikan
          </span>{" "}
          kode OTP kepada siapa pun. Jika kehilangan akses ke metode 2FA,
          hubungi Admin Sekolah.
        </p>
      </div>
    </div>
  );
}

/* Countdown OTP */
function CountdownTimer({ seconds = 60, onResend }) {
  const [remaining, setRemaining] = useState(seconds);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    setRemaining(seconds);
    setCanResend(false);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const handleResend = async () => {
    setRemaining(seconds);
    setCanResend(false);

    try {
      await onResend();
    } catch {
      setRemaining(0);
      setCanResend(true);
    }
  };

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      {canResend ? (
        <button
          type="button"
          onClick={handleResend}
          className="flex items-center gap-1 text-primary font-medium hover:underline"
        >
          <RefreshCw size={12} />
          Kirim ulang kode
        </button>
      ) : (
        <span>
          Kirim ulang kode dalam{" "}
          <span className="font-semibold text-foreground">
            {mm}:{ss}
          </span>
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    updateNotifications,
    updateScan,
    updateSecurity,
  } = useSettings();

  const { currentUser, setTwoFactorEnabled } = useApp();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState("tema");

  /* 2FA state */
  const enabled = !!currentUser?.twoFactorEnabled;

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  /* Disable 2FA modal */
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);

  const currentStep = !otpSent ? 1 : verified ? 4 : 3;

  const Card = ({ children, title, icon: Icon }) => (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <Icon size={18} className="text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );

  const Toggle = ({ label, checked, onChange, desc }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {desc && (
          <div className="text-xs text-muted-foreground">{desc}</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );

  /* Toggle 2FA */
  const handleToggle2FA = (value) => {
    if (value) {
      setEnabling2FA(true);
      setOtpSent(false);
      setOtp(["", "", "", "", "", ""]);
      setVerified(false);
      return;
    }

    setDisablePassword("");
    setDisableError("");
    setShowDisablePassword(false);
    setDisableModalOpen(true);
  };

  const closeDisableModal = () => {
    if (isDisabling) return;

    setDisableModalOpen(false);
    setDisablePassword("");
    setDisableError("");
    setShowDisablePassword(false);
  };

  const handleDisable2FA = async () => {
    if (!disablePassword.trim()) {
      setDisableError("Masukkan password Anda terlebih dahulu.");
      return;
    }

    setIsDisabling(true);
    setDisableError("");

    try {
      await authService.disable2FA(disablePassword);

      setTwoFactorEnabled(false);
      updateSecurity({ twoFactor: false });

      setOtpSent(false);
      setOtp(["", "", "", "", "", ""]);
      setVerified(false);
      setEnabling2FA(false);

      setDisableModalOpen(false);
      setDisablePassword("");
      setShowDisablePassword(false);

      toast({
        title: "2FA dinonaktifkan",
        description: "Verifikasi dua langkah telah berhasil dimatikan.",
      });
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Password salah atau proses gagal. Silakan coba lagi.";

      setDisableError(message);
    } finally {
      setIsDisabling(false);
    }
  };

  /* Send OTP */
  const handleSendOtp = async () => {
    setIsSending(true);

    try {
      await authService.sendOtp();

      setOtpSent(true);
      setOtp(["", "", "", "", "", ""]);

      toast({
        title: "Kode OTP dikirim",
        description: `Kode telah dikirim ke ${currentUser?.email}.`,
      });
    } catch (err) {
      toast({
        title: "Gagal mengirim OTP",
        description:
          err?.response?.data?.error ||
          err?.message ||
          "Silakan coba lagi.",
        variant: "destructive",
      });

      throw err;
    } finally {
      setIsSending(false);
    }
  };

  /* OTP input */
  const fillOtp = (rawValue) => {
    const digits = rawValue.replace(/\D/g, "").slice(0, 6);

    if (!digits) return false;

    const nextOtp = ["", "", "", "", "", ""];

    digits.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);

    const focusIndex = Math.min(digits.length, 6) - 1;

    setTimeout(() => {
      document
        .getElementById(`settings-otp-${focusIndex}`)
        ?.focus();
    }, 0);

    return true;
  };

  const handleOtpChange = (value, index) => {
    const digits = value.replace(/\D/g, "");

    if (digits.length > 1) {
      fillOtp(digits);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digits.slice(-1);
    setOtp(newOtp);

    if (digits && index < 5) {
      document
        .getElementById(`settings-otp-${index + 1}`)
        ?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    const pasted = event.clipboardData.getData("text");
    const digits = pasted.replace(/\D/g, "").slice(0, 6);

    if (!digits) return;

    event.preventDefault();
    fillOtp(digits);
  };

  const handleOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      document
        .getElementById(`settings-otp-${index - 1}`)
        ?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      document
        .getElementById(`settings-otp-${index - 1}`)
        ?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      document
        .getElementById(`settings-otp-${index + 1}`)
        ?.focus();
    }
  };

  /* Verify OTP */
  const handleVerify = async () => {
    const code = otp.join("");

    if (code.length < 6) {
      toast({
        title: "Kode tidak valid",
        description: "Masukkan 6 digit kode OTP.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      await authService.enable2FA(code);

      setVerified(true);
      setTwoFactorEnabled(true);
      updateSecurity({ twoFactor: true });
      setEnabling2FA(false);

      toast({
        title: "Verifikasi berhasil",
        description:
          "Email OTP telah diaktifkan sebagai metode Two-Factor Authentication.",
      });
    } catch (err) {
      setOtp(["", "", "", "", "", ""]);

      setTimeout(() => {
        document.getElementById("settings-otp-0")?.focus();
      }, 0);

      toast({
        title: "OTP salah atau kedaluwarsa",
        description:
          err?.response?.data?.error ||
          err?.message ||
          "Masukkan kode yang benar.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const cancelActivation = () => {
    setEnabling2FA(false);
    setOtpSent(false);
    setOtp(["", "", "", "", "", ""]);
    setVerified(false);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "tema":
        return (
          <Card title="Tema" icon={Sun}>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "Terang", icon: Sun },
                { value: "dark", label: "Gelap", icon: Moon },
                { value: "system", label: "Ikuti Sistem", icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => updateSettings({ theme: value })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    settings.theme === value
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon
                    size={24}
                    className={
                      settings.theme === value
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />

                  <span
                    className={`text-sm font-medium ${
                      settings.theme === value
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        );

      case "notif":
        return (
          <Card title="Notifikasi" icon={Bell}>
            <div className="space-y-1 divide-y divide-border">
              <Toggle
                label="Email"
                desc="Kirim notifikasi ke email"
                checked={settings.notifications.email}
                onChange={(value) =>
                  updateNotifications({ email: value })
                }
              />

              <Toggle
                label="In-App"
                desc="Tampilkan di panel notifikasi"
                checked={settings.notifications.inApp}
                onChange={(value) =>
                  updateNotifications({ inApp: value })
                }
              />

              <Toggle
                label="Upload dokumen"
                checked={settings.notifications.upload}
                onChange={(value) =>
                  updateNotifications({ upload: value })
                }
              />

              <Toggle
                label="Dokumen disetujui"
                checked={settings.notifications.approve}
                onChange={(value) =>
                  updateNotifications({ approve: value })
                }
              />

              <Toggle
                label="Dokumen ditolak"
                checked={settings.notifications.reject}
                onChange={(value) =>
                  updateNotifications({ reject: value })
                }
              />
            </div>
          </Card>
        );

      case "scan":
        return (
          <Card title="Scan & Upload" icon={Camera}>
            <div className="space-y-1 divide-y divide-border">
              <Toggle
                label="Auto-crop"
                desc="Otomatis potong area dokumen saat scan"
                checked={settings.scan.autoCrop}
                onChange={(value) =>
                  updateScan({ autoCrop: value })
                }
              />

              <div className="pt-3">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Compression Level
                </label>

                <select
                  value={settings.scan.compression}
                  onChange={(event) =>
                    updateScan({
                      compression: event.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="low">
                    Low (kualitas tinggi)
                  </option>
                  <option value="medium">
                    Medium (seimbang)
                  </option>
                  <option value="high">
                    High (ukuran kecil)
                  </option>
                </select>
              </div>
            </div>
          </Card>
        );

      case "security":
        return (
          <div className="space-y-4">
            <Card title="Privacy & Security" icon={Shield}>
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      enabled || enabling2FA
                        ? "bg-sakura-success/15"
                        : "bg-muted"
                    }`}
                  >
                    <Lock
                      size={18}
                      className={
                        enabled || enabling2FA
                          ? "text-sakura-success"
                          : "text-muted-foreground"
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      Two-Factor Authentication (2FA)
                    </div>

                    <div className="text-xs text-muted-foreground mt-0.5">
                      {enabled ? (
                        <span className="text-sakura-success font-medium flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          Aktif · Email OTP
                        </span>
                      ) : enabling2FA ? (
                        <span className="text-primary font-medium flex items-center gap-1">
                          <RefreshCw
                            size={11}
                            className={
                              isSending ? "animate-spin" : ""
                            }
                          />
                          {otpSent
                            ? "Menunggu verifikasi kode OTP..."
                            : "Menunggu konfirmasi email..."}
                        </span>
                      ) : (
                        "Lindungi akun Anda dengan verifikasi tambahan saat login."
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    !otpSent &&
                    handleToggle2FA(!(enabled || enabling2FA))
                  }
                  disabled={otpSent && !verified}
                  title={
                    otpSent && !verified
                      ? "Selesaikan verifikasi atau batalkan terlebih dahulu"
                      : undefined
                  }
                  className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${
                    enabled || enabling2FA
                      ? "bg-primary"
                      : "bg-input"
                  } ${
                    otpSent && !verified
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      enabled || enabling2FA
                        ? "translate-x-6"
                        : ""
                    }`}
                  />
                </button>
              </div>

              {!enabled && !enabling2FA && (
                <div className="flex gap-2 p-3 rounded-xl border border-border bg-muted/20 mt-3">
                  <Info
                    size={14}
                    className="text-muted-foreground mt-0.5 shrink-0"
                  />

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Aktifkan 2FA untuk keamanan akun yang lebih baik.
                    Setiap kali login, Anda akan diminta memasukkan kode
                    verifikasi yang dikirim ke email.
                  </p>
                </div>
              )}
            </Card>

            {(enabling2FA || enabled) && (
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mail size={18} className="text-primary" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Menggunakan Email (OTP)
                      </div>

                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Direkomendasikan
                      </span>
                    </div>
                  </div>

                  {enabled && (
                    <div className="w-5 h-5 rounded-full bg-sakura-success flex items-center justify-center">
                      <CheckCircle2
                        size={12}
                        className="text-white"
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  Kode verifikasi dikirim ke email Anda setiap kali
                  login.
                </p>

                {!verified && enabling2FA && (
                  <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Kode OTP akan dikirim ke:
                    </div>

                    {currentUser?.email ? (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                        <Mail size={14} />
                        {currentUser.email}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                        <AlertTriangle size={14} />
                        Email belum terdaftar
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pastikan email di atas dapat diakses.
                    </p>
                  </div>
                )}

                {!verified && enabling2FA && (
                  <ActivationTutorial
                    currentStep={currentStep}
                    email={currentUser?.email}
                  />
                )}

                {(verified || enabled) && !enabling2FA && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-sakura-success/[0.06] border border-sakura-success/30">
                    <CheckCircle2
                      size={20}
                      className="text-sakura-success shrink-0"
                    />

                    <div>
                      <div className="text-sm font-semibold text-sakura-success">
                        2FA Aktif
                      </div>

                      <div className="text-xs text-muted-foreground mt-0.5">
                        Email OTP berhasil diverifikasi dan 2FA
                        diaktifkan untuk akun{" "}
                        <span className="font-medium text-foreground">
                          {currentUser?.email}
                        </span>
                        .
                      </div>
                    </div>
                  </div>
                )}

                {enabling2FA && !verified && (
                  <div className="space-y-3 border-t border-border pt-4">
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={
                          isSending || !currentUser?.email
                        }
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                      >
                        {isSending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Mail size={16} />
                            Kirim OTP ke Email
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-2">
                            Masukkan Kode OTP
                          </label>

                          <div
                            className="flex gap-2 justify-center"
                            onPaste={handleOtpPaste}
                          >
                            {otp.map((digit, index) => (
                              <input
                                key={index}
                                id={`settings-otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete={
                                  index === 0
                                    ? "one-time-code"
                                    : "off"
                                }
                                maxLength={index === 0 ? 6 : 1}
                                value={digit}
                                onChange={(event) =>
                                  handleOtpChange(
                                    event.target.value,
                                    index
                                  )
                                }
                                onKeyDown={(event) =>
                                  handleOtpKeyDown(event, index)
                                }
                                className={`w-10 h-12 text-center text-lg font-bold rounded-xl border-2 bg-background focus:outline-none transition-all ${
                                  digit
                                    ? "border-primary text-primary"
                                    : "border-input focus:border-primary"
                                }`}
                              />
                            ))}
                          </div>

                          <p className="text-[11px] text-muted-foreground text-center mt-2">
                            Anda dapat menempelkan kode OTP 6 digit
                            langsung ke kolom di atas.
                          </p>

                          <div className="mt-2">
                            <CountdownTimer
                              seconds={60}
                              onResend={handleSendOtp}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelActivation}
                            disabled={isVerifying}
                            className="flex-1 py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-muted disabled:opacity-50"
                          >
                            Batal
                          </button>

                          <button
                            type="button"
                            onClick={handleVerify}
                            disabled={
                              otp.join("").length < 6 ||
                              isVerifying
                            }
                            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isVerifying ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Memverifikasi...
                              </>
                            ) : (
                              "Verifikasi & Aktifkan 2FA"
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp([
                              "",
                              "",
                              "",
                              "",
                              "",
                              "",
                            ]);
                          }}
                          disabled={isVerifying}
                          className="w-full py-2 rounded-xl border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw size={12} />
                          Batalkan Kirim OTP
                        </button>

                        <p className="text-center text-xs text-muted-foreground">
                          Setelah berhasil, 2FA akan aktif dan digunakan
                          saat login berikutnya.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {enabled && (
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Smartphone size={16} className="text-primary" />
                  Alur Login Setelah 2FA Aktif
                </h4>

                <div className="flex items-start gap-2 overflow-x-auto pb-1">
                  {[
                    {
                      step: "1",
                      label: "Email & Password",
                      icon: Lock,
                    },
                    {
                      step: "2",
                      label: "OTP Dikirim ke Email",
                      icon: Mail,
                    },
                    {
                      step: "3",
                      label: "Masukkan Kode OTP",
                      icon: KeyRound,
                    },
                    {
                      step: "4",
                      label: "Login Berhasil",
                      icon: CheckCircle2,
                    },
                  ].map((item, index, array) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 shrink-0"
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon
                              size={16}
                              className="text-primary"
                            />
                          </div>

                          <span className="text-[10px] text-center text-muted-foreground font-medium max-w-[64px] leading-tight">
                            {item.label}
                          </span>
                        </div>

                        {index < array.length - 1 && (
                          <ChevronRight
                            size={14}
                            className="text-muted-foreground mt-[-14px] shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="h-screen overflow-hidden flex flex-col bg-background">
        <AppHeader
          title="Pengaturan Sistem"
          subtitle="Kelola preferensi dan keamanan akun Anda"
        />

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 min-w-0 overflow-x-hidden">
          {/* Sidebar desktop */}
          <aside className="hidden sm:flex flex-col w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
            <nav className="flex flex-col gap-1 p-4 flex-1">
              {SECTIONS.map(
                ({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeSection === id
                        ? "bg-secondary text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        activeSection === id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    />

                    <span className="flex-1 text-left">
                      {label}
                    </span>

                    {activeSection === id && (
                      <ChevronRight
                        size={14}
                        className="text-primary"
                      />
                    )}
                  </button>
                )
              )}
            </nav>
          </aside>

          {/* Mobile tabs */}
          <div className="sm:hidden flex overflow-x-auto border-b border-border bg-card px-3 py-2 gap-1 shrink-0">
            {SECTIONS.map(
              ({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeSection === id
                      ? "bg-secondary text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon
                    size={14}
                    className={
                      activeSection === id
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                  {label}
                </button>
              )
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-y-auto bg-muted/30">
            <div className="p-4 sm:p-8 min-h-full">
              <div className="max-w-2xl space-y-4">
                {renderSection()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL KONFIRMASI NONAKTIFKAN 2FA */}
      {disableModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDisableModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="disable-2fa-title"
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <Shield
                    size={20}
                    className="text-destructive"
                  />
                </div>

                <div>
                  <h3
                    id="disable-2fa-title"
                    className="text-base font-bold text-foreground"
                  >
                    Nonaktifkan 2FA?
                  </h3>

                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Masukkan password akun Anda untuk mengonfirmasi
                    penonaktifan Two-Factor Authentication.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDisableModal}
                disabled={isDisabling}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-5">
              <div className="p-3 rounded-xl bg-destructive/[0.05] border border-destructive/20 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={15}
                    className="text-destructive mt-0.5 shrink-0"
                  />

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Setelah dinonaktifkan, login berikutnya tidak lagi
                    memerlukan kode OTP tambahan.
                  </p>
                </div>
              </div>

              <label
                htmlFor="disable-2fa-password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  id="disable-2fa-password"
                  type={
                    showDisablePassword ? "text" : "password"
                  }
                  value={disablePassword}
                  onChange={(event) => {
                    setDisablePassword(event.target.value);

                    if (disableError) {
                      setDisableError("");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      disablePassword.trim() &&
                      !isDisabling
                    ) {
                      handleDisable2FA();
                    }
                  }}
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Masukkan password Anda"
                  disabled={isDisabling}
                  className={`w-full h-11 pl-10 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    disableError
                      ? "border-destructive focus:border-destructive"
                      : "border-input focus:border-primary"
                  }`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowDisablePassword(
                      (previous) => !previous
                    )
                  }
                  disabled={isDisabling}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={
                    showDisablePassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  {showDisablePassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>

              {disableError && (
                <div className="flex items-start gap-2 mt-2 text-destructive">
                  <AlertTriangle
                    size={13}
                    className="mt-0.5 shrink-0"
                  />
                  <p className="text-xs leading-relaxed">
                    {disableError}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={closeDisableModal}
                disabled={isDisabling}
                className="px-4 py-2.5 rounded-xl border border-input bg-background text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDisable2FA}
                disabled={
                  !disablePassword.trim() || isDisabling
                }
                className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
              >
                {isDisabling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    Nonaktifkan 2FA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}