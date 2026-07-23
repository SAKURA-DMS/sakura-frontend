import { motion } from "framer-motion";
import { FileText, Shield, Clock, Upload, CheckCircle, Archive } from "lucide-react";

/* Archive Section */
const archiveStats = [
  { icon: FileText, number: "248", label: "Dokumen", desc: "Tersimpan aman secara digital" },
  { icon: Clock, number: "99.9%", label: "Uptime", desc: "Ketersediaan sistem 24/7" },
  { icon: Shield, number: "256-bit", label: "Enkripsi", desc: "Perlindungan data tingkat tinggi" },
];

function SakuraIcon() {
  return (
    <div className="w-14 h-14 flex items-center justify-center mb-5 mx-auto" style={{ background: "rgba(232, 96, 122, 0.1)", borderRadius: "12px" }}>
      <svg viewBox="0 0 100 100" width={36} height={36}>
        <defs>
          <radialGradient id="archIconPG" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FFB7C5" />
            <stop offset="100%" stopColor="#E8607A" />
          </radialGradient>
        </defs>
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={a} transform={`rotate(${a}, 50, 50)`}>
            <path d="M50,50 C38,38 30,20 50,10 C70,20 62,38 50,50Z" fill="url(#archIconPG)" opacity="0.9" />
          </g>
        ))}
        <circle cx="50" cy="50" r="7" fill="#FFD700" opacity="0.9" />
      </svg>
    </div>
  );
}

const ArchiveFeature = () => (
  <motion.div
    id="section-why"
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
    className="space-y-8"
  >
    <div className="text-center">
      <SakuraIcon />
      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Pentingnya Arsip Digital</h3>
      <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Digitalisasi arsip mengurangi risiko kehilangan dokumen fisik, mempercepat pencarian data,
        dan memungkinkan akses terpusat dari mana saja.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {archiveStats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          className="group p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 cursor-default"
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,182,193,0.3)",
            boxShadow: "0 8px 32px rgba(194,58,87,0.06)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 20px 50px rgba(194,58,87,0.14)";
            e.currentTarget.style.borderColor = "rgba(232,96,122,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(194,58,87,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,182,193,0.3)";
          }}
        >
          <stat.icon size={28} style={{ color: "#C23A57" }} className="mb-4" />
          <div className="text-3xl font-bold text-foreground mb-1">{stat.number}</div>
          <div className="text-sm font-semibold mb-2" style={{ color: "#C23A57" }}>{stat.label}</div>
          <p className="text-sm text-muted-foreground">{stat.desc}</p>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

/* Workflow Section */
const workflowSteps = [
  { icon: Upload, label: "Upload Dokumen", desc: "Operator/TU mengunggah dokumen" },
  { icon: Clock, label: "Menunggu Review", desc: "Kepala Sekolah memeriksa" },
  { icon: CheckCircle, label: "Disetujui / Ditolak", desc: "Keputusan final" },
  { icon: Archive, label: "Diarsipkan", desc: "Dokumen diarsipkan dan tersedia verifikasi terpusat" },
];

const WorkflowFeature = () => (
  <motion.div
    id="section-workflow"
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
    className="space-y-10"
  >
    <div className="text-center">
      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Alur Persetujuan Dokumen</h3>
      <p className="text-muted-foreground max-w-xl mx-auto">
        Proses digital yang transparan dari upload hingga arsip final.
      </p>
    </div>
    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-0">
      <div
        className="hidden md:block absolute top-8 left-[12%] right-[12%] h-[2px]"
        style={{
          background: "repeating-linear-gradient(90deg, #FFB7C5 0, #FFB7C5 8px, transparent 8px, transparent 16px)",
        }}
      />
      {workflowSteps.map((step, i) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          className="flex-1 flex flex-col items-center text-center relative z-10"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative"
            style={{
              background: "linear-gradient(135deg, #FFB7C5, #E8607A)",
              boxShadow: "0 0 20px rgba(232,96,122,0.4)",
            }}
          >
            <step.icon size={24} color="white" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid rgba(232,96,122,0.3)",
                animation: "stepPulse 2s ease-in-out infinite",
                animationDelay: `${i * 0.4}s`,
              }}
            />
          </div>
          <div className="font-semibold text-foreground text-sm mb-1">{step.label}</div>
          <div className="text-xs text-muted-foreground max-w-[140px]">{step.desc}</div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

/* Combined FeaturesSection */
export default function FeaturesSection() {
  return (
    <>
      <ArchiveFeature />
      <WorkflowFeature />
    </>
  );
}