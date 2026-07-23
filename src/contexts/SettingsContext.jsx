import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext.jsx";

const DEFAULT_SETTINGS = {
  theme: "light",
  notifications: { email: true, inApp: true, upload: true, approve: true, reject: true, folderShare: true, frequency: "realtime" },
  scan: { autoCrop: true, compression: "medium", autoSaveFolder: "" },
  security: { twoFactor: false, sessionTimeout: "1h" },
};

const SettingsContext = createContext(null);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export const SettingsProvider = ({ children }) => {
  const { currentUser } = useApp();
  const storageKey = `sakura_prefs_${currentUser?.id ?? "guest"}`;

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(settings)); }, [settings, storageKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      else setSettings(DEFAULT_SETTINGS);
    } catch { setSettings(DEFAULT_SETTINGS); }
  }, [storageKey]);

  const updateSettings = useCallback((partial) => { setSettings((prev) => ({ ...prev, ...partial })); }, []);
  const updateNotifications = useCallback((partial) => { setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, ...partial } })); }, []);
  const updateScan = useCallback((partial) => { setSettings((prev) => ({ ...prev, scan: { ...prev.scan, ...partial } })); }, []);
  const updateSecurity = useCallback((partial) => { setSettings((prev) => ({ ...prev, security: { ...prev.security, ...partial } })); }, []);
  const resetToDefault = useCallback(() => { setSettings(DEFAULT_SETTINGS); }, []);

  const exportPreferences = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sakura_preferences_${currentUser?.id ?? "guest"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings, currentUser?.id]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updateNotifications, updateScan, updateSecurity, resetToDefault, exportPreferences }}>
      {children}
    </SettingsContext.Provider>
  );
};