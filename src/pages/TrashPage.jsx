import { useApp } from "@/contexts/AppContext";
import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import {
  Trash2,
  RefreshCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function TrashPage() {
  const {
    trashedDocuments = [],
    restoreDocument,
    permanentlyDeleteDocument,
    loadTrashedDocuments,
  } = useApp();

  // Menyimpan status proses per dokumen
  const [processing, setProcessing] = useState({
    id: null,
    action: null,
  });

  // Feedback lokal yang muncul dekat tombol yang diklik.
  // Posisi disimpan sebelum request karena row akan hilang setelah aksi berhasil.
  const [actionFeedback, setActionFeedback] = useState(null);

  const feedbackTimerRef = useRef(null);

  // Phase 4: load dokumen trash dari backend saat halaman dibuka
  useEffect(() => {
    loadTrashedDocuments();
  }, [loadTrashedDocuments]);

  // Bersihkan timer ketika component unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  /**
   * Menampilkan feedback kecil di dekat tombol yang baru diklik.
   *
   * buttonElement:
   * Elemen tombol asli yang digunakan untuk mengambil posisi di layar.
   *
   * Feedback menggunakan position: fixed sehingga tetap terlihat
   * walaupun row dokumen langsung hilang setelah restore/delete berhasil.
   */
  const showActionFeedback = ({
    buttonElement,
    type,
    title,
    message,
  }) => {
    if (!buttonElement) return;

    const rect = buttonElement.getBoundingClientRect();

    // Lebar popup
    const popupWidth = 310;

    // Usahakan popup berada di bawah tombol.
    let top = rect.bottom + 10;

    // Posisi sejajar dengan sisi kanan tombol.
    let left = rect.right - popupWidth;

    // Jangan sampai keluar sisi kiri layar.
    if (left < 16) {
      left = 16;
    }

    // Jangan sampai keluar sisi kanan layar.
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }

    // Kalau ruang bawah terlalu sempit,
    // tampilkan popup di atas tombol.
    const estimatedHeight = 90;

    if (top + estimatedHeight > window.innerHeight - 16) {
      top = rect.top - estimatedHeight - 10;
    }

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    setActionFeedback({
      type,
      title,
      message,
      top,
      left,
    });

    feedbackTimerRef.current = setTimeout(() => {
      setActionFeedback(null);
    }, 3500);
  };

  /**
   * Restore dokumen.
   *
   * Feedback "berhasil" hanya muncul jika promise backend selesai
   * tanpa error.
   */
  const handleRestore = async (doc, event) => {
    if (!restoreDocument) return;

    const buttonElement = event.currentTarget;

    // Simpan posisi SEBELUM request.
    const rect = buttonElement.getBoundingClientRect();

    const buttonPosition = {
      getBoundingClientRect: () => rect,
    };

    try {
      setProcessing({
        id: doc.id,
        action: "restore",
      });

      setActionFeedback(null);

      await restoreDocument(doc.id);

      showActionFeedback({
        buttonElement: buttonPosition,
        type: "success",
        title: "Dokumen dipulihkan",
        message: `"${doc.judul}" sudah dikembalikan ke Arsip.`,
      });
    } catch (error) {
      console.error("Gagal memulihkan dokumen:", error);

      showActionFeedback({
        buttonElement: buttonPosition,
        type: "error",
        title: "Gagal memulihkan dokumen",
        message:
          error?.response?.data?.error ||
          error?.message ||
          "Terjadi kesalahan saat memulihkan dokumen.",
      });
    } finally {
      setProcessing({
        id: null,
        action: null,
      });
    }
  };

  /**
   * Hapus dokumen secara permanen.
   *
   * Feedback baru muncul setelah request backend benar-benar berhasil.
   */
  const handlePermanentDelete = async (doc, event) => {
    if (!permanentlyDeleteDocument) return;

    const buttonElement = event.currentTarget;

    // Simpan posisi tombol SEBELUM dokumen hilang dari daftar.
    const rect = buttonElement.getBoundingClientRect();

    const buttonPosition = {
      getBoundingClientRect: () => rect,
    };

    try {
      setProcessing({
        id: doc.id,
        action: "delete",
      });

      setActionFeedback(null);

      await permanentlyDeleteDocument(doc.id);

      showActionFeedback({
        buttonElement: buttonPosition,
        type: "success",
        title: "Dokumen dihapus permanen",
        message: `"${doc.judul}" telah dihapus dari sistem.`,
      });
    } catch (error) {
      console.error("Gagal menghapus dokumen permanen:", error);

      showActionFeedback({
        buttonElement: buttonPosition,
        type: "error",
        title: "Dokumen gagal dihapus",
        message:
          error?.response?.data?.error ||
          error?.message ||
          "Terjadi kesalahan saat menghapus dokumen.",
      });
    } finally {
      setProcessing({
        id: null,
        action: null,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Kotak Sampah"
        subtitle="Dokumen yang dihapus akan disimpan selama 30 hari sebelum dihapus permanen"
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {/* Warning */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-sakura-warning/10 border border-sakura-warning/20 text-sakura-warning">
          <AlertTriangle
            size={20}
            className="shrink-0"
          />

          <p className="text-sm font-medium">
            Dokumen di kotak sampah akan dihapus
            secara otomatis dan permanen setelah
            30 hari. Pastikan untuk memulihkan
            dokumen penting sebelum batas waktu
            habis.
          </p>
        </div>

        {/* Container */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Trash2
                size={18}
                className="text-muted-foreground"
              />

              Daftar Dokumen Dihapus (
              {trashedDocuments.length})
            </h3>
          </div>

          {/* Content */}
          <div className="divide-y divide-border">
            {trashedDocuments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Trash2
                  size={48}
                  className="mb-4 opacity-20"
                />

                <p>Kotak sampah kosong.</p>

                <p className="text-xs mt-1">
                  Tidak ada dokumen yang dihapus
                  saat ini.
                </p>
              </div>
            ) : (
              trashedDocuments.map((doc) => {
                const deletedDate =
                  doc.deletedAt || doc.deleted_at
                    ? new Date(
                        doc.deletedAt ||
                          doc.deleted_at
                      )
                    : new Date();

                const isRestoring =
                  processing.id === doc.id &&
                  processing.action === "restore";

                const isDeleting =
                  processing.id === doc.id &&
                  processing.action === "delete";

                const isProcessing =
                  processing.id === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/10"
                  >
                    {/* Left */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText
                          size={20}
                          className="text-destructive"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {doc.judul}
                        </h4>

                        <div className="text-xs text-muted-foreground mt-0.5">
                          {doc.nomorDokumen} ·
                          Kategori: {doc.kategori}
                        </div>

                        <div className="text-xs font-medium text-destructive mt-1.5">
                          Dihapus pada:{" "}
                          {format(
                            deletedDate,
                            "dd MMM yyyy"
                          )}{" "}
                          (Sisa 30 hari)
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        className="hover:bg-sakura-success/10 hover:text-sakura-success hover:border-sakura-success/30"
                        onClick={(event) =>
                          handleRestore(doc, event)
                        }
                      >
                        {isRestoring ? (
                          <Loader2
                            size={14}
                            className="mr-2 animate-spin"
                          />
                        ) : (
                          <RefreshCcw
                            size={14}
                            className="mr-2"
                          />
                        )}

                        {isRestoring
                          ? "Memulihkan..."
                          : "Restore"}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isProcessing}
                        onClick={(event) =>
                          handlePermanentDelete(
                            doc,
                            event
                          )
                        }
                      >
                        {isDeleting ? (
                          <Loader2
                            size={14}
                            className="mr-2 animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={14}
                            className="mr-2"
                          />
                        )}

                        {isDeleting
                          ? "Menghapus..."
                          : "Hapus Permanen"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div
          className="
            fixed z-[9999]
            w-[310px] max-w-[calc(100vw-32px)]
            bg-background
            border border-border
            rounded-xl
            shadow-lg
            px-4 py-3
            animate-in fade-in-0 zoom-in-95 duration-150
          "
          style={{
            top: actionFeedback.top,
            left: actionFeedback.left,
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`
                mt-0.5
                w-8 h-8
                rounded-full
                flex items-center justify-center
                shrink-0

                ${
                  actionFeedback.type === "success"
                    ? "bg-sakura-success/10 text-sakura-success"
                    : "bg-destructive/10 text-destructive"
                }
              `}
            >
              {actionFeedback.type === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <XCircle size={17} />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-5">
                {actionFeedback.title}
              </p>

              <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                {actionFeedback.message}
              </p>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() =>
                setActionFeedback(null)
              }
              className="
                shrink-0
                text-muted-foreground
                hover:text-foreground
                transition-colors
                rounded-md
                p-0.5
              "
              aria-label="Tutup notifikasi"
            >
              <XCircle size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}