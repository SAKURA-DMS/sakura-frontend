import { useState, useEffect, useMemo, useRef } from "react";
import { verifyOtpLogin, sendOtp } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, Shield, FileCheck, Users, ScanLine, RefreshCw, CheckCircle, KeyRound } from "lucide-react";
import logoSakura from "@/assets/logo_sakura.png";
import SakuraPetals from "@/components/sakura/SakuraPetals";
import sakuraBg from "@/assets/sakura_branch.png";

function FloatingOrbs() {
  const orbs = useMemo(
    () => [
      { w: 320, h: 320, x: "80%", y: "-10%", delay: 0, dur: 18 },
      { w: 220, h: 220, x: "-8%", y: "75%", delay: 2, dur: 22 },
      { w: 160, h: 160, x: "60%", y: "60%", delay: 4, dur: 15 },
      { w: 100, h: 100, x: "30%", y: "20%", delay: 1, dur: 20 },
    ],
    []
  );

  return (
    <>
      {orbs.map((o, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/[0.06]"
          style={{
            width: o.w,
            height: o.h,
            left: o.x,
            top: o.y,
          }}
        />
      ))}
    </>
  );
}

/* Animated feature cards */
const FEATURES = [
  {
    icon: FileCheck,
    title: "Arsip Digital",
    desc: "Simpan dokumen secara aman",
  },
  {
    icon: Shield,
    title: "Alur Persetujuan",
    desc: "Proses transparan dan akuntabel",
  },
  {
    icon: ScanLine,
    title: "Scan & Upload",
    desc: "Digitalisasi dokumen fisik",
  },
  {
    icon: Users,
    title: "Keamanan RBAC",
    desc: "Kontrol akses berbasis peran",
  },
];

function FeatureCards() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setActiveIdx((p) => (p + 1) % FEATURES.length),
      3000
    );

    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-10 space-y-2">
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        const isActive = i === activeIdx;

        return (
          <div
            key={f.title}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-default transition-all"
            style={{
              backgroundColor: isActive
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.04)",
              borderColor: isActive
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.08)",
              transform: isActive
                ? "translateX(8px) scale(1.02)"
                : "translateX(0) scale(1)",
            }}
            onMouseEnter={() => setActiveIdx(i)}
          >
            <Icon size={16} className="text-white/80" />

            <div className="flex-1 min-w-0">
              <span className="text-white font-semibold text-sm">
                {f.title}
              </span>

              {isActive && (
                <span className="text-white/60 text-sm inline-block whitespace-nowrap">
                  {" · "}
                  {f.desc}
                </span>
              )}
            </div>

            {isActive && (
              <div className="w-1.5 h-6 rounded-full bg-white/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Animated input */
function AnimatedInput({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  suffix,
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;

  return (
    <div
      style={{
        transform: focused ? "scale(1.01)" : "scale(1)",
      }}
      className="transition-transform"
    >
      <label
        className="block text-sm font-semibold mb-1.5 transition-colors"
        style={{
          color: focused
            ? "hsl(var(--primary))"
            : "hsl(var(--foreground))",
        }}
      >
        {label}
      </label>

      <div className="relative group">
        <div
          className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 transition-colors"
          style={{
            color: focused
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground))",
          }}
        >
          <Icon size={18} />
        </div>

        <div
          className="absolute inset-0 rounded-xl pointer-events-none transition-shadow"
          style={{
            boxShadow: focused
              ? "0 0 0 2px hsl(var(--ring) / 0.25), 0 4px 16px -4px hsl(var(--ring) / 0.12)"
              : "0 0 0 0px transparent",
          }}
        />

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
        />

        {suffix}

        <div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full bg-primary transition-all"
          style={{
            width: focused ? "90%" : filled ? "60%" : "0%",
            transform: "translateX(-50%)",
            opacity: focused ? 1 : filled ? 0.4 : 0,
          }}
        />
      </div>
    </div>
  );
}

/* Typing heading */
function TypedHeading() {
  const text = "Masuk ke Sistem";
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (chars < text.length) {
      const t = setTimeout(() => setChars((c) => c + 1), 60);
      return () => clearTimeout(t);
    }
  }, [chars, text.length]);

  return (
    <h2 className="text-2xl font-bold text-foreground mb-1">
      {text.slice(0, chars)}
      <span className="inline-block w-[2px] h-6 bg-primary ml-0.5 align-middle" />
    </h2>
  );
}

