import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  ROLE_PERMISSIONS,
  FOLDERS,
} from "@/data/mockData.js";
import * as authService from "@/services/authService";
import * as userService from "@/services/userService";
import * as documentService from "@/services/documentService";
import * as notificationService from "@/services/notificationService";
import * as presenceService from "@/services/presenceService";
import { getToken } from "@/lib/apiClient";

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

const NOTIF_POLL_INTERVAL = 60_000;

// ── Online Status (Fitur Online Status) ──────────────────────────────────────
// Tidak ada WebSocket di proyek ini, jadi dipakai solusi paling ringan:
// heartbeat + polling interval pendek (jauh lebih jarang dibanding "polling
// tiap beberapa detik"), dikombinasikan dengan event login/logout/visibility/
// unload supaya status berubah secepat mungkin tanpa membebani server.
const HEARTBEAT_INTERVAL_MS = 20_000; // kirim "saya online" setiap 20 detik
const PRESENCE_POLL_INTERVAL_MS = 20_000; // tarik status user lain setiap 20 detik

export const AppProvider = ({ children }) => {
  // ── Auth State ────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Mobile off-canvas sidebar toggle (dipakai oleh AppSidebar + AppHeader
  // agar drawer sidebar bisa dibuka/ditutup dari luar komponen sidebar itu sendiri)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ── Document State ────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // ── Non-document state ────────────────────────────────────────────────────
  const [rolePermissions, setRolePermissions] = useState(ROLE_PERMISSIONS);

  // ── Notification State — Phase 7: dari API, bukan mock ───────────────────
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const pollingRef = useRef(null);

  // ── Online Status State ───────────────────────────────────────────────────
  // Map { [userId]: boolean } — dipakai oleh komponen UserAvatar di seluruh
  // aplikasi (Header, Approval, Timeline, System Log, Komentar, User Management, dst).
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const heartbeatRef = useRef(null);
  const presencePollRef = useRef(null);

  // ── Folders (tetap lokal) ─────────────────────────────────────────────────
  const [customFolders, setCustomFolders] = useState([]);
  const [nextFolderId, setNextFolderId] = useState(1000);

  // ── Users State ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [pendingUsersState, setPendingUsersState] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [pendingUsersError, setPendingUsersError] = useState(null);

  const isLoggedIn = !!currentUser;

  // ── Restore Session ───────────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (!token) { setAuthLoading(false); return; }
      try {
        const { user } = await authService.getMe();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  // ── Load Notifications dari API ───────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const list = await notificationService.listNotifications();
      setNotifications(list);
    } catch (err) {
      console.error("Gagal memuat notifikasi:", err);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // ── Auto-load + Polling saat user login ───────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    loadNotifications();

    pollingRef.current = setInterval(loadNotifications, NOTIF_POLL_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [currentUser, loadNotifications]);

  // ── Online Status: load status semua user (polling ringan) ───────────────
  const loadOnlineStatuses = useCallback(async () => {
    try {
      const statuses = await presenceService.getStatuses();
      const map = {};
      for (const [id, info] of Object.entries(statuses)) {
        map[id] = !!info.online;
      }
      setOnlineStatuses(map);
    } catch (err) {
      // Gagal diam-diam — status online bersifat "nice to have", tidak boleh
      // mengganggu fungsi utama aplikasi jika request ini gagal.
      console.error("Gagal memuat status online:", err);
    }
  }, []);

  // ── Online Status: heartbeat + polling + deteksi tab ditutup ─────────────
  useEffect(() => {
    // Hentikan timer lama setiap kali efek ini re-run (mis. user berubah).
    const clearTimers = () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (presencePollRef.current) { clearInterval(presencePollRef.current); presencePollRef.current = null; }
    };

    if (!currentUser) {
      clearTimers();
      setOnlineStatuses({});
      return;
    }

    // Kirim heartbeat pertama langsung (tidak menunggu interval pertama).
    presenceService.sendHeartbeat().catch(() => {});
    loadOnlineStatuses();

    heartbeatRef.current = setInterval(() => {
      // Tidak perlu heartbeat jika tab sedang disembunyikan (hemat request);
      // saat tab aktif lagi, listener visibilitychange di bawah akan
      // langsung mengirim heartbeat + refresh status.
      if (document.visibilityState === "visible") {
        presenceService.sendHeartbeat().catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    presencePollRef.current = setInterval(loadOnlineStatuses, PRESENCE_POLL_INTERVAL_MS);

    // Saat user kembali ke tab ini (mis. setelah pindah tab/aplikasi lain),
    // langsung kirim heartbeat + refresh status agar terasa realtime.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        presenceService.sendHeartbeat().catch(() => {});
        loadOnlineStatuses();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Saat browser/tab ditutup: kirim sinyal offline lewat sendBeacon, yang
    // tetap terkirim di background walau halaman sudah dalam proses ditutup
    // (berbeda dari fetch/XHR biasa yang bisa dibatalkan browser).
    const handlePageHide = () => {
      presenceService.markOfflineBeacon(getToken());
    };
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearTimers();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [currentUser, loadOnlineStatuses]);

  // ── Load Documents dari API ───────────────────────────────────────────────
  const loadDocuments = useCallback(async (params = {}) => {
    setDocumentsLoading(true);
    try {
      const { documents: list } = await documentService.listDocuments(params);
      setDocuments(list);
    } catch (err) {
      console.error("Gagal memuat dokumen:", err);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const loadTrashedDocuments = useCallback(async () => {
    try {
      const { documents: list } = await documentService.listTrashedDocuments();
      setTrashedDocuments(list);
    } catch (err) {
      console.error("Gagal memuat dokumen trash:", err);
    }
  }, []);

  // ── Load Users dari API ───────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { users: activeList } = await userService.listUsers();
      setUsers(activeList);
    } catch (err) {
      console.error("Gagal memuat user:", err);
      setUsersError(err.message || "Gagal memuat daftar user");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadPendingUsers = useCallback(async () => {
    setPendingUsersError(null);
    try {
      const { users: pendingList } = await userService.listPendingUsers();
      setPendingUsersState(pendingList);
    } catch (err) {
      console.error("Gagal memuat pending users:", err);
      setPendingUsersError(err.message || "Gagal memuat daftar pendaftar baru");
    }
  }, []);

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const login = async (identifier, password) => {
    try {
      const data = await authService.login(identifier, password);
      if (data.require2FA) {
        return { ok: true, require2FA: true, email: data.email, message: data.message };
      }
      setCurrentUser(data.user);
      return { ok: true, user: data.user };
    } catch (err) {
      const status = err.response?.status;
      const isPending = status === 403 && err.response?.data?.status === "pending";
      return { ok: false, error: err.message || "Login gagal", pending: isPending };
    }
  };

  const finalizeLogin = (user) => {
    setCurrentUser(user);
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setUsers([]);
    setPendingUsersState([]);
    setDocuments([]);
    setTrashedDocuments([]);
    setNotifications([]);
    setOnlineStatuses({});
  };

  // ── Folder CRUD (custom folders, tetap local) ─────────────────────────────
  const createFolder = (folderName, parentPath = null, description = "") => {
    const id = nextFolderId;
    setNextFolderId((n) => n + 1);
    const newFolder = { id, name: folderName, parentPath, description, isCustom: true, createdAt: new Date().toISOString() };
    setCustomFolders((prev) => [...prev, newFolder]);
    return newFolder;
  };

  const editFolder = (folderId, data) => {
    setCustomFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, ...data } : f)));
  };

  const deleteFolder = (folderId) => {
    setCustomFolders((prev) => prev.filter((f) => f.id !== folderId));
  };

  // ── Document CRUD ──────────────────────
  const uploadDocument = async (docOrFormData, onProgress) => {
    if (!hasPermission("documents.upload")) return { ok: false, error: "Akses ditolak" };
    try {
      let formData;
      if (docOrFormData instanceof FormData) {
        formData = docOrFormData;
      } else {
        const doc = docOrFormData;
        formData = new FormData();
        if (doc.file) formData.append("file", doc.file);
        formData.append("judul", doc.judul || "");
        formData.append("category_id", doc.category_id || doc.categoryId || "");
        formData.append("type_id", doc.type_id || doc.typeId || "");
        if (doc.folder_id) formData.append("folder_id", doc.folder_id);
        if (doc.tahun_ajaran || doc.tahunAjaran) formData.append("tahun_ajaran", doc.tahun_ajaran || doc.tahunAjaran);
        if (doc.catatan) formData.append("catatan", doc.catatan);
        if (doc.metadata) formData.append("metadata", typeof doc.metadata === "string" ? doc.metadata : JSON.stringify(doc.metadata));
      }
      const result = await documentService.uploadDocument(formData, onProgress);
      await loadDocuments();
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err.message || "Gagal upload dokumen" };
    }
  };

  const getDownloadUrl = async (docId, expiryMin = 60) => {
    try {
      return await documentService.getDownloadUrl(docId, expiryMin);
    } catch (err) {
      console.error("Gagal mendapatkan download URL:", err);
      return null;
    }
  };

  const replaceDocumentFile = async (docId, file, onProgress) => {
    try {
      const result = await documentService.replaceFile(docId, file, onProgress);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, fileUrl: result.file_url, versi: result.versi, updated_at: new Date().toISOString() }
            : d
        )
      );
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err.message || "Gagal mengganti file" };
    }
  };

  const editDocument = async (docId, data) => {
    try {
      await documentService.updateDocument(docId, data);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, ...data, updated_at: new Date().toISOString() } : d
        )
      );
    } catch (err) {
      console.error("Gagal edit dokumen:", err);
      throw err;
    }
  };

  const moveDocument = async (docId, newFolderPath) => {
    const parts = newFolderPath.split("/");
    const catPart = parts.find((p) => p.startsWith("cat:"));
    const typePart = parts.find((p) => p.startsWith("type:"));
    const yearPart = parts.find((p) => p.startsWith("year:"));
    const catId = catPart ? Number(catPart.split(":")[1]) : null;
    const typeId = typePart ? Number(typePart.split(":")[1]) : null;
    const year = yearPart ? yearPart.split(":")[1] : null;
    if (!catId) return;

    const payload = {};
    if (year) payload.tahun_ajaran = year;

    try {
      if (Object.keys(payload).length > 0) {
        await documentService.updateDocument(docId, payload);
      }
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d;
          return {
            ...d,
            category_id: catId,
            type_id: typeId || d.type_id,
            tahun_ajaran: year || d.tahun_ajaran,
            updated_at: new Date().toISOString(),
          };
        })
      );
    } catch (err) {
      console.error("Gagal move dokumen:", err);
      throw err;
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await documentService.softDeleteDocument(docId);
      setDocuments((prev) => {
        const doc = prev.find((d) => d.id === docId);
        if (doc) {
          setTrashedDocuments((t) => [{ ...doc, deleted_at: new Date().toISOString() }, ...t]);
        }
        return prev.filter((d) => d.id !== docId);
      });
    } catch (err) {
      console.error("Gagal hapus dokumen:", err);
      throw err;
    }
  };

  const restoreDocument = async (docId) => {
    try {
      await documentService.restoreDocument(docId);
      setTrashedDocuments((prev) => {
        const doc = prev.find((d) => d.id === docId);
        if (doc) {
          const { deleted_at, ...restored } = doc;
          setDocuments((d) => [restored, ...d]);
        }
        return prev.filter((d) => d.id !== docId);
      });
    } catch (err) {
      console.error("Gagal restore dokumen:", err);
      throw err;
    }
  };

  const permanentlyDeleteDocument = async (docId) => {
    try {
      await documentService.permanentDeleteDocument(docId);
      setTrashedDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("Gagal hapus permanen:", err);
      throw err;
    }
  };

  const approveDocument = async (docId, comment) => {
    if (!hasPermission("documents.approve")) return;
    try {
      await documentService.approveDocument(docId, comment);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: "Diarsipkan", updated_at: new Date().toISOString() } : d
        )
      );
    } catch (err) {
      console.error("Gagal approve dokumen:", err);
      throw err;
    }
  };

  const rejectDocument = async (docId, reason) => {
    if (!hasPermission("documents.reject")) return;
    try {
      await documentService.rejectDocument(docId, reason);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: "Ditolak", catatan: reason, updated_at: new Date().toISOString() } : d
        )
      );
    } catch (err) {
      console.error("Gagal reject dokumen:", err);
      throw err;
    }
  };

  // ── Approval Workflow ───────────────────────────────────────────
  const createApprovalRequest = async (docId, requesterNote = "") => {
    const result = await documentService.createApprovalRequest(docId, requesterNote);
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: "Menunggu", updated_at: new Date().toISOString() } : d
      )
    );
    await loadNotifications();
    return result;
  };

  const approveRequest = async (requestId, docId, comment = "") => {
    const result = await documentService.approveRequest(requestId, comment);
    if (docId) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: "Diarsipkan", updated_at: new Date().toISOString() } : d
        )
      );
    }
    // Requester mendapat notif → refresh
    await loadNotifications();
    return result;
  };

  const rejectRequest = async (requestId, docId, reason) => {
    const result = await documentService.rejectRequest(requestId, reason);
    if (docId) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: "Ditolak", catatan: reason, updated_at: new Date().toISOString() } : d
        )
      );
    }
    await loadNotifications();
    return result;
  };

  const cancelApprovalRequest = async (requestId, docId) => {
    const result = await documentService.cancelApprovalRequest(requestId);
    if (docId) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: "Ditolak", updated_at: new Date().toISOString() } : d
        )
      );
    }
    return result;
  };

  const listApprovals = async (params = {}) => {
    return documentService.listApprovals(params);
  };

  // ── Users & Auth ──────────────────────────────────────────────────────────
  const registerUser = async (userData) => authService.register(userData);

  const activateUser = async (userId) => {
    await userService.activateUser(userId, "Guru");
    await loadPendingUsers();
    await loadUsers();
  };

  const rejectRegistration = async (userId) => {
    await userService.rejectUser(userId);
    await loadPendingUsers();
  };

  const pendingUsers = pendingUsersState;
  const activeUsers = users;

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    return rolePermissions[currentUser.role]?.includes(permission) ?? false;
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await userService.updateUser(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      if (currentUser?.id === userId) setCurrentUser((prev) => ({ ...prev, role: newRole }));
    } catch (err) {
      console.error("Gagal update role:", err);
      throw err;
    }
  };

  /**
   * Update avatar user.
   *
   * @param {number} userId  
   * @param {string} avatar  
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  const updateUserAvatar = async (userId, avatar) => {
    if (userId !== currentUser?.id) return { ok: false, error: "Bukan user aktif" };
    try {
      await userService.updateAvatar(userId, avatar);
      setCurrentUser((prev) => ({ ...prev, avatar }));
      return { ok: true };
    } catch (err) {
      console.error("Gagal menyimpan avatar:", err);
      return { ok: false, error: err.message || "Gagal menyimpan avatar" };
    }
  };

  const togglePermission = (role, permission) => {
    setRolePermissions((prev) => {
      const current = prev[role];
      const next = current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission];
      return { ...prev, [role]: next };
    });
  };

  const addUser = async (userData) => {
    if (currentUser?.role !== "Operator/TU") return { ok: false, error: "Akses ditolak" };
    try {
      const { user } = await userService.createUser(userData);
      setUsers((prev) => [user, ...prev]);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err.message || "Gagal membuat user" };
    }
  };

  const updateUser = async (userId, data) => {
    if (currentUser?.role !== "Operator/TU") return { ok: false, error: "Akses ditolak" };
    try {
      const { user } = await userService.updateUser(userId, data);
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
      if (currentUser?.id === userId) setCurrentUser((prev) => ({ ...prev, ...user }));
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err.message || "Gagal mengupdate user" };
    }
  };

  const updateProfile = async (data) => {
    const allowed = { nama: data.nama };
    try {
      await userService.updateUser(currentUser.id, allowed);
      setCurrentUser((prev) => ({ ...prev, ...allowed }));
      setUsers((prev) => prev.map((u) => (u.id === currentUser?.id ? { ...u, ...allowed } : u)));
    } catch (err) {
      console.error("Gagal update profil:", err);
      throw err;
    }
  };

  // Setelah password berhasil diganti, hapus penanda "masih pakai password
  // awal" di state lokal juga — supaya ProtectedRoute berhenti memaksa user
  // kembali ke halaman Ganti Password pada navigasi berikutnya, tanpa perlu
  // refresh/refetch /auth/me.
  const changePassword = async (currentPw, newPw) => {
    const data = await authService.changePassword(currentPw, newPw);
    setCurrentUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
    return data;
  };

  const deleteUser = async (userId) => {
    if (currentUser?.role !== "Operator/TU") return { ok: false, error: "Akses ditolak" };
    if (userId === currentUser?.id) return { ok: false, error: "Tidak dapat menghapus akun sendiri" };
    try {
      await userService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Gagal menghapus user" };
    }
  };

  const setTwoFactorEnabled = (enabled) => {
    setCurrentUser((prev) => ({ ...prev, twoFactorEnabled: enabled, is_2fa_enabled: enabled ? 1 : 0 }));
    if (enabled) {
      localStorage.setItem(`sakura_2fa_${currentUser?.email}`, "true");
    } else {
      localStorage.removeItem(`sakura_2fa_${currentUser?.email}`);
    }
  };

  const toggleFavorite = (docId) => {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, favorite: !d.favorite } : d)));
  };

  const archiveDocument = async (docId) => {
    if (!hasPermission("documents.archive")) return;
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId || d.status !== "Disetujui") return d;
        return { ...d, status: "Diarsipkan", updated_at: new Date().toISOString() };
      })
    );
  };

  // ── Notifications ──────────────────────────────────
  const markNotificationRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    try {
      await notificationService.markRead(notifId);
    } catch (err) {
      console.error("Gagal mark notif read:", err);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: false } : n))
      );
    }
  };

  const markAllNotificationsRead = async () => {
    const prev = notifications;
    setNotifications((n) => n.map((item) => ({ ...item, read: true })));
    try {
      await notificationService.markAllRead();
    } catch (err) {
      console.error("Gagal mark all notif read:", err);
      setNotifications(prev); // rollback
    }
  };

  const dismissNotification = async (notifId) => {
    const prev = notifications;
    setNotifications((n) => n.filter((item) => item.id !== notifId));
    try {
      await notificationService.deleteNotification(notifId);
    } catch (err) {
      console.error("Gagal dismiss notif:", err);
      setNotifications(prev); // rollback
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeDocuments = documents;

  const visibleNotifications = notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  /**
   * Cek apakah seorang user sedang online.
   * @param {number|string|null|undefined} userId
   * @returns {boolean}
   */
  const isUserOnline = (userId) => {
    if (userId === null || userId === undefined) return false;
    return !!onlineStatuses[userId] || !!onlineStatuses[String(userId)];
  };

  return (
    <AppContext.Provider
      value={{
        // Auth
        currentUser,
        isLoggedIn,
        authLoading,
        login,
        finalizeLogin,
        logout,
        // Mobile sidebar drawer
        mobileSidebarOpen,
        setMobileSidebarOpen,
        // Users
        users,
        pendingUsers,
        activeUsers,
        usersLoading,
        usersError,
        pendingUsersError,
        loadUsers,
        loadPendingUsers,
        // Documents
        documents,
        activeDocuments,
        trashedDocuments,
        documentsLoading,
        loadDocuments,
        loadTrashedDocuments,
        // Data non-document
        rolePermissions,
        // Notifications — Phase 7
        notifications,
        visibleNotifications,
        notificationsLoading,
        unreadCount,
        loadNotifications,
        customFolders,
        // Online Status
        onlineStatuses,
        isUserOnline,
        loadOnlineStatuses,
        // Auth actions
        registerUser,
        activateUser,
        rejectRegistration,
        // User actions
        updateUserRole,
        updateUserAvatar,
        togglePermission,
        addUser,
        updateUser,
        deleteUser,
        updateProfile,
        changePassword,
        setTwoFactorEnabled,
        // Document actions
        hasPermission,
        approveDocument,
        rejectRequest,
        approveRequest,
        createApprovalRequest,
        cancelApprovalRequest,
        listApprovals,
        rejectDocument,
        uploadDocument,
        getDownloadUrl,
        replaceDocumentFile,
        archiveDocument,
        toggleFavorite,
        editDocument,
        moveDocument,
        deleteDocument,
        restoreDocument,
        permanentlyDeleteDocument,
        // Notification actions — Phase 7
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        // Folder actions
        createFolder,
        editFolder,
        deleteFolder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};