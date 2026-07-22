import { useEffect, useRef } from "react";
import { onApiActivity } from "@/lib/apiClient";
import { refreshSession } from "@/services/authService";

// Idle 12 jam → auto logout
const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

// Refresh session maksimal setiap 5 menit selama user aktif
const REFRESH_THROTTLE_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = ["click", "mousemove", "keydown", "scroll"];

export function useIdleSession(enabled, onIdle) {
  const idleTimerRef = useRef(null);
  const lastRefreshRef = useRef(0);
  const onIdleRef = useRef(onIdle);

  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      lastRefreshRef.current = 0;
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        onIdleRef.current?.();
      }, IDLE_TIMEOUT_MS);
    };

    const handleActivity = () => {
      resetIdleTimer();

      const now = Date.now();

      if (
        now - lastRefreshRef.current >= REFRESH_THROTTLE_MS
      ) {
        lastRefreshRef.current = now;

        refreshSession().catch(() => {
          // Tidak mengganggu sesi aktif jika refresh gagal.
        });
      }
    };

    resetIdleTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, {
        passive: true,
      });
    });

    const unsubscribeApiActivity =
      onApiActivity(handleActivity);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(
          event,
          handleActivity
        );
      });

      unsubscribeApiActivity();
    };
  }, [enabled]);
}