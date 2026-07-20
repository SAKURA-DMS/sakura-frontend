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
  AlertCircle,
  Info,
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
        className,
        variant,
        ...props
      }) {
        const isDestructive = variant === "destructive";

        return (
          <Toast
            key={id}
            {...props}
            variant={variant}
            className={`
              relative
              overflow-hidden
              rounded-xl
              border
              px-4
              py-3.5
              pr-10
              shadow-lg
              ${
                isDestructive
                  ? "border-red-200 bg-white text-foreground"
                  : "border-border/70 bg-white text-foreground"
              }
              ${className || ""}
            `}
          >
            {/* Aksen tipis di sisi kiri */}
            <div
              className={`
                absolute
                left-0
                top-0
                h-full
                w-1
                ${
                  isDestructive
                    ? "bg-destructive"
                    : "bg-primary"
                }
              `}
            />

            <div className="flex min-w-0 items-start gap-3">
              {/* Icon status */}
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
                  ${
                    isDestructive
                      ? "bg-red-50 text-destructive"
                      : "bg-primary/10 text-primary"
                  }
                `}
              >
                {isDestructive ? (
                  <AlertCircle size={17} />
                ) : (
                  <CheckCircle2 size={17} />
                )}
              </div>

              {/* Isi notifikasi */}
              <div className="min-w-0 flex-1">
                {title && (
                  <ToastTitle className="text-sm font-semibold leading-5 text-foreground">
                    {title}
                  </ToastTitle>
                )}

                {description && (
                  <ToastDescription className="mt-0.5 text-sm font-normal leading-5 text-muted-foreground">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>

            {action}

            <ToastClose
              className="
                absolute
                right-2.5
                top-2.5
                rounded-md
                p-1
                text-muted-foreground
                opacity-70
                transition-colors
                hover:bg-muted
                hover:text-foreground
                hover:opacity-100
              "
            />
          </Toast>
        );
      })}

      <ToastViewport />
    </ToastProvider>
  );
}