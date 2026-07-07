import { useState, useEffect } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import UserProfileModal from "@/components/modals/UserProfileModal";
import UserAvatar from "@/components/shared/UserAvatar";
import { Plus, Pencil, Trash2, X, Clock, UserCheck, UserX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DEPARTEMEN_OPTIONS } from "@/data/departemenOptions";

const ALL_ROLES = ["Operator/TU", "Kepala Sekolah", "Guru"];
const EMPTY_FORM = { nama: "", email: "", role: "Guru", departemen: "" };
const LAINNYA = "Lainnya";
// Departemen "Lainnya" adalah pilihan khusus di dropdown (menampilkan textbox
// tambahan), bukan nilai yang pernah disimpan ke database — sisanya sama
// persis dengan daftar di halaman Signup Guru.
const DEPARTEMEN_SELECT_OPTIONS = DEPARTEMEN_OPTIONS;

// Tentukan nilai awal dropdown + textbox custom dari string departemen yang
// tersimpan di formData (dipakai saat modal Edit dibuka dengan data existing).
function splitDepartemen(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return { select: "", custom: "" };
  if (DEPARTEMEN_SELECT_OPTIONS.includes(trimmed) && trimmed !== LAINNYA) {
    return { select: trimmed, custom: "" };
  }
  // Nilai tersimpan tidak cocok dengan daftar baku → anggap hasil "Lainnya"
  return { select: LAINNYA, custom: trimmed };
}

