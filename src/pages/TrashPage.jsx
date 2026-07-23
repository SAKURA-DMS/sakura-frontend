import { useApp } from "@/contexts/AppContext";
import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import { Trash2, RefreshCcw, AlertTriangle, FileText, CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function TrashPage() {
  const {
    trashedDocuments = [],
    restoreDocument,
    permanentlyDeleteDocument,
    loadTrashedDocuments,
  } = useApp();

  // Status proses restore / delete
  const [processing, setProcessing] = useState({
    id: null,
    action: null,
  });

  const [confirmation, setConfirmation] = useState(null);

  // Feedback setelah aksi berhasil / gagal
  const [actionFeedback, setActionFeedback] = useState(null);

  const feedbackTimerRef = useRef(null);
  const confirmationRef = useRef(null);

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

  useEffect(() => {
    if (!confirmation) return;

    const handleOutsideClick = (event) => {
      if (
        confirmationRef.current &&
        !confirmationRef.current.contains(event.target)
      ) {
        setConfirmation(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setConfirmation(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [confirmation]);

  const getPopupPosition = (
    buttonElement,
    popupWidth = 330,
    estimatedHeight = 170
  ) => {
    const rect = buttonElement.getBoundingClientRect();

    let top = rect.bottom + 10;
    let left = rect.right - popupWidth;

    if (left < 16) {
      left = 16;
    }

    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }

    if (top + estimatedHeight > window.innerHeight - 16) {
      top = rect.top - estimatedHeight - 10;
    }

    if (top < 16) {
      top = 16;
    }

    return {
      top,
      left,
      rect,
    };
  };

  const askRestoreConfirmation = (doc, event) => {
    if (processing.id) return;

    setActionFeedback(null);

    const { top, left, rect } = getPopupPosition(
      event.currentTarget,
      330,
      165
    );

    setConfirmation({
      type: "restore",
      doc,
      top,
      left,
      buttonRect: rect,
    });
  };

  // Tampilkan konfirmasi Hapus Permanen
  const askDeleteConfirmation = (doc, event) => {
    if (processing.id) return;

    setActionFeedback(null);

    const { top, left, rect } = getPopupPosition(
      event.currentTarget,
      350,
      190
    );

    setConfirmation({
      type: "delete",
      doc,
      top,
      left,
      buttonRect: rect,
    });
  };

  // Menampilkan feedback sukses / gagal 
  const showActionFeedback = ({
    buttonElement,
    type,
    title,
    message,
  }) => {
    if (!buttonElement) return;

    const rect = buttonElement.getBoundingClientRect();

    const popupWidth = 310;

    let top = rect.bottom + 10;
    let left = rect.right - popupWidth;

    if (left < 16) {
      left = 16;
    }

    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }

    const estimatedHeight = 90;

    if (top + estimatedHeight > window.innerHeight - 16) {
      top = rect.top - estimatedHeight - 10;
    }

    if (top < 16) {
      top = 16;
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

  // Jalankan Restore setelah user menekan tombol "Pulihkan"
  const handleRestore = async () => {
    if (!confirmation || confirmation.type !== "restore") return;
    if (!restoreDocument) return;

    const { doc, buttonRect } = confirmation;

    const buttonPosition = {
      getBoundingClientRect: () => buttonRect,
    };

    setConfirmation(null);

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

  // Jalankan hapus permanen 
  const handlePermanentDelete = async () => {
    if (!confirmation || confirmation.type !== "delete") return;
    if (!permanentlyDeleteDocument) return;

    const { doc, buttonRect } = confirmation;

    const buttonPosition = {
      getBoundingClientRect: () => buttonRect,
    };

    setConfirmation(null);

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
            Dokumen di kotak sampah akan dihapus secara otomatis dan permanen
            setelah 30 hari. Pastikan untuk memulihkan dokumen penting sebelum
            batas waktu habis.
          </p>
        </div>

        {/* Container */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Trash2
                size={18}
                className="text-muted-foreground"
              />
              Daftar Dokumen Dihapus ({trashedDocuments.length})
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
                  Tidak ada dokumen yang dihapus saat ini.
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
                          {doc.nomorDokumen} · Kategori: {doc.kategori}
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
                          askRestoreConfirmation(
                            doc,
                            event
                          )
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
                          askDeleteConfirmation(
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

      {/* CONFIRMATION POPOVER */}
      {confirmation && (
        <div
          ref={confirmationRef}
          className="
            fixed z-[10000]
            w-[350px] max-w-[calc(100vw-32px)]
            bg-background
            border border-border
            rounded-xl
            shadow-xl
            overflow-hidden
            animate-in fade-in-0 zoom-in-95 duration-150
          "
          style={{
            top: confirmation.top,
            left: confirmation.left,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`
                  w-9 h-9
                  rounded-full
                  flex items-center justify-center
                  shrink-0

                  ${
                    confirmation.type === "delete"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-sakura-success/10 text-sakura-success"
                  }
                `}
              >
                {confirmation.type === "delete" ? (
                  <Trash2 size={18} />
                ) : (
                  <RotateCcw size={18} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  id="confirmation-title"
                  className="text-sm font-semibold text-foreground"
                >
                  {confirmation.type === "delete"
                    ? "Hapus dokumen permanen?"
                    : "Pulihkan dokumen?"}
                </p>

                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {confirmation.type === "delete" ? (
                    <>
                      Dokumen{" "}
                      <span className="font-medium text-foreground">
                        "{confirmation.doc.judul}"
                      </span>{" "}
                      akan dihapus dari sistem dan tidak dapat dipulihkan lagi.
                    </>
                  ) : (
                    <>
                      Dokumen{" "}
                      <span className="font-medium text-foreground">
                        "{confirmation.doc.judul}"
                      </span>{" "}
                      akan dikembalikan ke Arsip Dokumen.
                    </>
                  )}
                </p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() =>
                  setConfirmation(null)
                }
                className="
                  shrink-0
                  text-muted-foreground
                  hover:text-foreground
                  transition-colors
                  rounded-md
                  p-0.5
                "
                aria-label="Tutup konfirmasi"
              >
                <XCircle size={15} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setConfirmation(null)
              }
            >
              Batal
            </Button>

            {confirmation.type === "delete" ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handlePermanentDelete}
              >
                <Trash2
                  size={14}
                  className="mr-2"
                />
                Hapus Permanen
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleRestore}
                className="
                  bg-sakura-success
                  text-white
                  hover:bg-sakura-success/90
                "
              >
                <RefreshCcw
                  size={14}
                  className="mr-2"
                />
                Pulihkan
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ACTION FEEDBACK */}
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