import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  RotateCcw,
  Folder,
  FolderOpen,
  Star,
  FileText as FileIcon,
  ChevronRight,
  ChevronDown,
  X,
  Upload,
  Pencil,
  Trash2,
  MoreVertical,
  FolderPlus,
  FilePlus,
  ArrowRightLeft,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Home,
  PanelLeftClose,
  Maximize2,
  Minimize2,
  Menu,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import AppHeader from "@/components/layout/AppHeader";
import DocumentDetailModal from "@/components/document/DocumentDetail"; // ← FIX: ganti dari modals/

import UploadForm from "@/components/document/UploadForm"; // ← FIX: ganti dari upload/
import { useApp } from "@/contexts/AppContext";
import { useSettings } from "@/contexts/SettingsContext";
import UserAvatar from "@/components/shared/UserAvatar";
import {
  buildFolderTree,
  docMatchesFolder,
  docMatchesFolderStrict,
  KATEGORI_OPTIONS,
  SIDEBAR_FOLDERS,
  CATEGORIES,
  DOCUMENT_TYPES,
  TAHUN_AJARAN_OPTIONS,
  getModuleByPath,
  getModuleByDoc,
  canManageModule,
} from "@/data/mockData";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STATUS_SECTIONS = [
  {
    key: "Menunggu",
    label: "Belum Disetujui",
    color: "text-sakura-warning",
    bgColor: "bg-sakura-warning/10 border-sakura-warning/20",
    badgeColor: "bg-sakura-warning/20 text-sakura-warning",
    opacity: true,
  },
  {
    key: "Disetujui",
    label: "Disetujui",
    color: "text-sakura-success",
    bgColor: "bg-sakura-success/10 border-sakura-success/20",
    badgeColor: "bg-sakura-success/20 text-sakura-success",
    opacity: false,
  },
  {
    key: "Diarsipkan",
    label: "Diarsipkan",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 border-border",
    badgeColor: "bg-muted text-muted-foreground",
    opacity: false,
  },
  {
    key: "Ditolak",
    label: "Ditolak",
    color: "text-destructive",
    bgColor: "bg-destructive/5 border-destructive/20",
    badgeColor: "bg-destructive/20 text-destructive",
    opacity: false,
  },
];

