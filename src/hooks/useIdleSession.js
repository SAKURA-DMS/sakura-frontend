import { useEffect, useRef } from "react";
import { onApiActivity } from "@/lib/apiClient";
import { refreshSession } from "@/services/authService";

// Idle 12 jam → auto-logout, sesuai requirement Task 2.
const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

// Sesi diperpanjang (POST /auth/refresh-session) paling sering setiap 5
// menit selagi user aktif, bukan setiap kali ada event mousemove/scroll —
// supaya tidak membanjiri backend dengan request setiap beberapa milidetik.
const REFRESH_THROTTLE_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = ["click", "mousemove", "keydown", "scroll"];

/**
 * useIdleSession
 *
 * @param {boolean} enabled - aktifkan tracking (biasanya: user sedang login)
 * @param {() => void} onIdle - dipanggil sekali saat idle 12 jam tercapai
 */
export function useIdleSession(enabled, onIdle) {
  const idleTimerRef = useRef(null);
  const lastRefreshRef = useRef(0);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        onIdleRef.current?.();
      }, IDLE_TIMEOUT_MS);
    };

    const handleActivity = () => {
      resetIdleTimer();

      // Perpanjang token di backend, di-throttle supaya tidak spam request.
      const now = Date.now();
      if (now - lastRefreshRef.current >= REFRESH_THROTTLE_MS) {
        lastRefreshRef.current = now;
        refreshSession().catch(() => {
          // Gagal memperpanjang sesi tidak boleh mengganggu user secara
          // langsung — token lama masih berlaku sampai expiry aslinya;
          // idle timer di sisi client tetap menjadi jaring pengaman utama.
        });
      }
    };

    // Mulai timer & anggap saat hook aktif sebagai aktivitas awal.
    resetIdleTimer();

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    // Request API (lihat apiClient.js) juga dihitung sebagai aktivitas.
    const unsubscribeApiActivity = onApiActivity(handleActivity);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      );
      unsubscribeApiActivity();
    };
  }, [enabled]);
}