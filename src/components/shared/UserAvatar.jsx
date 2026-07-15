/**
 * UserAvatar.jsx — Komponen avatar terpusat dengan indikator Online Status.
 * ─────────────────────────────────────────────────────────────────────────────
 * Dipakai di SELURUH aplikasi yang menampilkan foto profil user: Header,
 * Approval, Timeline / Jejak Aktivitas, System Log, Komentar/Riwayat Approval,
 * User Management, dan tempat lain yang menampilkan avatar user.
 *
 * Aturan tampilan status (sesuai requirement):
 *   • Hijau = online
 *   • Abu-abu = offline
 *   • Ditampilkan sebagai lingkaran kecil di pojok foto profil.
 *
 * Status diambil dari `onlineStatuses` di AppContext (realtime, lihat
 * usePresence-related effect di contexts/AppContext.jsx) — komponen ini TIDAK
 * melakukan fetch sendiri, supaya tidak ada request berulang per-avatar.
 * Cukup beri `userId` dan komponen ini otomatis re-render saat status user
 * tersebut berubah.
 *
 * Penggunaan:
 *   <UserAvatar userId={user.id} avatar={user.avatar} nama={user.nama} size={32} />
 *
 * Jika `showStatus` di-set false, dot status disembunyikan (mis. untuk avatar
 * milik "Sistem" yang tidak punya userId, atau saat avatar terlalu kecil untuk
 * menampung dot tanpa terlihat penuh sesak).
 */

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

function getInitials(nama) {
  return (nama || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function isValidImgSrc(src) {
  return (
    !!src &&
    (src.startsWith("data:image/") || src.startsWith("http") || src.startsWith("/"))
  );
}

/**
 * @param {object} props
 * @param {number|string|null} [props.userId]   ID user — dipakai untuk lookup status online. Jika null/undefined, dot status tidak ditampilkan (kecuali forceOnline diberikan).
 * @param {string|null} [props.avatar]           URL/base64 foto profil.
 * @param {string} [props.nama]                  Nama user, untuk fallback inisial & alt text.
 * @param {number} [props.size=36]               Ukuran avatar dalam px (lebar = tinggi).
 * @param {boolean} [props.showStatus=true]       Tampilkan/sembunyikan dot status.
 * @param {boolean} [props.square=false]          Pakai sudut membulat (rounded-lg) bukan lingkaran penuh.
 * @param {string} [props.className]              Class tambahan untuk elemen avatar.
 * @param {boolean} [props.forceOnline]           Override manual status online (mis. untuk currentUser sendiri yang pasti online selama sesi aktif, tanpa menunggu polling pertama).
 */
export default function UserAvatar({
  userId,
  avatar,
  nama,
  size = 36,
  showStatus = true,
  square = false,
  className = "",
  forceOnline,
}) {
  const { isUserOnline } = useApp();
  const [broken, setBroken] = useState(false);

  useEffect(() => { setBroken(false); }, [avatar]);

  const online = typeof forceOnline === "boolean" ? forceOnline : isUserOnline(userId);
  const validSrc = isValidImgSrc(avatar) && !broken;
  const initials = getInitials(nama);

  // Dot status: lingkaran kecil di pojok kanan-bawah avatar.
  // Proporsional terhadap ukuran avatar, dengan minimum agar tetap terlihat.
  const dotSize = Math.max(8, Math.round(size * 0.32));
  const borderWidth = Math.max(1.5, Math.round(size * 0.06));

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      {validSrc ? (
        <img
          src={avatar}
          alt={nama || "Avatar"}
          onError={() => setBroken(true)}
          className={cn(
            "w-full h-full object-cover",
            square ? "rounded-lg" : "rounded-full",
            className
          )}
        />
      ) : (
        <span
          className={cn(
            "w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold select-none",
            square ? "rounded-lg" : "rounded-full",
            className
          )}
          style={{ fontSize: Math.max(9, Math.round(size * 0.36)) }}
          aria-label={nama || "Pengguna"}
        >
          {initials}
        </span>
      )}

      {showStatus && userId !== null && userId !== undefined && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-card",
            online ? "bg-sakura-success" : "bg-muted-foreground/50"
          )}
          style={{
            width: dotSize,
            height: dotSize,
            right: -1,
            bottom: -1,
            boxShadow: `0 0 0 ${borderWidth}px var(--card, #fff)`,
          }}
          aria-label={online ? "Online" : "Offline"}
          title={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}