export default function ArchivePage() {
  const {
    documents,
    documentsLoading,
    loadDocuments,
    toggleFavorite,
    currentUser,
    customFolders,
    createFolder,
    editFolder,
    deleteFolder,
    editDocument,
    moveDocument,
    deleteDocument,
    trashedDocuments,
    loadTrashedDocuments,
    restoreDocument,
    permanentlyDeleteDocument,
  } = useApp();

  const { settings } = useSettings();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [categoryFilter, setCategoryFilter] = useState("Semua");

  useEffect(() => {
    const kat = searchParams.get("kategori");
    if (kat && KATEGORI_OPTIONS.includes(kat)) {
      setCategoryFilter(kat);
      setSearchParams({}, { replace: true });
    }

    const folder = searchParams.get("folder");
    if (folder) {
      for (const item of SIDEBAR_FOLDERS) {
        if (item.children) {
          const match = item.children.find((c) => c.folder === folder);
          if (match) {
            setSelectedFolder(match.path);
            break;
          }
        }
      }
    }
  }, [searchParams, setSearchParams]);

  const [detailDoc, setDetailDoc] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewMode, setPreviewMode] = useState("inline");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // State untuk modal folder di HP
  const [showMobileFolderDialog, setShowMobileFolderDialog] = useState(false);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [createFolderParent, setCreateFolderParent] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editTypeId, setEditTypeId] = useState(null);
  const [editYear, setEditYear] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [showCreateFolderConfirm, setShowCreateFolderConfirm] = useState(false);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveDestination, setMoveDestination] = useState("");

  const [contextMenu, setContextMenu] = useState(null);
  const [folderGridSize, setFolderGridSize] = useState("medium");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isAdmin = currentUser?.role === "Operator/TU";

  // Role-Based Folder Access: upload/edit/delete dokumen ditentukan per-modul
  // (lihat MODULE_DEFINITIONS di data/mockData.js), bukan lagi "isAdmin" saja.
  // Manajemen struktur folder (buat/ubah nama/hapus folder) tetap khusus
  // Operator/TU — tidak berubah dari sebelumnya.
  const canManageDoc = (doc) => canManageModule(currentUser?.role, getModuleByDoc(doc));
  const canUploadInSelectedFolder = canManageModule(currentUser?.role, getModuleByPath(selectedFolder));

  const accessibleDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (currentUser?.role === "Operator/TU") return true;

      const isSensitive = doc.category_id === 2 || doc.type_id === 12;

      if (!isSensitive) return true;

      if (currentUser?.role === "Guru" && currentUser?.nip) {
        return (
          doc.nip === currentUser.nip ||
          doc.pengunggah?.id === currentUser.id
        );
      }

      if (currentUser?.role === "Kepala Sekolah") return true;

      return false;
    });
  }, [documents, currentUser]);

  const folderTree = useMemo(() => buildFolderTree(documents), [documents]);

  const toggleExpand = (path) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const currentSubfolders = useMemo(() => {
    if (!selectedFolder) return folderTree;

    const findNode = (nodes, targetPath) => {
      for (const node of nodes) {
        if (node.path === targetPath) return node;
        if (node.children) {
          const found = findNode(node.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(folderTree, selectedFolder);
    return node?.children || [];
  }, [selectedFolder, folderTree]);

  const filtered = useMemo(() => {
    let docs = accessibleDocuments;

    if (showFavorites) {
      docs = docs.filter((d) => d.favorite);
    }

    if (selectedFolder) {
      const folderHasChildren = currentSubfolders.length > 0;
      docs = docs.filter((d) =>
        docMatchesFolderStrict(d, selectedFolder, folderHasChildren)
      );
    }

    if (statusFilter !== "Semua") {
      docs = docs.filter((d) => d.status === statusFilter);
    }

    if (categoryFilter !== "Semua") {
      docs = docs.filter((d) => d.kategori === categoryFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.judul.toLowerCase().includes(q) ||
          d.nomorDokumen.toLowerCase().includes(q) ||
          d.pengunggah?.nama?.toLowerCase().includes(q)
      );
    }

    return docs;
  }, [
    accessibleDocuments,
    search,
    statusFilter,
    categoryFilter,
    selectedFolder,
    showFavorites,
    currentSubfolders,
  ]);

  const groupedDocs = useMemo(() => {
    const groups = {};
    STATUS_SECTIONS.forEach((s) => {
      groups[s.key] = [];
    });
    filtered.forEach((doc) => {
      if (groups[doc.status]) groups[doc.status].push(doc);
    });
    return groups;
  }, [filtered]);

  const breadcrumbParts = useMemo(() => {
    if (!selectedFolder) return null;

    const findPath = (nodes, targetPath, trail = []) => {
      for (const node of nodes) {
        if (node.path === targetPath) {
          return [...trail, { label: node.name, path: node.path }];
        }

        if (targetPath.startsWith(node.path + "/")) {
          const result = findPath(node.children, targetPath, [
            ...trail,
            { label: node.name, path: node.path },
          ]);
          if (result) return result;
        }
      }
      return null;
    };

    const fromTree = findPath(folderTree, selectedFolder);
    if (fromTree) return fromTree;

    // Fallback untuk folder yang tidak ada di folderTree (mis. modul milik
    // Guru di category_id 5) — ambil label asli dari SIDEBAR_FOLDERS supaya
    // breadcrumb tidak pernah menampilkan path mentah seperti "cat:5/type:19".
    for (const item of SIDEBAR_FOLDERS) {
      if (!item.children) continue;
      const match = item.children.find((c) => c.path === selectedFolder);
      if (match) {
        return [
          { label: item.module, path: null },
          { label: match.label, path: match.path },
        ];
      }
    }

    return [{ label: "Folder", path: selectedFolder }];
  }, [selectedFolder, folderTree]);

  const countDocsInFolder = (folderPath) => {
    return documents.filter((d) => docMatchesFolder(d, folderPath)).length;
  };

  const flattenTree = (nodes, depth = 0) => {
    const result = [];
    nodes.forEach((node) => {
      result.push({ path: node.path, name: node.name, depth });
      if (node.children) result.push(...flattenTree(node.children, depth + 1));
    });
    return result;
  };

  const allFolders = useMemo(() => flattenTree(folderTree), [folderTree]);

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewMode("inline");
  };

  const openInlinePreview = (doc) => {
    setPreviewDoc(doc);
    setPreviewMode("inline");
  };

  const openSidebarPreview = (doc) => {
    setPreviewDoc(doc);
    setPreviewMode("sidebar");
  };

  const openPopupPreview = (doc) => {
    setPreviewDoc(doc);
    setPreviewMode("popup");
  };

  const openExpandPreview = (doc) => {
    setPreviewDoc(doc);
    setPreviewMode(window.innerWidth >= 1024 ? "sidebar" : "popup");
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(
      newFolderName.trim(),
      createFolderParent,
      newFolderDesc.trim()
    );
    toast({
      title: "✅ Berhasil",
      description: `Folder '${newFolderName.trim()}' berhasil dibuat`,
      className: "bg-green-600 text-white border-none shadow-2xl font-semibold",
    });
    setNewFolderName("");
    setNewFolderDesc("");
    setShowCreateFolderModal(false);
    setCreateFolderParent(null);
  };

  const confirmCreateFolder = () => {
    handleCreateFolder();
    setShowCreateFolderConfirm(false);
  };

  const handleEdit = async () => {
    if (!editName.trim()) return;

    if (editTarget.type === "folder") {
      editFolder(editTarget.data.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      toast({
        title: "✅ Berhasil",
        description: `Folder '${editName.trim()}' berhasil diperbarui`,
        className: "bg-green-600 text-white border-none shadow-2xl font-semibold",
      });
    } else {
      const category =
        CATEGORIES.find((c) => c.category_id === editCategoryId)?.category_name ||
        editTarget.data.kategori;
      const typeName =
        DOCUMENT_TYPES.find((t) => t.type_id === editTypeId)?.type_name ||
        editTarget.data.jenisDokumen;

      try {
        await editDocument(editTarget.data.id, {
          judul: editName.trim(),
          category_id: editCategoryId || editTarget.data.category_id,
          type_id: editTypeId || editTarget.data.type_id,
          kategori: category,
          jenisDokumen: typeName,
          tahunAjaran: editYear || editTarget.data.tahunAjaran,
        });

        toast({
          title: "✅ Berhasil",
          description: `Dokumen '${editName.trim()}' berhasil diperbarui`,
          className: "bg-green-600 text-white border-none shadow-2xl font-semibold",
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "❌ Gagal",
          description: err?.message || "Gagal memperbarui dokumen",
        });
      }
    }

    setShowEditModal(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (deleteTarget.type === "folder") {
      deleteFolder(deleteTarget.id);
      toast({
        variant: "destructive",
        title: "🗑️ Berhasil Dihapus",
        description: `Folder '${deleteTarget.name}' berhasil dipindahkan ke Sampah`,
        className:
          "shadow-2xl border-2 border-red-800 font-bold bg-destructive text-destructive-foreground",
      });
    } else {
      try {
        await deleteDocument(deleteTarget.id);
        if (previewDoc?.id === deleteTarget.id) closePreview();
        toast({
          variant: "destructive",
          title: "🗑️ Berhasil Dihapus",
          description: `Dokumen '${deleteTarget.name}' berhasil dipindahkan ke Sampah`,
          className:
            "shadow-2xl border-2 border-red-800 font-bold bg-destructive text-destructive-foreground",
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "❌ Gagal",
          description: err?.message || "Gagal menghapus dokumen",
        });
      }
    }

    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setDeleteConfirmInput("");
  };

  const handleMove = async () => {
    if (!moveDestination || !moveTarget) return;
    try {
      await moveDocument(moveTarget.id, moveDestination);
      toast({
        title: "✅ Berhasil",
        description: `Dokumen '${moveTarget.judul}' berhasil dipindahkan`,
        className: "bg-green-600 text-white border-none shadow-2xl font-semibold",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "❌ Gagal",
        description: err?.message || "Gagal memindahkan dokumen",
      });
    }
    setShowMoveModal(false);
    setMoveTarget(null);
    setMoveDestination("");
  };

  const confirmMove = () => {
    handleMove();
    setShowMoveConfirm(false);
  };

  const openEditDoc = (doc) => {
    setEditTarget({ type: "file", data: doc });
    setEditName(doc.judul);
    setEditDesc("");
    setEditCategoryId(doc.category_id || null);
    setEditTypeId(doc.type_id || null);
    setEditYear(doc.tahunAjaran || "");
    setShowEditModal(true);
  };

  const openDeleteDoc = (doc) => {
    setDeleteTarget({ type: "file", id: doc.id, name: doc.judul });
    setShowDeleteConfirm(true);
  };

  const openMoveDoc = (doc) => {
    setMoveTarget(doc);
    setMoveDestination("");
    setShowMoveModal(true);
  };

  const handlePageClick = () => setContextMenu(null);

  const findFolderNode = (nodes, targetPath) => {
    for (const node of nodes) {
      if (node.path === targetPath) return node;
      if (node.children) {
        const found = findFolderNode(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedFolderNode = useMemo(() => {
    if (!selectedFolder) return null;
    return findFolderNode(folderTree, selectedFolder);
  }, [selectedFolder, folderTree]);

  // Phase 4: load trash saat Recycle Bin dibuka
  const handleOpenRecycleBin = () => {
    loadTrashedDocuments();
    setShowRecycleBin(true);
  };

  const PreviewDetail = ({ doc, variant = "inline" }) => {
    if (!doc) return null;

    const isInline = variant === "inline";
    const isSidebar = variant === "sidebar";

    return (
      <div
        className={
          isInline
            ? "border-t border-border bg-muted/20"
            : "h-full overflow-y-auto bg-card"
        }
      >
        <div className={isInline ? "px-5 py-4 space-y-4" : "p-4 lg:p-5 space-y-5"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold text-foreground truncate ${
                  isInline ? "text-base" : "text-lg"
                }`}
              >
                {doc.judul}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {doc.nomorDokumen}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isSidebar && (
                <button
                  onClick={() => setPreviewMode("inline")}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted"
                  title="Kecilkan"
                >
                  <Minimize2 size={15} />
                </button>
              )}

              <button
                onClick={closePreview}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <span
            className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
              doc.status === "Disetujui"
                ? "bg-sakura-success/20 text-sakura-success"
                : doc.status === "Menunggu"
                ? "bg-sakura-warning/20 text-sakura-warning"
                : doc.status === "Ditolak"
                ? "bg-destructive/20 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {doc.status}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Kategori</div>
              <div className="font-medium text-foreground">{doc.kategori}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-xs">Jenis Dokumen</div>
              <div className="font-medium text-foreground">{doc.jenisDokumen}</div>
            </div>

            {doc.kelas && doc.kelas !== "-" && (
              <div>
                <div className="text-muted-foreground text-xs">Kelas</div>
                <div className="font-medium text-foreground">{doc.kelas}</div>
              </div>
            )}

            {doc.namaSiswa && (
              <div>
                <div className="text-muted-foreground text-xs">Nama Siswa</div>
                <div className="font-medium text-foreground">{doc.namaSiswa}</div>
              </div>
            )}

            {doc.tahunAjaran && (
              <div>
                <div className="text-muted-foreground text-xs">Tahun Ajaran</div>
                <div className="font-medium text-foreground">{doc.tahunAjaran}</div>
              </div>
            )}

            <div>
              <div className="text-muted-foreground text-xs">Pengunggah</div>
              <div className="font-medium text-foreground">
                {doc.pengunggah?.nama}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground text-xs">Tanggal Unggah</div>
              <div className="font-medium text-foreground">
                {doc.tanggalUpload
                  ? format(new Date(doc.tanggalUpload), "dd/MM/yyyy")
                  : "-"}
              </div>
            </div>
          </div>

          {doc.catatan && (
            <div className="px-3 py-2 rounded-lg bg-sakura-warning/10 border border-sakura-warning/30 text-sm text-sakura-warning font-medium">
              ⚠ {doc.catatan}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setDetailDoc(doc)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-none"
            >
              <FileIcon size={16} /> Lihat Detail Lengkap
            </button>
          </div>

          {(isAdmin || canManageDoc(doc)) && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 w-full sm:w-auto"
                onClick={() => openEditDoc(doc)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 w-full sm:w-auto"
                onClick={() => openMoveDoc(doc)}
              >
                <ArrowRightLeft size={14} className="mr-1.5" /> Pindah
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 w-full sm:w-auto"
                onClick={() => openDeleteDoc(doc)}
              >
                <Trash2 size={14} className="mr-1.5" /> Hapus
              </Button>
            </div>
          )}

          {doc.auditTrail && doc.auditTrail.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileIcon size={14} className="text-primary" />
                <span className="font-semibold text-sm text-foreground">
                  Jejak Aktivitas
                </span>
              </div>
              <div className="space-y-3">
                {doc.auditTrail.slice(0, 4).map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <UserAvatar
                      userId={entry.user?.id}
                      avatar={entry.user?.avatar}
                      nama={entry.user?.nama || entry.user?.name || "Sistem"}
                      size={28}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground">
                        {entry.user?.nama || entry.user?.name || "Sistem"}
                      </div>
                      <div className="text-xs text-foreground">
                        {entry.action}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.time
                          ? format(new Date(entry.time), "dd/MM/yyyy HH:mm")
                          : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFolder = (folder, depth = 0, isMobileView = false) => {
    const isExpanded = expandedFolders.has(folder.path);
    const hasChildren = folder.children.length > 0;
    const isSelected = selectedFolder === folder.path;
    const docCount = countDocsInFolder(folder.path);

    return (
      <div key={folder.path} className="w-full">
        <div
          className="flex items-center gap-1 w-full"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            onClick={() => {
              if (hasChildren) toggleExpand(folder.path);
              setSelectedFolder(folder.path);
              setShowFavorites(false);
              setPreviewDoc(null);
              setPreviewMode("inline");
              if (isMobileView) setShowMobileFolderDialog(false);
            }}
            className={`flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-xl text-sm border transition-none ${
              isSelected
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                : "border-transparent hover:bg-muted hover:border-border"
            }`}
          >
            <div
              className={`shrink-0 ${
                isSelected ? "text-primary" : "text-sakura-warning"
              }`}
            >
              {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
            </div>

            <span className="flex-1 min-w-0 truncate text-left font-medium">
              {folder.name}
            </span>

            {docCount > 0 && (
              <span className="shrink-0 text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {docCount}
              </span>
            )}

            {hasChildren && (
              <ChevronDown
                size={13}
                className={`shrink-0 transition-none ${
                  isExpanded
                    ? "rotate-0 text-primary"
                    : "-rotate-90 text-muted-foreground"
                }`}
              />
            )}
          </button>

          {isAdmin && !isMobileView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  type: "folder",
                  data: folder,
                  parentPath: folder.path,
                });
              }}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-none"
            >
              <MoreVertical size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-1">
            {folder.children.map((child) => renderFolder(child, depth + 1, isMobileView))}
          </div>
        )}
      </div>
    );
  };

  const gridColsClass =
    folderGridSize === "small"
      ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-6"
      : folderGridSize === "large"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  const renderDocCard = (doc, dimmed) => (
    <div
      key={doc.id}
      className={`group rounded-2xl border bg-card overflow-hidden transition-none cursor-pointer ${
        previewDoc?.id === doc.id
          ? "border-primary shadow-md"
          : "border-border hover:shadow"
      } ${dimmed ? "opacity-50" : ""}`}
    >
      <div
        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4"
        onClick={() => openInlinePreview(doc)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(doc.id);
          }}
          className="shrink-0"
        >
          <Star
            size={18}
            className={
              doc.favorite
                ? "fill-sakura-warning text-sakura-warning"
                : "text-muted-foreground hover:text-sakura-warning"
            }
          />
        </button>

        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <FileIcon size={20} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">
            {doc.judul}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {doc.nomorDokumen} · {doc.kategori}
          </div>
        </div>

        <span
          className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
            doc.status === "Disetujui"
              ? "bg-sakura-success/20 text-sakura-success"
              : doc.status === "Menunggu"
              ? "bg-sakura-warning/20 text-sakura-warning"
              : doc.status === "Ditolak"
              ? "bg-destructive/20 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {doc.status}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openExpandPreview(doc);
          }}
          className="hidden lg:flex w-11 h-11 rounded-full border border-border items-center justify-center hover:bg-muted transition-none shrink-0"
          title="Buka di samping"
        >
          <Maximize2 size={18} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openPopupPreview(doc);
          }}
          className="flex lg:hidden w-9 h-9 rounded-xl border border-border items-center justify-center hover:bg-muted transition-none shrink-0"
          title="Buka detail"
        >
          <Maximize2 size={16} />
        </button>

        {(isAdmin || canManageDoc(doc)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: "file",
                data: doc,
              });
            }}
            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-none shrink-0"
          >
            <MoreVertical size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {previewDoc?.id === doc.id && previewMode === "inline" && (
        <PreviewDetail doc={doc} variant="inline" />
      )}
    </div>
  );

  return (
    <div onClick={handlePageClick} className="flex flex-col h-screen">
      <div className="shrink-0 z-20 sticky top-0 bg-background">
        <AppHeader
          title="Arsip Dokumen"
          subtitle="SMP Negeri 4 Cikarang Barat"
        />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {sidebarCollapsed && !isMobile && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="
              absolute
              left-0
              top-6
              z-[60]
              -translate-x-1/2
              w-9 h-9
              rounded-full
              border border-border
              bg-background
              shadow-md
              flex items-center justify-center
              hover:bg-muted
              transition-none
            "
          >
            <PanelLeftClose size={15} className="rotate-180 text-muted-foreground" />
          </button>
        )}

        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden border-t border-border">
          {/* FOLDER TREE DESKTOP */}
          {!sidebarCollapsed && !isMobile && (
            <>
              <ResizablePanel
                defaultSize={22}
                minSize={15}
                maxSize={40}
                className="bg-card flex flex-col h-full sticky top-0"
              >
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="shrink-0 flex items-center justify-between p-3 border-b border-border bg-card">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder
                        size={16}
                        className="text-sakura-warning shrink-0"
                      />
                      <h3 className="font-bold text-foreground text-sm truncate">
                        Struktur Folder
                      </h3>
                    </div>

                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="
                        shrink-0
                        w-8 h-8
                        rounded-xl
                        border border-border
                        bg-background
                        shadow-sm
                        flex items-center justify-center
                        hover:bg-muted
                        transition-none
                      "
                    >
                      <PanelLeftClose
                        size={15}
                        className="text-muted-foreground"
                      />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5 min-h-0">
                    <button
                      onClick={() => {
                        setSelectedFolder(null);
                        setShowFavorites(false);
                        setPreviewDoc(null);
                        setPreviewMode("inline");
                        if (expandedFolders.size === 0 && folderTree.length > 0) {
                          setExpandedFolders(new Set(folderTree.map((f) => f.path)));
                        }
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-none ${
                        !selectedFolder && !showFavorites
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      📂 Semua Dokumen
                    </button>

                    <button
                      onClick={() => {
                        setShowFavorites(true);
                        setSelectedFolder(null);
                        setPreviewDoc(null);
                        setPreviewMode("inline");
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-none flex items-center gap-2 ${
                        showFavorites
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Star size={14} className="text-sakura-warning" /> Favorit
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setCreateFolderParent(null);
                          setNewFolderName("");
                          setNewFolderDesc("");
                          setShowCreateFolderModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mt-1 rounded-md border border-dashed border-primary/40 text-xs font-medium text-primary hover:bg-primary/5 transition-none"
                      >
                        <FolderPlus size={14} /> Buat Folder
                      </button>
                    )}

                    <div className="h-px bg-border my-2" />

                    {documentsLoading ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">Memuat folder...</span>
                      </div>
                    ) : (
                      folderTree.map((folder) => renderFolder(folder))
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle
                withHandle
                className="bg-border hover:bg-primary/20 transition-none"
              />
            </>
          )}

          {/* MAIN DOCUMENT LIST */}
          <ResizablePanel
            defaultSize={
              sidebarCollapsed || isMobile
                ? 100
                : previewDoc && previewMode === "sidebar"
                ? 48
                : 78
            }
            minSize={30}
            className="h-full min-h-0 overflow-hidden"
          >
            <div className="h-full overflow-y-auto p-4 lg:p-9 space-y-5">

              {/* TOMBOL NAVIGASI FOLDER KHUSUS MOBILE */}
              {isMobile && (
                <div className="flex lg:hidden mb-2">
                  <Button
                    variant="outline"
                    className="w-full flex justify-start text-muted-foreground font-normal border-border bg-card shadow-sm"
                    onClick={() => setShowMobileFolderDialog(true)}
                  >
                    <Menu size={16} className="mr-2 text-foreground" />
                    <span className="truncate flex-1 text-left text-foreground">
                      {showFavorites ? "Dokumen Favorit" : selectedFolder ? (breadcrumbParts?.[breadcrumbParts.length - 1]?.label || "Folder") : "Semua Dokumen Arsip"}
                    </span>
                    <ChevronDown size={14} />
                  </Button>
                </div>
              )}

              {breadcrumbParts && !isMobile && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border flex-wrap">
                  <Home size={14} className="shrink-0" />
                  <ChevronRight size={12} className="shrink-0" />
                  <button
                    onClick={() => {
                      setSelectedFolder(null);
                      setPreviewDoc(null);
                      setPreviewMode("inline");
                    }}
                    className="hover:text-primary transition-none"
                  >
                    Arsip Dokumen
                  </button>

                  {breadcrumbParts.map((part, i) => (
                    <span key={part.path} className="flex items-center gap-1.5">
                      <ChevronRight size={12} className="shrink-0" />
                      <button
                        onClick={() => {
                          setSelectedFolder(part.path);
                          setPreviewDoc(null);
                          setPreviewMode("inline");
                        }}
                        className={`hover:text-primary transition-none ${
                          i === breadcrumbParts.length - 1
                            ? "font-semibold text-foreground"
                            : ""
                        }`}
                      >
                        {part.label}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="hidden lg:flex lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {showFavorites ? (
                      <>
                        <Star
                          size={20}
                          className="text-sakura-warning fill-sakura-warning"
                        />
                        Dokumen Favorit
                      </>
                    ) : selectedFolder ? (
                      <>
                        <Folder size={20} className="text-sakura-warning" />
                        {breadcrumbParts
                          ? breadcrumbParts[breadcrumbParts.length - 1]?.label
                          : "Folder"}
                      </>
                    ) : (
                      "Semua Dokumen Arsip"
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {documentsLoading ? "Memuat..." : `${filtered.length} dokumen ditemukan`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setFolderGridSize("small")}
                      title="Kecil"
                      className={`p-1.5 rounded ${
                        folderGridSize === "small"
                          ? "bg-card shadow-sm text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Grid3X3 size={14} />
                    </button>
                    <button
                      onClick={() => setFolderGridSize("medium")}
                      title="Sedang"
                      className={`p-1.5 rounded ${
                        folderGridSize === "medium"
                          ? "bg-card shadow-sm text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Grid2X2 size={14} />
                    </button>
                    <button
                      onClick={() => setFolderGridSize("large")}
                      title="Besar"
                      className={`p-1.5 rounded ${
                        folderGridSize === "large"
                          ? "bg-card shadow-sm text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>

                  {isAdmin && selectedFolder && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreateFolderParent(selectedFolder);
                        setNewFolderName("");
                        setNewFolderDesc("");
                        setShowCreateFolderModal(true);
                      }}
                    >
                      <FolderPlus size={14} className="mr-1.5" /> Sub-folder
                    </Button>
                  )}
                  {selectedFolder && (isAdmin || canUploadInSelectedFolder) && (
                    <Button size="sm" onClick={() => setShowUploadModal(true)}>
                      <FilePlus size={14} className="mr-1.5" /> Upload File
                    </Button>
                  )}
                </div>
              </div>

              {currentSubfolders.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hidden lg:block">
                    Folder Terkait
                  </div>
                  <div className={`grid gap-2 ${gridColsClass}`}>
                    {currentSubfolders.map((subfolder) => (
                      <button
                        key={subfolder.path}
                        onClick={() => {
                          setSelectedFolder(subfolder.path);
                          if (
                            !expandedFolders.has(subfolder.path) &&
                            subfolder.children?.length > 0
                          ) {
                            toggleExpand(subfolder.path);
                          }
                          setPreviewDoc(null);
                          setPreviewMode("inline");
                        }}
                        className="flex flex-col items-center justify-center text-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/30 transition-none group"
                      >
                        <Folder
                          size={
                            folderGridSize === "small"
                              ? 24
                              : folderGridSize === "large"
                              ? 40
                              : 32
                          }
                          className="text-sakura-warning group-hover:text-primary transition-none"
                        />
                        <span
                          className={`font-medium text-foreground leading-tight line-clamp-2 ${
                            folderGridSize === "small" ? "text-[10px]" : "text-xs"
                          }`}
                        >
                          {subfolder.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                          {countDocsInFolder(subfolder.path)} dok
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILTER BAR RESPONSIVE */}
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 bg-card p-3 lg:p-4 rounded-xl border border-border">
                <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nomor, judul..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-lg border border-input bg-background text-sm truncate"
                  >
                    <option value="Semua">Semua Status</option>
                    <option>Menunggu</option>
                    <option>Disetujui</option>
                    <option>Ditolak</option>
                    <option>Diarsipkan</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 rounded-lg border border-input bg-background text-sm truncate"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("Semua");
                      setCategoryFilter("Semua");
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-none"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-none truncate"
                  >
                    <Upload size={14} /> Upload
                  </button>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleOpenRecycleBin}
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted transition-none mt-1 sm:mt-0"
                  >
                    <Trash2 size={14} /> Recycle Bin
                  </button>
                )}
              </div>

              {/* LOADING STATE */}
              {documentsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm font-medium">Memuat dokumen...</p>
                </div>
              ) : (
                <>
                  {filtered.length > 0 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Dokumen
                      </div>
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {filtered.length} ditemukan
                      </span>
                    </div>
                  )}

                  {statusFilter !== "Semua" ? (
                    <div className="space-y-2">
                      {filtered.map((doc) => renderDocCard(doc, false))}
                      {filtered.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Tidak ada dokumen ditemukan.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {STATUS_SECTIONS.map((section) => {
                        const docs = groupedDocs[section.key];
                        if (docs.length === 0) return null;
                        return (
                          <div key={section.key}>
                            <div
                              className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-lg border mb-3 ${section.bgColor}`}
                            >
                              <span className={`text-sm font-semibold ${section.color}`}>
                                {section.label}
                              </span>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${section.badgeColor}`}
                              >
                                {docs.length}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {docs.map((doc) =>
                                renderDocCard(doc, section.opacity)
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filtered.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Tidak ada dokumen ditemukan.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ResizablePanel>

          {previewDoc && previewMode === "sidebar" && !isMobile && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={32} minSize={24} maxSize={45}>
                <PreviewDetail doc={previewDoc} variant="sidebar" />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {contextMenu && (
        <div
          className="fixed z-[100] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "folder" && (
            <>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-none"
                onClick={() => {
                  setCreateFolderParent(contextMenu.data.path);
                  setNewFolderName("");
                  setNewFolderDesc("");
                  setShowCreateFolderModal(true);
                  setContextMenu(null);
                }}
              >
                <FolderPlus size={15} className="text-muted-foreground" /> Buat
                Sub-folder
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-none"
                onClick={() => {
                  setShowUploadModal(true);
                  setContextMenu(null);
                }}
              >
                <FilePlus size={15} className="text-muted-foreground" /> Upload
                File
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-none"
                onClick={() => {
                  setEditTarget({
                    type: "folder",
                    data: {
                      id: contextMenu.data.folder_id || contextMenu.data.id,
                      name: contextMenu.data.name,
                    },
                  });
                  setEditName(contextMenu.data.name);
                  setEditDesc("");
                  setShowEditModal(true);
                  setContextMenu(null);
                }}
              >
                <Pencil size={15} className="text-muted-foreground" /> Edit
                Folder
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-none"
                onClick={() => {
                  setMoveTarget({
                    id: contextMenu.data.folder_id || contextMenu.data.id,
                    judul: contextMenu.data.name,
                    isFolder: true,
                  });
                  setMoveDestination("");
                  setShowMoveModal(true);
                  setContextMenu(null);
                }}
              >
                <ArrowRightLeft size={15} className="text-muted-foreground" />{" "}
                Pindahkan Folder
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-none"
                onClick={() => {
                  setDeleteTarget({
                    type: "folder",
                    id: contextMenu.data.folder_id || contextMenu.data.id,
                    name: contextMenu.data.name,
                  });
                  setShowDeleteConfirm(true);
                  setContextMenu(null);
                }}
              >
                <Trash2 size={15} /> Hapus Folder
              </button>
            </>
          )}
          {contextMenu.type === "file" && (
            <>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-none"
                onClick={() => {
                  openEditDoc(contextMenu.data);
                  setContextMenu(null);
                }}
              >
                <Pencil size={15} className="text-muted-foreground" /> Edit
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-none"
                onClick={() => {
                  openMoveDoc(contextMenu.data);
                  setContextMenu(null);
                }}
              >
                <ArrowRightLeft size={15} className="text-muted-foreground" />{" "}
                Pindahkan ke Folder
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-none"
                onClick={() => {
                  openDeleteDoc(contextMenu.data);
                  setContextMenu(null);
                }}
              >
                <Trash2 size={15} /> Hapus
              </button>
            </>
          )}
        </div>
      )}

      {/* MODAL FOLDER UNTUK MOBILE */}
      <Dialog open={showMobileFolderDialog} onOpenChange={setShowMobileFolderDialog}>
        <DialogContent className="max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-2xl w-[90vw]">
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle>Pilih Folder Arsip</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <button
              onClick={() => {
                setSelectedFolder(null);
                setShowFavorites(false);
                setPreviewDoc(null);
                setPreviewMode("inline");
                setShowMobileFolderDialog(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-none ${
                !selectedFolder && !showFavorites
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              📂 Semua Dokumen
            </button>
            <button
              onClick={() => {
                setShowFavorites(true);
                setSelectedFolder(null);
                setPreviewDoc(null);
                setPreviewMode("inline");
                setShowMobileFolderDialog(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-none flex items-center gap-2 ${
                showFavorites
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Star size={14} className="text-sakura-warning" /> Favorit
            </button>

            <div className="h-px bg-border my-3" />
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Direktori</div>

            {folderTree.map((folder) => renderFolder(folder, 0, true))}
          </div>
          <div className="p-3 border-t border-border shrink-0">
            <Button variant="outline" className="w-full" onClick={() => setShowMobileFolderDialog(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateFolderModal}
        onOpenChange={setShowCreateFolderModal}
      >
        <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Buat Folder Baru</DialogTitle>
            <DialogDescription>
              {createFolderParent
                ? "Membuat sub-folder di dalam folder yang dipilih"
                : "Membuat folder baru di root arsip"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                Nama Folder <span className="text-destructive">*</span>
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Masukkan nama folder"
                autoFocus
              />
              {newFolderName !== undefined && newFolderName.trim() === "" && (
                <p className="text-sm text-destructive">
                  Nama folder wajib diisi
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-desc">
                Deskripsi Folder{" "}
                <span className="text-muted-foreground text-xs">(opsional)</span>
              </Label>
              <Textarea
                id="folder-desc"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="Masukkan deskripsi folder"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCreateFolderModal(false)}
            >
              Batal
            </Button>
            <Button
              onClick={() => setShowCreateFolderConfirm(true)}
              disabled={!newFolderName.trim()}
            >
              Simpan Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {editTarget?.type === "folder" ? "Folder" : "Dokumen"}
            </DialogTitle>
            <DialogDescription>
              Perbarui informasi{" "}
              {editTarget?.type === "folder" ? "folder" : "dokumen"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>

            {editTarget?.type === "folder" && (
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {editTarget?.type === "file" && (
              <div className="space-y-2">
                <Label>Kategori</Label>
                <select
                  value={editCategoryId ?? ""}
                  onChange={(e) =>
                    setEditCategoryId(Number(e.target.value) || null)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="">Pilih Kategori</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>

                <Label>Jenis Dokumen</Label>
                <select
                  value={editTypeId ?? ""}
                  onChange={(e) =>
                    setEditTypeId(Number(e.target.value) || null)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="">Pilih Jenis Dokumen</option>
                  {DOCUMENT_TYPES.filter(
                    (t) => t.category_id === editCategoryId
                  ).map((t) => (
                    <option key={t.type_id} value={t.type_id}>
                      {t.type_name}
                    </option>
                  ))}
                </select>

                {editCategoryId === 1 && (
                  <>
                    <Label>Tahun Ajaran</Label>
                    <select
                      value={editYear || ""}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    >
                      <option value="">Pilih Tahun</option>
                      {TAHUN_AJARAN_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={!editName.trim()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Pindahkan Dokumen</DialogTitle>
            <DialogDescription>
              Pilih folder tujuan untuk dokumen "{moveTarget?.judul}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
            {allFolders.map((f) => (
              <button
                key={f.path}
                onClick={() => setMoveDestination(f.path)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-none text-left ${
                  moveDestination === f.path
                    ? "bg-primary/10 border border-primary text-primary font-medium"
                    : "hover:bg-muted border border-transparent"
                }`}
                style={{ paddingLeft: `${12 + f.depth * 16}px` }}
              >
                <Folder
                  size={15}
                  className={
                    moveDestination === f.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMoveModal(false)}>
              Batal
            </Button>
            <Button
              onClick={() => setShowMoveConfirm(true)}
              disabled={!moveDestination}
            >
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showCreateFolderConfirm}
        onOpenChange={(v) => setShowCreateFolderConfirm(v)}
      >
        <AlertDialogContent className="w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Buat Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan Anda ingin membuat folder baru "{newFolderName.trim()}"
              {createFolderParent ? ` di dalam folder ${createFolderParent}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateFolder}>
              Buat Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showMoveConfirm}
        onOpenChange={(v) => setShowMoveConfirm(v)}
      >
        <AlertDialogContent className="w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pindahkan Dokumen</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumen "{moveTarget?.judul}" akan dipindahkan ke folder{" "}
              "{moveDestination}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>
              Pindahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(v) => {
          setShowDeleteConfirm(v);
          if (!v) setDeleteConfirmInput("");
        }}
      >
        <AlertDialogContent className="w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "folder"
                ? `Folder "${deleteTarget?.name}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`
                : `Dokumen "${deleteTarget?.name}" akan dipindahkan ke Kotak Sampah.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Ketik nama untuk konfirmasi:
            </p>
            <input
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={`Ketik ${deleteTarget?.name || "nama"} di sini`}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmInput !== deleteTarget?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {detailDoc && (
        <DocumentDetailModal
          document={detailDoc}
          onClose={() => setDetailDoc(null)}
        />
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-2xl border border-border p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Upload Dokumen
                </h2>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Form upload identik dengan halaman Upload Dokumen
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-lg hover:bg-muted bg-muted/50"
              >
                <X size={20} />
              </button>
            </div>
            <UploadForm
              onSuccess={() => {
                setShowUploadModal(false);
                loadDocuments();
              }}
              onCancel={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}

      {showRecycleBin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4"
          onClick={() => setShowRecycleBin(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Recycle Bin</h3>
              <button
                onClick={() => setShowRecycleBin(false)}
                className="p-1 rounded-lg hover:bg-muted bg-muted/50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {trashedDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada dokumen di recycle bin.
                </p>
              )}
              {trashedDocuments.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{d.judul}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.nomorDokumen} · {d.kategori}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await restoreDocument(d.id);
                        toast({
                          title: "✅ Berhasil Direstore",
                          description: `Dokumen '${d.judul}' berhasil dikembalikan.`,
                          className:
                            "bg-green-600 text-white border-none shadow-2xl font-semibold",
                        });
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-green-100 hover:text-green-700 transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={async () => {
                        await permanentlyDeleteDocument(d.id);
                        toast({
                          variant: "destructive",
                          title: "💥 Dihapus Permanen",
                          description: `Dokumen '${d.judul}' telah dihapus secara permanen.`,
                          className:
                            "shadow-2xl border-2 border-red-800 font-bold bg-destructive text-destructive-foreground",
                        });
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm hover:bg-red-700 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POPUP DETAIL DOCUMENT UNTUK HP */}
      {previewDoc && previewMode === "popup" && isMobile && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePreview}
          />
          <div className="relative z-10 bg-background rounded-t-3xl border-t border-border max-h-[90vh] overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="w-12 h-1.5 bg-muted mx-auto rounded-full mt-3 mb-1"></div>
            <PreviewDetail doc={previewDoc} variant="popup" />
          </div>
        </div>
      )}
    </div>
  );
}