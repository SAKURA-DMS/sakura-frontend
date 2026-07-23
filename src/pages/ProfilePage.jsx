import { useState, useRef, useEffect } from "react";
import { User, Mail, Shield, Building2, Camera, Upload as UploadIcon, Save, Hash, Pencil } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import UserAvatar from "@/components/shared/UserAvatar";

export default function ProfilePage() {
  const { currentUser, updateUserAvatar, updateProfile } = useApp();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(currentUser.nama);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [viewImage, setViewImage] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSaveClick = () => {
    if (!fullName.trim()) {
      toast({ title: "Nama tidak boleh kosong", variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const confirmSave = () => {
    setShowConfirm(false);
    setSaving(true);
    setTimeout(() => {
      updateProfile({ nama: fullName.trim() });
      toast({ title: "Profil disimpan", description: "Nama lengkap berhasil diperbarui." });
      setSaving(false);
      setIsEditing(false);
    }, 400);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewPhoto(reader.result);
      setShowPhotoMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const savePhoto = async () => {
    if (!previewPhoto) return;
    setSavingPhoto(true);
    try {
      const result = await updateUserAvatar(currentUser.id, previewPhoto);
      if (result && result.ok === false) {
        toast({
          title: "Gagal menyimpan foto",
          description: result.error || "Terjadi kesalahan saat menyimpan avatar.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Foto profil diperbarui", description: "Avatar berhasil disimpan ke database." });
        setPreviewPhoto(null);
      }
    } catch (err) {
      toast({
        title: "Gagal menyimpan foto",
        description: err.message || "Terjadi kesalahan saat menyimpan avatar.",
        variant: "destructive",
      });
    } finally {
      setSavingPhoto(false);
    }
  };

  const cancelPhoto = () => setPreviewPhoto(null);

  const openCamera = async () => {
    setShowPhotoMenu(false);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast({ title: "Kamera tidak tersedia", variant: "destructive" });
      setShowCameraModal(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    setPreviewPhoto(canvas.toDataURL("image/jpeg", 0.9));
    closeCamera();
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCameraModal(false);
  };

  const hasValidAvatar =
    currentUser.avatar &&
    (currentUser.avatar.startsWith("data:image/") ||
      currentUser.avatar.startsWith("http") ||
      currentUser.avatar.startsWith("/"));

  return (
    <>
      <AppHeader title="Profil Saya" subtitle="Lihat dan kelola informasi profil Anda" />
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto animate-fade-in">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Avatar section */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div
                onClick={() => !previewPhoto && hasValidAvatar && setViewImage(true)}
                title={!previewPhoto && hasValidAvatar ? "Klik untuk memperbesar foto" : undefined}
                className={!previewPhoto && hasValidAvatar ? "cursor-pointer hover:opacity-80 transition" : undefined}
              >
                <UserAvatar
                  userId={currentUser.id}
                  avatar={previewPhoto || currentUser.avatar}
                  nama={currentUser.nama}
                  size={96}
                  className="border-4 border-primary/20"
                  forceOnline
                />
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-foreground">{currentUser.nama}</div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                {currentUser.role}
              </span>
            </div>

            {previewPhoto ? (
              <div className="flex gap-2">
                <button
                  onClick={savePhoto}
                  disabled={savingPhoto}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save size={16} /> {savingPhoto ? "Menyimpan..." : "Simpan Foto"}
                </button>
                <button
                  onClick={cancelPhoto}
                  disabled={savingPhoto}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors"
                >
                  <Camera size={16} /> Ubah Foto
                </button>
                {showPhotoMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPhotoMenu(false)} />
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-48 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                      <label className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
                        <UploadIcon size={16} className="text-muted-foreground" /> Upload Foto
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <button onClick={openCamera} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                        <Camera size={16} className="text-muted-foreground" /> Ambil dari Kamera
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Profile details */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <User size={18} className="text-primary" /> Informasi Profil
            </h3>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Nama Lengkap</label>
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  autoFocus
                />
              ) : (
                <div className="px-3 py-2.5 text-sm rounded-lg bg-muted/50 border border-border cursor-not-allowed select-none text-foreground font-semibold">
                  {currentUser.nama}
                </div>
              )}
            </div>

            {[
              { icon: Mail, label: "Email", value: currentUser.email },
              { icon: Shield, label: "Role", value: currentUser.role },
              { icon: Building2, label: "Departemen", value: currentUser.departemen || "-" },
              { icon: Hash, label: "NIP", value: currentUser.nip || "-" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{label}</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border cursor-not-allowed select-none">
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground">{value}</span>
                </div>
              </div>
            ))}

            <div className="pt-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Pencil size={16} /> Edit Informasi Profil
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsEditing(false); setFullName(currentUser.nama); }}
                    className="w-1/2 py-2.5 rounded-lg border border-input text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="w-1/2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pop Up Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan Perubahan Profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menyimpan perubahan pada profil ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Ya, Simpan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expand Full Image Overlay */}
      {viewImage && hasValidAvatar && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6" onClick={() => setViewImage(false)}>
          <img src={currentUser.avatar} alt="Avatar" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200" onError={() => setViewImage(false)} />
          <button className="absolute top-6 right-6 text-white/70 hover:text-white" onClick={() => setViewImage(false)}>Tutup</button>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-foreground">Ambil Foto</h3>
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black aspect-[4/3] object-cover" />
            <div className="flex gap-2 justify-end">
              <button onClick={closeCamera} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-colors">Batal</button>
              <button onClick={capturePhoto} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                <Camera size={16} className="inline mr-2" /> Ambil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}