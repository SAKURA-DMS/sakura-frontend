/**
 * AppHeader.jsx — Phase 7 (patched: avatar fallback fix)
 * ─────────────────────────────────────────────────────────────────────────────
 * Perubahan Phase 7 (Notification):
 *  • Pakai `visibleNotifications` + `unreadCount` dari context (bukan hitung sendiri)
 *  • Badge badge animasi pulse saat ada notif baru (unread)
 *  • Ikon bervariasi per type notifikasi: approval, rejection, info
 *  • Klik notif → tandai baca + navigasi ke dokumen (jika docId ada)
 *  • Tombol dismiss (×) per notifikasi — panggil dismissNotification()
 *  • Tombol "Muat ulang" untuk manual refresh
 *  • State loading saat fetch (shimmer placeholder)
 *  • Empty state lebih informatif
 *
 * FIX (avatar): Tambah onError handler pada semua <img> avatar.
 *  Jika src tidak valid (base64 terpotong, null, URL rusak) →
 *  fallback ke inisial nama user dalam bentuk SVG/div, tidak crash.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Bell, User, LogOut, KeyRound, ChevronDown, CheckCheck, RefreshCw, X, FileCheck, FileX, Info, Clock, Menu } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "@/components/shared/UserAvatar";

// NOTE: Avatar fallback (inisial saat src tidak valid) + indikator Online
// Status kini ditangani oleh komponen bersama <UserAvatar /> di
// components/shared/UserAvatar.jsx, dipakai juga di seluruh halaman lain
// (Approval, Timeline, System Log, Komentar, User Management, dst) agar
// perilakunya konsisten di satu tempat.

// ── Ikon & warna berdasarkan tipe notifikasi ──────────────────────────────────
function NotifIcon({ type }) {
  const base = "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0";
  switch (type) {
    case "approval":
      return (
        <span className={`${base} bg-emerald-100 dark:bg-emerald-900/40`}>
          <FileCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
        </span>
      );
    case "rejection":
      return (
        <span className={`${base} bg-red-100 dark:bg-red-900/40`}>
          <FileX size={14} className="text-red-600 dark:text-red-400" />
        </span>
      );
    case "upload":
      return (
        <span className={`${base} bg-blue-100 dark:bg-blue-900/40`}>
          <Clock size={14} className="text-blue-600 dark:text-blue-400" />
        </span>
      );
    default:
      return (
        <span className={`${base} bg-muted`}>
          <Info size={14} className="text-muted-foreground" />
        </span>
      );
  }
}

// ── Format waktu relatif sederhana ───────────────────────────────────────────
function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return format(new Date(dateStr), "dd MMM yyyy", { locale: idLocale });
  } catch {
    return "";
  }
}

// ── Skeleton placeholder ──────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-3/6" />
        <div className="h-2.5 bg-muted rounded w-2/6" />
      </div>
    </div>
  );
}

// ── Komponen utama ────────────────────────────────────────────────────────────
export default function AppHeader({ title, subtitle }) {
  const {
    currentUser,
    visibleNotifications,
    unreadCount,
    notificationsLoading,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    logout,
    setMobileSidebarOpen,
  } = useApp();

  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifMenuStyle, setNotifMenuStyle] = useState({ top: 0, right: 12 });
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const notifButtonRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showNotifs || !notifButtonRef.current) return;

    const updatePosition = () => {
      const rect = notifButtonRef.current.getBoundingClientRect();
      const right = Math.max(12, window.innerWidth - rect.right - 12);
      const top = rect.bottom + 8;
      setNotifMenuStyle({ top, right });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showNotifs]);

  // Klik notifikasi: tandai baca, lalu navigasi ke dokumen jika ada
  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    if (notif.docId) {
      setShowNotifs(false);
      navigate(`/archive?docId=${notif.docId}`);
    }
  };

  // Dismiss tanpa navigasi
  const handleDismiss = async (e, notifId) => {
    e.stopPropagation();
    await dismissNotification(notifId);
  };

  // Tandai semua dibaca
  const handleMarkAll = async (e) => {
    e.stopPropagation();
    await markAllNotificationsRead();
  };

  // Manual refresh
  const handleRefresh = async (e) => {
    e.stopPropagation();
    await loadNotifications();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 py-4 bg-card/80 glass border-b border-border/60">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — hanya tampil di layar HP/tablet untuk membuka sidebar drawer */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden shrink-0 p-2 -ml-2 rounded-lg text-foreground hover:bg-muted"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5 truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* ── Notification Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            ref={notifButtonRef}
            onClick={() => setShowNotifs((v) => !v)}
            className="relative p-2.5 rounded-xl hover:bg-muted transition-all duration-200"
            aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
          >
            <Bell
              size={18}
              className={unreadCount > 0 ? "text-primary" : "text-muted-foreground"}
            />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 w-[90vw] max-w-sm sm:w-96 max-h-[70vh] bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
                style={{ top: notifMenuStyle.top, right: notifMenuStyle.right }}
              >
                {/* Header panel notifikasi */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={notificationsLoading}
                      className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      aria-label="Muat ulang notifikasi"
                      title="Muat ulang"
                    >
                      <RefreshCw
                        size={13}
                        className={`text-muted-foreground ${notificationsLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAll}
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                        title="Tandai semua dibaca"
                      >
                        <CheckCheck size={13} />
                        Baca semua
                      </button>
                    )}
                  </div>
                </div>

                {/* Daftar notifikasi */}
                <div className="max-h-[calc(70vh-7rem)] overflow-y-auto divide-y divide-border scrollbar-thin">
                  {notificationsLoading && visibleNotifications.length === 0 && (
                    <>
                      <NotifSkeleton />
                      <NotifSkeleton />
                      <NotifSkeleton />
                    </>
                  )}

                  {!notificationsLoading && visibleNotifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Bell size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
                      <p className="text-xs text-muted-foreground/70">
                        Notifikasi approval dan aktivitas dokumen akan muncul di sini
                      </p>
                    </div>
                  )}

                  {visibleNotifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`
                        w-full text-left flex items-start gap-3 px-4 py-3
                        hover:bg-muted/50 transition-colors group relative
                        ${!n.read ? "bg-primary/5" : ""}
                      `}
                    >
                      {!n.read && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      <NotifIcon type={n.type} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {timeAgo(n.time)}
                        </p>
                      </div>

                      <button
                        onClick={(e) => handleDismiss(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 transition-all ml-1 flex-shrink-0"
                        aria-label="Hapus notifikasi"
                        title="Hapus"
                      >
                        <X size={12} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </button>
                  ))}
                </div>

                {visibleNotifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border bg-muted/10">
                    <p className="text-[11px] text-muted-foreground text-center">
                      {visibleNotifications.length} notifikasi &bull; Diperbarui otomatis tiap 60 detik
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-muted transition-all duration-200"
            aria-label="Profil"
          >
            <UserAvatar
              userId={currentUser.id}
              avatar={currentUser.avatar}
              nama={currentUser.nama}
              size={32}
              square
              className="ring-2 ring-border"
              forceOnline
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-foreground leading-tight">{currentUser.nama}</div>
              <div className="text-[10px] text-muted-foreground">{currentUser.role}</div>
            </div>
            <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-14 z-50 w-56 bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <div className="text-sm font-semibold text-foreground">{currentUser.nama}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {currentUser.role}
                  </span>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setShowDropdown(false); navigate("/profile"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <User size={16} className="text-muted-foreground" /> Profil Saya
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); navigate("/change-password"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <KeyRound size={16} className="text-muted-foreground" /> Ubah Password
                  </button>
                </div>
                <div className="border-t border-border p-1">
                  <button
                    onClick={() => { setShowDropdown(false); logout(); navigate("/", { replace: true }); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}