/* Countdown for OTP resend */
function OtpCountdown({
  onResend,
  initialSeconds = 60,
  maxAttempts = 3,
}) {
  const [sec, setSec] = useState(initialSeconds);
  const [canResend, setCanResend] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (sec <= 0) {
      setCanResend(true);
      return;
    }

    const t = setTimeout(() => {
      setSec((s) => s - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [sec]);

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  const handleResend = async () => {
    if (isResending || attempts >= maxAttempts) return;

    setIsResending(true);

    try {
      await onResend();

      const next = attempts + 1;

      setAttempts(next);
      setSec(initialSeconds);
      setCanResend(false);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="text-center">
      {canResend ? (
        attempts >= maxAttempts ? (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Batas pengiriman OTP tercapai.</p>

            <p className="text-[11px]">
              Periksa folder{" "}
              <span className="font-semibold text-foreground">
                Spam
              </span>{" "}
              atau hubungi administrator.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="flex items-center gap-1.5 text-xs font-medium mx-auto hover:underline disabled:opacity-60"
            style={{
              color: "hsl(var(--primary))",
            }}
          >
            <RefreshCw
              size={12}
              className={isResending ? "animate-spin" : ""}
            />

            {isResending
              ? "Mengirim ulang..."
              : `Kirim ulang kode OTP (${attempts}/${maxAttempts})`}
          </button>
        )
      ) : (
        <span className="text-xs text-muted-foreground">
          Kirim ulang kode dalam{" "}
          <span className="font-semibold text-foreground">
            {mm}:{ss}
          </span>

          {attempts > 1 && (
            <span className="text-[11px] ml-1">
              · percobaan {attempts}/{maxAttempts}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/* 2FA VERIFICATION SCREEN */
function TwoFAScreen({
  email,
  onVerify,
  onBack,
  isSubmitting,
  externalError = "",
  onClearError,
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(true);
  const [error, setError] = useState("");

  const inputRefs = useRef([]);

  const displayError = error || externalError;

  const handleChange = (value, idx) => {
    const digits = value.replace(/\D/g, "");

    setError("");
    onClearError?.();

    if (!digits) {
      const next = [...otp];
      next[idx] = "";
      setOtp(next);
      return;
    }

    if (digits.length > 1) {
      const code = digits.slice(0, 6);
      const next = ["", "", "", "", "", ""];

      code.split("").forEach((digit, index) => {
        next[index] = digit;
      });

      setOtp(next);

      const focusIndex = Math.min(code.length, 6) - 1;

      requestAnimationFrame(() => {
        inputRefs.current[focusIndex]?.focus();
      });

      return;
    }

    const next = [...otp];
    next[idx] = digits.slice(-1);

    setOtp(next);

    if (idx < 5) {
      requestAnimationFrame(() => {
        inputRefs.current[idx + 1]?.focus();
      });
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      if (otp[idx]) {
        const next = [...otp];
        next[idx] = "";
        setOtp(next);

        setError("");
        onClearError?.();

        return;
      }

      if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    }

    if (e.key === "ArrowRight" && idx < 5) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    }

    if (e.key === "Enter") {
      const code = otp.join("");

      if (/^\d{6}$/.test(code)) {
        onVerify(code);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    const next = ["", "", "", "", "", ""];

    pasted.split("").forEach((digit, index) => {
      if (index < 6) {
        next[index] = digit;
      }
    });

    setOtp(next);
    setError("");
    onClearError?.();

    const focusIndex = Math.min(pasted.length, 6) - 1;

    requestAnimationFrame(() => {
      inputRefs.current[focusIndex]?.focus();
    });
  };

  const handleSend = async () => {
    try {
      setError("");
      onClearError?.();

      await sendOtp(email);

      setOtp(["", "", "", "", "", ""]);
      setOtpSent(true);

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 0);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Gagal mengirim OTP. Coba lagi."
      );

      throw err;
    }
  };

  const handleVerify = () => {
    const code = otp.join("");

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Masukkan 6 digit kode OTP yang dikirim ke email Anda."
      );
      return;
    }

    setError("");
    onClearError?.();

    onVerify(code);
  };

  const filled = otp.filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "hsl(347 62% 32%)",
          }}
        />

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${sakuraBg})`,
            opacity: 0.55,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(347 55% 22% / 0.55) 0%, hsl(347 50% 18% / 0.75) 60%, hsl(347 45% 14% / 0.88) 100%)",
          }}
        />

        <SakuraPetals count={16} />
        <FloatingOrbs />

        <div className="relative px-12 py-16 z-10">
          {/* Logo */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-3 mb-10 group"
          >
            <div className="w-12 h-12 rounded-xl bg-white shadow-lg ring-2 ring-white/40 flex items-center justify-center hover:scale-110 hover:rotate-12 transition-transform">
              <img
                src={logoSakura}
                alt="SAKURA"
                className="w-10 h-10 rounded-lg"
              />
            </div>

            <div className="text-left">
              <div className="text-white font-bold text-xl tracking-wider drop-shadow">
                SAKURA
              </div>

              <div className="text-white/80 text-xs font-medium">
                Document Management System
              </div>
            </div>
          </button>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
            Verifikasi
            <br />
            Dua Langkah
          </h1>

          <p className="text-white/80 text-sm leading-relaxed mb-8">
            Kode OTP telah dikirim ke email Anda untuk keamanan
            tambahan.
          </p>

          {/* Security card */}
          <div
            className="rounded-2xl border p-5 space-y-2"
            style={{
              background: "rgba(255,255,255,0.07)",
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-white" />
              </div>

              <span className="text-white font-semibold text-sm">
                Keamanan Berlapis
              </span>
            </div>

            <p className="text-white/60 text-xs leading-relaxed pl-12">
              Two-Factor Authentication melindungi akun Anda dari
              akses tidak sah, meskipun password Anda diketahui pihak
              lain.
            </p>
          </div>

          {/* Step flow */}
          <div className="mt-8 space-y-2">
            {[
              {
                label: "Masukkan Email & Password",
                done: true,
              },
              {
                label: "Kode OTP Dikirim ke Email",
                done: otpSent,
              },
              {
                label: "Masukkan Kode OTP",
                done: false,
              },
              {
                label: "Login Berhasil",
                done: false,
              },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    s.done
                      ? "bg-white text-[hsl(347,60%,28%)]"
                      : "bg-white/15 text-white/50"
                  }`}
                >
                  {s.done ? (
                    <CheckCircle size={12} />
                  ) : (
                    i + 1
                  )}
                </div>

                <span
                  className={`text-xs ${
                    s.done
                      ? "text-white font-medium"
                      : "text-white/50"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-auto text-white/50 text-[11px] pt-8 font-medium">
            © 2026 SAKURA · Developed by Group 5
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 bg-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary)), transparent 70%)",
              right: "-100px",
              top: "-100px",
            }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden flex items-center gap-3 mb-8"
          >
            <div className="w-12 h-12 rounded-xl bg-white shadow-md ring-1 ring-primary/20 flex items-center justify-center">
              <img
                src={logoSakura}
                alt="SAKURA"
                className="w-10 h-10 rounded-lg"
              />
            </div>

            <span
              className="text-xl font-bold tracking-wider"
              style={{
                color: "hsl(var(--primary))",
              }}
            >
              SAKURA
            </span>
          </button>

          {/* Back link */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium mb-6 hover:underline transition-colors"
            style={{
              color: "hsl(var(--primary))",
            }}
          >
            <ArrowLeft size={15} />
            Kembali ke Login
          </button>

          {/* Header */}
          <div className="mb-7">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "hsl(var(--ring) / 0.2)",
              }}
            >
              <Mail
                size={26}
                style={{
                  color: "hsl(var(--primary))",
                }}
              />
            </div>

            <h2 className="text-2xl font-bold text-foreground">
              Masukkan Kode OTP
            </h2>

            <p className="text-sm text-muted-foreground mt-1.5">
              Kode verifikasi 6 digit telah dikirim ke
            </p>

            <p
              className="text-sm font-semibold mt-0.5"
              style={{
                color: "hsl(var(--primary))",
              }}
            >
              {email}
            </p>
          </div>

          {!otpSent ? (
            <div className="space-y-4">
              <div
                className="p-4 rounded-2xl border"
                style={{
                  background: "hsl(var(--ring) / 0.2)",
                  borderColor: "hsl(var(--ring) / 0.2)",
                }}
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Klik tombol di bawah untuk mengirim kode OTP ke
                  email Anda. Periksa inbox dan masukkan kode 6 digit
                  yang kami kirimkan.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSend}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{
                  background: "hsl(var(--primary))",
                }}
              >
                <Mail size={16} />
                Kirim OTP ke Email
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* OTP inputs */}
              <div>
                <div
                  className="flex gap-2.5 justify-center"
                  onPaste={handlePaste}
                >
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={
                        i === 0 ? "one-time-code" : "off"
                      }
                      maxLength={i === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) =>
                        handleChange(e.target.value, i)
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(e, i)
                      }
                      onPaste={handlePaste}
                      aria-label={`Digit OTP ${i + 1}`}
                      className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl border-2 bg-background focus:outline-none transition-all ${
                        digit
                          ? "border-primary text-foreground shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                          : "border-input focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                      }`}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Hint paste */}
                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  Anda dapat menyalin 6 digit kode dari email lalu
                  menempelkannya langsung di sini.
                </p>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(filled / 6) * 100}%`,
                      background: "hsl(var(--primary))",
                    }}
                  />
                </div>
              </div>

              {/* Error */}
              {displayError && (
                <p className="text-sm text-destructive font-medium text-center">
                  {displayError}
                </p>
              )}

              {/* Countdown 1 minute */}
              <OtpCountdown
                onResend={handleSend}
                initialSeconds={60}
              />

              {/* Reset password */}
              <div className="text-center">
                <span className="text-xs text-muted-foreground">
                  Lupa kata sandi?{" "}
                </span>

                <button
                  type="button"
                  className="text-xs font-semibold hover:underline"
                  style={{
                    color: "hsl(var(--primary))",
                  }}
                  onClick={() =>
                    alert(
                      "Simulasi: Link reset dikirim ke email"
                    )
                  }
                >
                  Reset via email
                </button>
              </div>

              {/* Verify button */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={filled < 6 || isSubmitting}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: "hsl(var(--primary))",
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Verifikasi & Masuk
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8">
            <div className="border-t border-border/50" />

            <p className="text-center text-[11px] text-muted-foreground/60 py-4 font-medium">
              © 2026 SAKURA · SMP Negeri 4 Cikarang Barat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* MAIN LOGIN PAGE */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const { login, finalizeLogin } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!identifier) {
      setError("Masukkan email atau nama terlebih dahulu.");
      return;
    }

    if (!password) {
      setError("Masukkan password terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await login(identifier, password);

      if (result.ok) {
        if (result.require2FA) {
          setPendingEmail(result.email);
          setOtpStep(true);
          return;
        }

        navigate("/dashboard");
        return;
      }

      if (result.pending) {
        setError(
          "Akun Anda belum diaktifkan. Silakan tunggu persetujuan dari Operator TU."
        );
      } else {
        setError(
          result.error || "Identitas atau password salah."
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Terjadi kesalahan saat login."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (code) => {
    if (!/^\d{6}$/.test(code)) {
      setError("Masukkan 6 digit kode OTP yang valid.");
      return;
    }

    if (!pendingEmail) {
      setError(
        "Sesi verifikasi tidak ditemukan. Silakan login kembali."
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await verifyOtpLogin(
        pendingEmail,
        code
      );

      if (!result?.user) {
        throw new Error(
          "Data pengguna tidak diterima dari server. Silakan coba lagi."
        );
      }

      finalizeLogin(result.user);

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error("[2FA VERIFY ERROR]", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Kode OTP salah atau sudah kedaluwarsa."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (otpStep && pendingEmail) {
    return (
      <TwoFAScreen
        email={pendingEmail}
        onVerify={handleVerifyOtp}
        onBack={() => {
          setOtpStep(false);
          setPendingEmail(null);
          setError("");
        }}
        isSubmitting={isSubmitting}
        externalError={error}
        onClearError={() => setError("")}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "hsl(347 62% 32%)",
          }}
        />

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${sakuraBg})`,
            opacity: 0.55,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(347 55% 22% / 0.55) 0%, hsl(347 50% 18% / 0.75) 60%, hsl(347 45% 14% / 0.88) 100%)",
          }}
        />

        <SakuraPetals count={16} />
        <FloatingOrbs />

        <div className="relative px-12 py-16 z-10">
          <div className="flex items-center gap-3 mb-10">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-xl bg-white shadow-lg ring-2 ring-white/40 flex items-center justify-center hover:scale-110 hover:rotate-12 transition-transform">
                <img
                  src={logoSakura}
                  alt="SAKURA"
                  className="w-10 h-10 rounded-lg"
                />
              </div>

              <div className="text-left">
                <div className="text-white font-bold text-xl tracking-wider drop-shadow">
                  SAKURA
                </div>

                <div className="text-white/80 text-xs font-medium">
                  Document Management System
                </div>
              </div>
            </button>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-[1.15] mb-4">
            Secure Archiving and
            <br />
            Keeping of Unified
            <br />
            Records for Administration
          </h1>

          <p className="text-white/80 text-base leading-relaxed max-w-lg">
            Sistem manajemen arsip digital untuk SMP Negeri 4
            Cikarang Barat
          </p>

          <FeatureCards />

          <p className="mt-auto text-white/50 text-[11px] pt-8 font-medium">
            © 2026 SAKURA · Developed by Group 5
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 bg-background relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary)), transparent 70%)",
              right: "-100px",
              top: "-100px",
            }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="lg:hidden flex items-center gap-3 mb-8"
          >
            <div className="w-12 h-12 rounded-xl bg-white shadow-md ring-1 ring-primary/20 flex items-center justify-center">
              <img
                src={logoSakura}
                alt="SAKURA"
                className="w-10 h-10 rounded-lg"
              />
            </div>

            <span
              className="text-xl font-bold tracking-wider"
              style={{
                color: "hsl(var(--primary))",
              }}
            >
              SAKURA
            </span>
          </button>

          {/* Back */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-medium hover:underline transition-colors"
              style={{
                color: "hsl(var(--primary))",
              }}
            >
              <ArrowLeft size={15} />
              Kembali
            </button>
          </div>

          {/* Heading */}
          <div>
            <TypedHeading />

            <p className="text-muted-foreground text-sm mb-8">
              Autentikasi diperlukan untuk mengakses sistem
            </p>
          </div>

          {/* Login form */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            <AnimatedInput
              icon={User}
              label="Email atau Nama"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              placeholder="Contoh: budi@email.com atau nama lengkap"
            />

            <AnimatedInput
              icon={Lock}
              label="Kata Sandi"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              suffix={
                <button
                  type="button"
                  onClick={() =>
                    setShowPass((prev) => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                  aria-label={
                    showPass
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPass ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="rounded border-input accent-primary"
                />
                Ingat saya
              </label>

              <button
                type="button"
                onClick={() =>
                  alert(
                    "Simulasi: Link reset password dikirim ke email"
                  )
                }
                className="text-sm font-semibold hover:underline"
                style={{
                  color: "hsl(var(--primary))",
                }}
              >
                Lupa password?
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-white"
              style={{
                background: "hsl(var(--primary))",
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk ke Sistem

                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* Signup */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            Belum punya akun?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="font-semibold hover:underline"
              style={{
                color: "hsl(var(--primary))",
              }}
            >
              Daftar di sini
            </button>
          </p>

          {/* Footer */}
          <div>
            <p className="text-center text-[11px] text-muted-foreground/60 mt-6 font-medium">
              SMP Negeri 4 Cikarang Barat
            </p>

            <div className="border-t border-border/50 mt-5" />

            <p className="text-center text-[11px] text-muted-foreground/60 py-4 font-medium">
              © 2026 SAKURA · Developed by Group 5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}