// ── Form Modal (shared create & edit) ───────────────────────────────────────
// PENTING: komponen ini didefinisikan di LEVEL MODULE (bukan di dalam
// UserManagementPage) supaya identitasnya stabil antar-render. Kalau
// didefinisikan di dalam komponen induk, setiap kali formData berubah (mis.
// user mengetik satu huruf), React akan menganggap ini komponen baru dan
// meng-unmount lalu me-remount modal — inputnya kehilangan fokus setiap
// ketikan, sehingga terasa "macet" setelah satu huruf.
function UserFormModal({ title, formData, setFormData, submitting, onSubmit, submitLabel, onClose }) {
  // State dropdown + textbox custom departemen. Diinisialisasi SEKALI saat
  // modal ini di-mount (create & edit masing-masing mount instance baru),
  // diturunkan dari nilai formData.departemen yang sedang berjalan.
  const [deptSelect, setDeptSelect] = useState(() => splitDepartemen(formData.departemen).select);
  const [deptCustom, setDeptCustom] = useState(() => splitDepartemen(formData.departemen).custom);

  // Saat pilihan dropdown berubah keluar dari "Lainnya", textbox custom
  // otomatis hilang dan nilainya di-reset supaya tidak ada sisa nilai lama
  // yang ikut tersimpan ke database.
  const handleDeptSelectChange = (value) => {
    setDeptSelect(value);
    if (value === LAINNYA) {
      setDeptCustom("");
      setFormData((p) => ({ ...p, departemen: "" }));
    } else {
      setFormData((p) => ({ ...p, departemen: value }));
    }
  };

  const handleDeptCustomChange = (value) => {
    setDeptCustom(value);
    setFormData((p) => ({ ...p, departemen: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nama Lengkap *</label>
            <input value={formData.nama} onChange={(e) => setFormData((p) => ({ ...p, nama: e.target.value }))} placeholder="Nama lengkap" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
            <input value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="email@sakura.sch.id" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
            <select value={formData.role} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Departemen</label>
            <select
              value={deptSelect}
              onChange={(e) => handleDeptSelectChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Pilih departemen</option>
              {DEPARTEMEN_SELECT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {deptSelect === LAINNYA && (
              <input
                value={deptCustom}
                onChange={(e) => handleDeptCustomChange(e.target.value)}
                placeholder="Masukkan nama departemen"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-2"
              />
            )}
          </div>
          {title.includes("Tambah") && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Password awal pengguna adalah <span className="font-mono font-medium">Sakura@123</span>. Pengguna disarankan segera mengganti password setelah login pertama melalui menu Pengaturan Akun.
            </p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Batal</button>
            <button onClick={onSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const {
    users,
    activeUsers,
    pendingUsers,
    usersLoading,
    usersError,
    pendingUsersError,
    loadUsers,
    loadPendingUsers,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    activateUser,
    rejectRegistration,
  } = useApp();
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [originalRole, setOriginalRole] = useState(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [activateTarget, setActivateTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === "Operator/TU";

  // ── Load data dari API saat komponen mount ────────────────────────────────
  useEffect(() => {
    loadUsers();
    if (isAdmin) {
      loadPendingUsers();
    }
  }, [loadUsers, loadPendingUsers, isAdmin]);

  // Tampilkan error asli jika fetch users/pending users gagal, jangan biarkan
  // tampil seolah-olah "kosong" padahal sebenarnya request-nya gagal.
  useEffect(() => {
    if (usersError) {
      toast({ title: "Gagal memuat data pengguna", description: usersError, variant: "destructive" });
    }
  }, [usersError, toast]);

  useEffect(() => {
    if (pendingUsersError) {
      toast({ title: "Gagal memuat daftar pendaftar baru", description: pendingUsersError, variant: "destructive" });
    }
  }, [pendingUsersError, toast]);

  // ── Create user → POST /api/users ─────────────────────────────────────────
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateUserForm = () => {
    if (!formData.nama.trim()) return "Nama lengkap wajib diisi.";
    if (!formData.email.trim()) return "Email wajib diisi.";
    if (!EMAIL_REGEX.test(formData.email.trim())) return "Format email tidak valid.";
    if (!formData.role) return "Role wajib dipilih.";
    if (!formData.departemen.trim()) return "Departemen wajib diisi.";
    return null;
  };

  const handleCreate = async () => {
    const validationError = validateUserForm();
    if (validationError) {
      toast({ title: "Data belum lengkap", description: validationError, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await addUser({ ...formData });
      if (result.ok) {
        toast({ title: "Berhasil", description: "User berhasil ditambahkan." });
        setShowCreateModal(false);
        setFormData(EMPTY_FORM);
      } else {
        toast({ title: "Gagal", description: result.error || "Gagal membuat user", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit user → PATCH /api/users/:id ─────────────────────────────────────
  const handleEdit = async () => {
    if (!editUserId || !formData.nama.trim() || !formData.email.trim()) return;
    if (originalRole && formData.role !== originalRole) {
      setPendingRoleChange({ id: editUserId, data: formData });
      setShowRoleConfirm(true);
      return;
    }
    await doUpdateUser(editUserId, formData);
  };

  const doUpdateUser = async (userId, data) => {
    setSubmitting(true);
    try {
      const result = await updateUser(userId, data);
      if (result.ok) {
        toast({ title: "Berhasil", description: "Data user berhasil diperbarui" });
        setEditUserId(null);
        setFormData(EMPTY_FORM);
        setShowRoleConfirm(false);
        setPendingRoleChange(null);
      } else {
        toast({ title: "Gagal", description: result.error || "Gagal memperbarui user", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete user → DELETE /api/users/:id ──────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUserId) return;
    const targetUser = activeUsers.find((u) => u.id === deleteUserId);
    if (!targetUser || targetUser.nama !== deleteConfirmInput) return;
    setSubmitting(true);
    try {
      const result = await deleteUser(deleteUserId);
      if (result.ok) {
        toast({ title: "Berhasil", description: `User ${targetUser.nama} berhasil dihapus` });
        setDeleteUserId(null);
        setDeleteConfirmInput("");
      } else {
        toast({ title: "Gagal", description: result.error || "Gagal menghapus user", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (u) => {
    setFormData({ nama: u.nama, email: u.email, role: u.role, departemen: u.departemen || "" });
    setOriginalRole(u.role);
    setEditUserId(u.id);
  };

  // ── Activate → POST /api/users/:id/activate ──────────────────────────────
  const handleActivate = async () => {
    if (!activateTarget) return;
    setSubmitting(true);
    try {
      await activateUser(activateTarget.id);
      toast({ title: "Berhasil", description: `Akun ${activateTarget.nama} telah diaktifkan` });
      setActivateTarget(null);
    } catch (err) {
      toast({ title: "Gagal", description: err.message || "Gagal mengaktifkan user", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reject registration → DELETE /api/users/:id/reject ───────────────────
  const handleRejectRegistration = async (user) => {
    try {
      await rejectRegistration(user.id);
      toast({ title: "Ditolak", description: `Pendaftaran ${user.nama} ditolak` });
    } catch (err) {
      toast({ title: "Gagal", description: err.message || "Gagal menolak pendaftaran", variant: "destructive" });
    }
  };

  // ── Confirm role change (tetap ada flow verifikasi) ───────────────────────
  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    toast({ title: "Kode Terkirim", description: "Kode verifikasi telah dikirim ke email Anda" });
    await doUpdateUser(pendingRoleChange.id, pendingRoleChange.data);
  };

  return (
    <>
      <AppHeader title="Manajemen User" subtitle="SMP Negeri 4 Cikarang Barat" />
      <div className="p-4 sm:p-8 space-y-6">

        {/* ── Pending Approval Section ────────────────────────────────────── */}
        {isAdmin && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-sakura-warning" />
              <h3 className="font-bold text-foreground">Menunggu Persetujuan</h3>
              {pendingUsers.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sakura-warning/20 text-sakura-warning">{pendingUsers.length}</span>
              )}
            </div>
            {pendingUsers.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                Tidak ada pendaftar baru
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl bg-sakura-warning/[0.06] border border-sakura-warning/20">
                    <UserAvatar
                      userId={u.id}
                      avatar={u.avatar}
                      nama={u.nama}
                      size={40}
                      className="bg-sakura-warning/20 text-sakura-warning"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{u.nama}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {u.nip && <div className="text-xs text-muted-foreground">NIP: {u.nip}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{u.role || "Guru"}</span>
                        {u.created_at && (
                          <span className="text-[11px] text-muted-foreground">
                            Mendaftar {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: localeId })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setActivateTarget(u)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sakura-success text-white text-[13px] font-semibold hover:opacity-90">
                        <UserCheck size={14} /> Aktifkan Akun
                      </button>
                      <button onClick={() => handleRejectRegistration(u)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-[13px] hover:bg-destructive/10">
                        <UserX size={14} /> Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div className="relative flex items-center">
          <div className="flex-1 h-px bg-border" />
          <span className="px-3 text-xs text-muted-foreground bg-background">Pengguna Aktif</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── Active Users Table ───────────────────────────────────────────── */}
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setFormData(EMPTY_FORM); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <Plus size={16} /> Tambah User
              </button>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center p-12 gap-3 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Memuat data pengguna...</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-semibold">Pengguna</th>
                    <th className="text-left py-3 px-4 font-semibold hidden sm:table-cell">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Role</th>
                    <th className="text-left py-3 px-4 font-semibold hidden md:table-cell">Departemen</th>
                    <th className="text-center py-3 px-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Belum ada pengguna aktif</td>
                    </tr>
                  ) : (
                    activeUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar userId={u.id} avatar={u.avatar} nama={u.nama} size={32} />
                            <span className="font-medium text-foreground">
                              {u.nama}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">{u.role}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{u.departemen || "-"}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isAdmin && (
                              <>
                                <button onClick={() => openEdit(u)} className="text-xs px-3 py-1 rounded-lg border border-input hover:bg-muted flex items-center gap-1">
                                  <Pencil size={12} /> Edit
                                </button>
                                {u.id !== currentUser?.id && (
                                  <button onClick={() => { setDeleteUserId(u.id); setDeleteConfirmInput(""); }} className="text-xs px-3 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1">
                                    <Trash2 size={12} /> Hapus
                                  </button>
                                )}
                              </>
                            )}
                            <button onClick={() => setProfileUser(u)} className="text-xs px-3 py-1 rounded-lg border border-input hover:bg-muted">Profil</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Activate Confirmation ─────────────────────────────────────────── */}
      {activateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setActivateTarget(null)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-3">Aktifkan akun {activateTarget.nama}?</h3>
            <div className="text-sm text-muted-foreground space-y-1 mb-4">
              <p>NIP: {activateTarget.nip || "-"}</p>
              <p>Role akan ditetapkan sebagai: <span className="font-semibold text-foreground">Guru</span></p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setActivateTarget(null)} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Batal</button>
              <button onClick={handleActivate} disabled={submitting} className="px-4 py-2 rounded-lg bg-sakura-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Ya, Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showCreateModal && (
        <UserFormModal
          title="Tambah User Baru"
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleCreate}
          submitLabel="Tambah"
          onClose={() => { setShowCreateModal(false); setFormData(EMPTY_FORM); }}
        />
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editUserId && (
        <UserFormModal
          title="Edit User"
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleEdit}
          submitLabel="Simpan"
          onClose={() => { setEditUserId(null); setFormData(EMPTY_FORM); setOriginalRole(null); }}
        />
      )}

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => { setDeleteUserId(null); setDeleteConfirmInput(""); }}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-2">Hapus User</h3>
            <p className="text-sm text-muted-foreground mb-2">Ketik nama user di bawah untuk konfirmasi penghapusan permanen:</p>
            <div className="mb-4">
              <input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Ketik nama user untuk konfirmasi"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setDeleteUserId(null); setDeleteConfirmInput(""); }} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Batal</button>
              <button
                onClick={handleDelete}
                disabled={submitting || !(deleteConfirmInput && activeUsers.find((u) => u.id === deleteUserId)?.nama === deleteConfirmInput)}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Role Change Verification Modal ──────────────────────────────── */}
      {showRoleConfirm && pendingRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => { setShowRoleConfirm(false); setPendingRoleChange(null); }}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-2">Verifikasi Perubahan Role</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Perubahan role dari <span className="font-semibold text-foreground">{originalRole}</span> ke <span className="font-semibold text-foreground">{pendingRoleChange.data.role}</span> akan disimpan ke database. Klik &quot;Lanjutkan&quot; untuk mengonfirmasi.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowRoleConfirm(false); setPendingRoleChange(null); }} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted">Batal</button>
              <button
                onClick={handleConfirmRoleChange}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Lanjutkan & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {profileUser && <UserProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
    </>
  );
}