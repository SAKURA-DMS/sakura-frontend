import { motion } from "framer-motion";
import { Upload, Clock, CheckCircle, Archive } from "lucide-react";

const steps = [
  { icon: Upload, label: "Upload Dokumen", desc: "Operator/TU mengunggah dokumen" },
  { icon: Clock, label: "Menunggu Review", desc: "Kepala Sekolah memeriksa" },
  { icon: CheckCircle, label: "Disetujui / Ditolak", desc: "Keputusan final" },
  { icon: Archive, label: "Diarsipkan", desc: "Dokumen diarsipkan dan tersedia verifikasi terpusat" },
];

export default function WorkflowSection() {
  return (
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

        {steps.map((step, i) => (
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
}
