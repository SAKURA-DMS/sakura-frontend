import { useState } from "react";
import { Shield, Check, X as XIcon } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useApp } from "@/contexts/AppContext";
import { PERMISSIONS } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ROLES = [
  {
    role: "Operator/TU",
    desc: "Akses penuh ke semua fitur sistem",
  },
  {
    role: "Kepala Sekolah",
    desc: "Monitor arsip dan persetujuan dokumen",
  },
  {
    role: "Guru",
    desc: "Lihat dokumen arsip sesuai hak akses",
  },
];

export default function RoleManagementPage() {
  const { rolePermissions, togglePermission } = useApp();
  const { toast } = useToast();

  const [pendingToggle, setPendingToggle] = useState(null);

  const handleAskToggle = (role, permKey) => {
    const perm = PERMISSIONS.find((p) => p.key === permKey);
    const has = rolePermissions?.[role]?.includes(permKey) || false;

    setPendingToggle({
      role,
      permKey,
      permLabel: perm?.label || permKey,
      has,
    });
  };

  const handleConfirmToggle = () => {
    if (!pendingToggle) return;

    togglePermission(pendingToggle.role, pendingToggle.permKey);

    toast({
      title: "Hak akses diperbarui",
      description: `Perubahan untuk ${pendingToggle.permLabel} pada role ${pendingToggle.role} sudah disimpan.`,
    });

    setPendingToggle(null);
  };

  return (
    <>
      <AppHeader
        title="Manajemen Role"
        subtitle="SMP Negeri 4 Cikarang Barat"
      />

      <div className="p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={22} className="text-primary" />

            <h2 className="text-xl font-bold text-foreground">
              Manajemen Role & Permission
            </h2>
          </div>

          <p className="text-muted-foreground text-sm">
            Konfigurasi akses berdasarkan role pengguna (RBAC)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLES.map(({ role, desc }) => (
            <div
              key={role}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield size={20} className="text-primary" />
                </div>

                <div>
                  <div className="font-bold text-foreground">{role}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PERMISSIONS.filter((p) =>
                  rolePermissions[role].includes(p.key)
                ).map((p) => (
                  <span
                    key={p.key}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-foreground font-medium"
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-1">Matriks RBAC</h3>

          <p className="text-xs text-muted-foreground mb-4">
            Role-Based Access Control Matrix
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Permission
                  </th>

                  {ROLES.map(({ role }) => (
                    <th
                      key={role}
                      className="text-center py-3 px-4 font-semibold text-foreground"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="border-b border-border/50">
                    <td className="py-3 px-4 text-foreground font-medium">
                      {perm.label}
                    </td>

                    {ROLES.map(({ role }) => {
                      const has = rolePermissions[role].includes(perm.key);

                      return (
                        <td key={role} className="text-center py-3 px-4">
                          <div className="relative inline-flex group">
                            <button
                              onClick={() => handleAskToggle(role, perm.key)}
                              className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors ${
                                has
                                  ? "bg-sakura-success/20 text-sakura-success hover:bg-sakura-success/30"
                                  : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              }`}
                              aria-label={`${
                                has ? "Nonaktifkan" : "Aktifkan"
                              } akses ${perm.label} untuk ${role}`}
                            >
                              {has ? (
                                <Check size={16} />
                              ) : (
                                <XIcon size={16} />
                              )}
                            </button>

                            {/* HOVER NOTIFICATION */}
                            <div
                              className="
                                pointer-events-none
                                absolute
                                bottom-full
                                left-1/2
                                z-50
                                mb-2
                                w-max
                                max-w-[260px]
                                -translate-x-1/2
                                rounded-lg
                                bg-foreground
                                px-3
                                py-2
                                text-xs
                                font-medium
                                leading-relaxed
                                text-background
                                opacity-0
                                invisible
                                shadow-lg
                                transition-all
                                duration-150
                                group-hover:visible
                                group-hover:opacity-100
                              "
                            >
                              Klik untuk {has ? "menonaktifkan" : "mengaktifkan"}{" "}
                              akses &quot;{perm.label}&quot; untuk {role}

                              <span
                                className="
                                  absolute
                                  left-1/2
                                  top-full
                                  h-2
                                  w-2
                                  -translate-x-1/2
                                  -translate-y-1
                                  rotate-45
                                  bg-foreground
                                "
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!pendingToggle}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi perubahan akses</AlertDialogTitle>

            <AlertDialogDescription>
              {pendingToggle
                ? pendingToggle.has
                  ? `Akses "${pendingToggle.permLabel}" untuk role "${pendingToggle.role}" akan dimatikan.`
                  : `Akses "${pendingToggle.permLabel}" untuk role "${pendingToggle.role}" akan diaktifkan.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>

            <AlertDialogAction onClick={handleConfirmToggle}>
              Ya, ubah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}