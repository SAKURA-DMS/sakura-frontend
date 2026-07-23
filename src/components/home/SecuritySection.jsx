import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const features = [
  "Role-Based Access Control (RBAC)",
  "Verifikasi dokumen terpusat",
  "Audit trail lengkap",
];

function QRMockup() {
  return (
    <div
      className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "2px solid rgba(255,182,193,0.4)",
        boxShadow: "0 0 30px rgba(232,96,122,0.5)",
      }}
    >
      <svg viewBox="0 0 100 100" width="120" height="120">
        {[0, 1, 2, 3, 4, 5, 6].map((row) =>
          [0, 1, 2, 3, 4, 5, 6].map((col) => {
            const isCorner =
              (row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3);
            const show = isCorner || Math.random() > 0.4;
            return show ? (
              <rect
                key={`${row}-${col}`}
                x={10 + col * 12}
                y={10 + row * 12}
                width="10"
                height="10"
                rx="1.5"
                fill="white"
                opacity={isCorner ? 0.9 : 0.6}
              />
            ) : null;
          })
        )}
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={a} transform={`rotate(${a}, 50, 50)`}>
            <path d="M50,50 C46,46 44,40 50,36 C56,40 54,46 50,50Z" fill="#FFB7C5" opacity="0.9" />
          </g>
        ))}
        <circle cx="50" cy="50" r="3" fill="#FFD700" />
      </svg>
      <div
        className="absolute left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,182,193,0.8), transparent)",
          animation: "scanLine 2.5s linear infinite",
        }}
      />
    </div>
  );
}

export default function SecuritySection() {
  return (
    <motion.div
      id="section-security"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      className="p-10 md:p-14 rounded-[28px] flex flex-col md:flex-row items-center gap-10"
      style={{
        background: "linear-gradient(135deg, #2D1B2E, #4A1530)",
        boxShadow: "0 20px 60px rgba(45,27,46,0.3)",
      }}
    >
      <div className="flex-1">
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Keamanan & Verifikasi Dokumen</h3>
        <p className="text-white/70 leading-relaxed mb-6">
          SAKURA menggunakan standar keamanan tinggi untuk melindungi setiap dokumen yang diarsipkan.
        </p>
        <ul className="space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <CheckCircle size={18} style={{ color: "#FFB7C5", flexShrink: 0 }} />
              <span className="text-white/90 text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 flex justify-center">
        <QRMockup />
      </div>
    </motion.div>
  );
}
