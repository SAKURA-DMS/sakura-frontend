import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        type,
        className,
        ...props
      }) {
        /*
         * Penentuan jenis toast.
         *
         * destructive = error
         * type bisa digunakan halaman tertentu:
         * success | warning | info | error
         *
         * Default dibuat success agar kompatibel
         * dengan pemanggilan toast lama.
         */
        const toastType =
          variant === "destructive"
            ? "error"
            : type || "success";

        const styles = {
          success: {
            accent: "bg-emerald-500",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            Icon: CheckCircle2,
          },

          warning: {
            accent: "bg-amber-500",
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            Icon: AlertTriangle,
          },

          error: {
            accent: "bg-red-500",
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
            Icon: XCircle,
          },

          info: {
            accent: "bg-primary",
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
            Icon: Info,
          },
        };

        const currentStyle =
          styles[toastType] || styles.success;

        const Icon = currentStyle.Icon;

        return (
          <Toast
            key={id}
            {...props}
            className="
              group
              relative
              overflow-hidden
              rounded-xl
              border
              border-border/70
              bg-background
              px-4
              py-3.5
              pr-10
              text-foreground
              shadow-lg
            "
          >
            {/* Status accent */}
            <div
              className={`
                absolute
                bottom-0
                left-0
                top-0
                w-1
                ${currentStyle.accent}
              `}
            />

            <div className="flex min-w-0 items-start gap-3">
              {/* Status icon */}
              <div
                className={`
                  mt-0.5
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  ${currentStyle.iconBg}
                  ${currentStyle.iconColor}
                `}
              >
                <Icon size={17} strokeWidth={2} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {title && (
                  <ToastTitle
                    className="
                      pr-2
                      text-sm
                      font-semibold
                      leading-5
                      text-foreground
                    "
                  >
                    {title}
                  </ToastTitle>
                )}

                {description && (
                  <ToastDescription
                    className="
                      mt-0.5
                      text-sm
                      font-normal
                      leading-5
                      text-muted-foreground
                    "
                  >
                    {description}
                  </ToastDescription>
                )}

                {action && (
                  <div className="mt-2">
                    {action}
                  </div>
                )}
              </div>
            </div>

            <ToastClose
              className="
                absolute
                right-2.5
                top-2.5
                rounded-md
                p-1
                text-muted-foreground
                opacity-60
                transition
                hover:bg-muted
                hover:text-foreground
                hover:opacity-100
                focus:outline-none
              "
            />
          </Toast>
        );
      })}

      <ToastViewport />
    </ToastProvider>
  );
}