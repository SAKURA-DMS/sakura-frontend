import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

function getInitials(nama) {
  return (nama || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function isValidImgSrc(src) {
  return (
    !!src &&
    (src.startsWith("data:image/") || src.startsWith("http") || src.startsWith("/"))
  );
}

/**
 * @param {object} props
 * @param {number|string|null} [props.userId]  
 * @param {string|null} [props.avatar]         
 * @param {string} [props.nama]                
 * @param {number} [props.size=36]             
 * @param {boolean} [props.showStatus=true]    
 * @param {boolean} [props.square=false]       
 * @param {string} [props.className]           
 * @param {boolean} [props.forceOnline]        
 */
export default function UserAvatar({
  userId,
  avatar,
  nama,
  size = 36,
  showStatus = true,
  square = false,
  className = "",
  forceOnline,
}) {
  const { isUserOnline } = useApp();
  const [broken, setBroken] = useState(false);

  useEffect(() => { setBroken(false); }, [avatar]);

  const online = typeof forceOnline === "boolean" ? forceOnline : isUserOnline(userId);
  const validSrc = isValidImgSrc(avatar) && !broken;
  const initials = getInitials(nama);
  
  const dotSize = Math.max(8, Math.round(size * 0.32));
  const borderWidth = Math.max(1.5, Math.round(size * 0.06));

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      {validSrc ? (
        <img
          src={avatar}
          alt={nama || "Avatar"}
          onError={() => setBroken(true)}
          className={cn(
            "w-full h-full object-cover",
            square ? "rounded-lg" : "rounded-full",
            className
          )}
        />
      ) : (
        <span
          className={cn(
            "w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold select-none",
            square ? "rounded-lg" : "rounded-full",
            className
          )}
          style={{ fontSize: Math.max(9, Math.round(size * 0.36)) }}
          aria-label={nama || "Pengguna"}
        >
          {initials}
        </span>
      )}

      {showStatus && userId !== null && userId !== undefined && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-card",
            online ? "bg-sakura-success" : "bg-muted-foreground/50"
          )}
          style={{
            width: dotSize,
            height: dotSize,
            right: -1,
            bottom: -1,
            boxShadow: `0 0 0 ${borderWidth}px var(--card, #fff)`,
          }}
          aria-label={online ? "Online" : "Offline"}
          title={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}