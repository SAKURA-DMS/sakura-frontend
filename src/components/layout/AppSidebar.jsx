import { useState, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Archive,
  Users,
  Shield,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Clock,
  CheckCircle,
  GitBranch,
  FolderOpen,
  Trash2,
  X,
} from "lucide-react";

import logoSakura from "@/assets/logo_sakura.png";
import { useApp } from "@/contexts/AppContext";
import { SIDEBAR_FOLDERS, MODULE_DEFINITIONS, canViewModule } from "@/data/mockData";

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { hasPermission, documents, currentUser, mobileSidebarOpen, setMobileSidebarOpen } = useApp();

  const [collapsed, setCollapsed] = useState(false);

  // Hanya Arsip & Persetujuan yang punya dropdown
  const [approvalOpen, setApprovalOpen] = useState(
    location.pathname.startsWith("/approval")
  );
  const [arsipOpen, setArsipOpen] = useState(
    location.pathname === "/archive"
  );

  const isGuru     = currentUser.role === "Guru";
  const isOperator = currentUser.role === "Operator/TU";
  const isKepsek   = currentUser.role === "Kepala Sekolah";

  const pendingCount = documents.filter((d) => d.status === "Menunggu").length;
  const showApproval = hasPermission("documents.approve") || isOperator;

  // Count docs per folder
  const folderCounts = useMemo(() => {
    const counts = {};
    SIDEBAR_FOLDERS.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          counts[child.folder] = documents.filter((d) => {
            const parts    = child.path.split("/");
            const catPart  = parts.find((p) => p.startsWith("cat:"));
            const typePart = parts.find((p) => p.startsWith("type:"));
            const catId    = catPart  ? Number(catPart.split(":")[1])  : null;
            const typeId   = typePart ? Number(typePart.split(":")[1]) : null;
            if (catId  && d.category_id !== catId)  return false;
            if (typeId && d.type_id     !== typeId) return false;
            return true;
          }).length;
        });
      }
    });
    return counts;
  }, [documents]);

  const visibleFolders = useMemo(() => {
    return SIDEBAR_FOLDERS.filter((item) => {
      if (!item.module) return true; // "Semua Dokumen" — tampil untuk semua role
      const mod = MODULE_DEFINITIONS.find((m) => m.id === item.moduleId);
      return canViewModule(currentUser.role, mod); // permission per-modul, bukan pemisahan per-role
    });
  }, [currentUser.role]);

  const currentFolder  = searchParams.get("folder");
  const approvalActive = location.pathname.startsWith("/approval");
  const dashActive     = location.pathname === "/dashboard";
  const arsipActive    = location.pathname === "/archive";

  const handleNavigate = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate(path);
    // Di layar HP, sidebar berupa drawer overlay — tutup otomatis setelah
    // memilih menu supaya konten halaman langsung terlihat.
    setMobileSidebarOpen(false);
  };

  const simpleItems = [
    hasPermission("documents.upload") && { label: "Upload",   icon: Upload,   path: "/upload" },
    (hasPermission("users.manage") || hasPermission("users.approve")) && { label: "Pengguna", icon: Users,    path: "/users"  },
    hasPermission("roles.manage")     && { label: "Role",     icon: Shield,   path: "/roles"  },
    hasPermission("audit.view")       && { label: "Log",      icon: FileText, path: "/logs"   },
  ].filter(Boolean);

  // ── NavButton: item tanpa dropdown ──────────────────────────────────────────
  const NavButton = ({ active, icon: Icon, label, onClick, badge }) => (
    <button
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex ${
        collapsed
          ? "flex-col items-center justify-center py-3 px-1"
          : "items-center gap-3 px-3 py-2.5"
      } rounded-xl font-medium ${
        active
          ? "bg-primary/[0.08] text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      }`}
    >
      <Icon size={collapsed ? 22 : 18} className={`shrink-0 ${active ? "text-primary" : ""}`} />
      {!collapsed && (
        <span className="text-[13px] flex-1 text-left font-semibold">{label}</span>
      )}
      {badge && !collapsed && (
        <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  );

  // ── DropdownGroup: item dengan sub-menu ─────────────────────────────────────
  const DropdownGroup = ({ open, onToggle, active, icon: Icon, label, onClickNav, children, badge }) => (
    <div className="mb-1">
      {collapsed ? (
        <NavButton active={active} icon={Icon} label={label} badge={badge} onClick={onClickNav} />
      ) : (
        <>
          <div className={`group flex items-center justify-between px-3 py-2.5 rounded-xl ${
            active
              ? "bg-primary/[0.08] text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}>
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={onClickNav}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-[13px] font-semibold">{label}</span>
              {badge && (
                <span className="ml-auto mr-2 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-center">
                  {badge}
                </span>
              )}
            </div>
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="p-1 rounded-md shrink-0"
            >
              <ChevronDown size={14} className={open ? "rotate-180" : ""} />
            </button>
          </div>

          <div style={{ display: open ? "block" : "none" }}>
            <div className="mt-1 pl-4 border-l border-sidebar-border/50 ml-5 space-y-1">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop — hanya tampil di layar HP/tablet saat drawer terbuka */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen bg-sidebar flex flex-col shrink-0 border-r border-sidebar-border
          w-[260px] max-w-[80vw] transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto
          ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}`}
      >
      {/* Header */}
      <div className="px-3 pt-5 pb-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCollapsed(false)}
              className="hidden lg:block p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <PanelLeft size={18} />
            </button>
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleNavigate(e, "/home")}
              className="hover:opacity-80"
            >
              <img src={logoSakura} alt="SAKURA" className="w-9 h-9 rounded-xl" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleNavigate(e, "/home")}
              className="hover:opacity-80 shrink-0"
            >
              <img src={logoSakura} alt="SAKURA" className="w-9 h-9 rounded-xl" />
            </button>
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleNavigate(e, "/home")}
              className="text-left hover:opacity-80 min-w-0 flex-1"
            >
              <div className="text-primary font-semibold text-sm tracking-wider">SAKURA</div>
              <div className="text-sidebar-foreground/50 text-[10px] font-medium">Document Management</div>
            </button>
            {/* Tombol collapse — hanya berguna di layar besar */}
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCollapsed(true)}
              className="hidden lg:block p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <PanelLeftClose size={18} />
            </button>
            {/* Tombol tutup drawer — hanya tampil di layar HP/tablet */}
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-sidebar-border" />

      {/* NAV */}
      <nav
        onMouseDown={(e) => e.preventDefault()}
        className="flex-1 px-2 mt-3 space-y-1 overflow-y-auto scrollbar-thin pb-4"
        style={{ scrollBehavior: "auto" }}
      >

        {/* ── 1. DASHBOARD — langsung, tanpa dropdown ── */}
        <NavButton
          active={dashActive}
          icon={LayoutDashboard}
          label="Dashboard"
          onClick={(e) => handleNavigate(e, "/dashboard")}
        />

        {/* ── 2. PERSETUJUAN — menu sendiri dengan sub-item ── */}
        {showApproval && (
          <DropdownGroup
            open={approvalOpen}
            onToggle={() => setApprovalOpen(!approvalOpen)}
            active={approvalActive}
            icon={GitBranch}
            label="Persetujuan"
            badge={pendingCount > 0 ? pendingCount : undefined}
            onClickNav={(e) => handleNavigate(e, "/approval/pending")}
          >
            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleNavigate(e, "/approval/pending")}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg ${
                location.pathname === "/approval/pending"
                  ? "text-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:text-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={13} /> Pending
              </div>
              {pendingCount > 0 && (
                <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleNavigate(e, "/approval/approved")}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg ${
                location.pathname === "/approval/approved"
                  ? "text-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:text-primary"
              }`}
            >
              <CheckCircle size={13} /> Disetujui
            </button>
          </DropdownGroup>
        )}

        {/* ── 3. ARSIP — dropdown tetap ── */}
        <DropdownGroup
          open={arsipOpen}
          onToggle={() => setArsipOpen(!arsipOpen)}
          active={arsipActive}
          icon={Archive}
          label="Arsip"
          onClickNav={(e) => handleNavigate(e, "/archive")}
        >
          {visibleFolders.map((item) => {
            if (!item.module) {
              return (
                <button
                  key="all"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleNavigate(e, "/archive")}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg ${
                    !currentFolder && arsipActive
                      ? "text-primary font-semibold bg-primary/[0.06]"
                      : "text-sidebar-foreground/70 hover:text-primary"
                  }`}
                >
                  <FolderOpen size={14} />
                  {item.label}
                </button>
              );
            }

            return (
              <div key={item.module} className="mt-2">
                <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  {item.module}
                </div>
                {item.children.map((child) => (
                  <button
                    key={child.folder}
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => handleNavigate(e, `/archive?folder=${child.folder}`)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md ${
                      currentFolder === child.folder
                        ? "bg-primary/[0.08] text-primary font-semibold"
                        : "text-sidebar-foreground/60 hover:text-primary"
                    }`}
                  >
                    <span className="truncate pr-2">{child.label}</span>
                    {folderCounts[child.folder] > 0 && (
                      <span className="text-[9px] bg-muted px-1 rounded-full">
                        {folderCounts[child.folder]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </DropdownGroup>

        {/* ── 4. Simple items (Upload, Pengguna, Role, Log) ── */}
        {simpleItems.map((item) => (
          <NavButton
            key={item.path}
            active={location.pathname === item.path}
            icon={item.icon}
            label={item.label}
            onClick={(e) => handleNavigate(e, item.path)}
          />
        ))}

        <div className="!my-4 mx-2 h-px bg-sidebar-border" />

        {/* ── 5. Sampah & Pengaturan ── */}
        <NavButton
          active={location.pathname === "/trash"}
          icon={Trash2}
          label="Sampah"
          onClick={(e) => handleNavigate(e, "/trash")}
        />
        <NavButton
          active={location.pathname === "/settings"}
          icon={Settings}
          label="Pengaturan"
          onClick={(e) => handleNavigate(e, "/settings")}
        />
      </nav>
      </aside>
    </>
  );
}