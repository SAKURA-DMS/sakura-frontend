import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Server, Database, Cloud, ShieldCheck, Wrench } from "lucide-react";
import logoSakura from "@/assets/logo_sakura.png";

const TECH_CARDS = [
  {
    title: "Frontend",
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none">
        <circle cx="12" cy="12" r="2.5" fill="#61DAFB" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.2" fill="none" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.2" fill="none" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.2" fill="none" transform="rotate(120 12 12)" />
      </svg>
    ),
    tags: ["React.js", "TypeScript", "Tailwind CSS", "Vite", "shadcn/ui"],
  },
  {
    title: "Backend",
    icon: <Server size={20} className="text-[#8CC84B]" />,
    tags: ["Node.js", "Express.js", "REST API", "Multer"],
  },
  {
    title: "Database",
    icon: <Database size={20} className="text-purple-500" />,
    tags: ["MySQL", "phpMyAdmin", "XAMPP"],
  },
  {
    title: "Cloud Storage",
    icon: <Cloud size={20} className="text-blue-500" />,
    tags: ["Firebase Storage", "Google Cloud"],
  },
  {
    title: "Keamanan",
    icon: <ShieldCheck size={20} className="text-primary" />,
    tags: ["JWT Token", "bcrypt", "Signed Token"],
  },
  {
    title: "Dev Tools",
    icon: <Wrench size={20} className="text-amber-500" />,
    tags: ["VS Code", "Git & GitHub", "Postman", "Chrome", "MS Edge"],
  },
];

const FEATURE_PILLS = [
  "🔒 Aman & Terenkripsi",
  "☁️ Cloud Storage",
  "✅ Alur Persetujuan Digital",
];

function Slide1() {
  return (
    <div className="flex flex-col md:flex-row items-center gap-10 w-full">
      {/* LEFT — Logo */}
      <div className="flex flex-col items-center gap-4 md:w-[45%] flex-shrink-0">
        <div
          className="flex items-center justify-center rounded-full bg-white overflow-hidden"
          style={{
            width: 220,
            height: 220,
            boxShadow:
              "0 8px 40px rgba(194,58,87,0.15), 0 0 0 8px rgba(255,182,193,0.2), 0 0 0 16px rgba(255,182,193,0.1)",
          }}
        >
          <img
            src={logoSakura}
            alt="SAKURA Logo"
            className="w-full h-full object-cover"
            style={{ borderRadius: "50%" }}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          SMP Negeri 4 Cikarang Barat
        </p>
        <p className="text-xs text-muted-foreground/60 text-center">
          Kab. Bekasi · Jawa Barat
        </p>
      </div>

      {/* RIGHT — Text */}
      <div className="flex-1 min-w-0">
        <h2
          className="text-3xl md:text-[32px] font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "#1A0A0F" }}
        >
          Apa itu SAKURA?
        </h2>
        <p className="text-sm italic mb-5" style={{ color: "#C23A57" }}>
          Secure Archiving and Keeping of Unified Records for Administration
        </p>
        <p className="text-[15px] leading-[1.8] mb-6" style={{ color: "#5B5468" }}>
          SAKURA adalah sistem manajemen dokumen digital yang dirancang khusus untuk SMP Negeri 4
          Cikarang Barat. Sistem ini membantu sekolah dalam mengelola, menyimpan, dan mengarsipkan
          dokumen administrasi secara aman, terstruktur, dan efisien menggunakan teknologi cloud
          modern.
        </p>
        <div className="flex flex-wrap gap-2">
          {FEATURE_PILLS.map((pill) => (
            <span
              key={pill}
              className="inline-block rounded-full text-xs font-medium"
              style={{
                background: "#FDE8EC",
                color: "#C23A57",
                padding: "8px 16px",
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TechCard({ card }) {
  return (
    <div
      className="flex flex-col gap-3 bg-white rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1.5"
      style={{
        border: "1px solid rgba(255,182,193,0.3)",
        boxShadow: "0 4px 16px rgba(194,58,87,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(194,58,87,0.15)";
        e.currentTarget.style.borderColor = "rgba(232,96,122,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(194,58,87,0.06)";
        e.currentTarget.style.borderColor = "rgba(255,182,193,0.3)";
      }}
    >
      <div className="flex items-center gap-2.5">
        {card.icon}
        <span className="font-semibold text-sm" style={{ color: "#1A0A0F" }}>
          {card.title}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {card.tags.map((tag) => (
          <span
            key={tag}
            className="inline-block rounded-full font-medium"
            style={{
              background: "#FDE8EC",
              color: "#C23A57",
              fontSize: 10,
              padding: "3px 10px",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div className="w-full">
      <h2
        className="text-2xl md:text-[28px] font-bold text-center mb-8"
        style={{ fontFamily: "'Playfair Display', serif", color: "#1A0A0F" }}
      >
        Stack Teknologi SAKURA
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TECH_CARDS.map((card) => (
          <TechCard key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}

export default function AboutSection() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const TOTAL = 2;

  const goTo = useCallback(
    (idx) => {
      setDirection(idx > activeSlide ? 1 : -1);
      setActiveSlide(idx);
    },
    [activeSlide]
  );

  const next = useCallback(() => {
    setDirection(1);
    setActiveSlide((p) => (p + 1) % TOTAL);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setActiveSlide((p) => (p - 1 + TOTAL) % TOTAL);
  }, []);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <motion.div
      id="section-about"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative w-full rounded-[28px] overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #FFF8FA 0%, #FFF0F5 50%, #FFE8F2 100%)",
        padding: "48px 6%",
        minHeight: 480,
      }}
    >
      {/* Arrow buttons */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white transition-colors duration-200 hover:bg-secondary"
        style={{ border: "1px solid #FFB7C5" }}
        aria-label="Previous slide"
      >
        <ChevronLeft size={18} className="text-primary" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white transition-colors duration-200 hover:bg-secondary"
        style={{ border: "1px solid #FFB7C5" }}
        aria-label="Next slide"
      >
        <ChevronRight size={18} className="text-primary" />
      </button>

      {/* Slide content */}
      <div className="relative overflow-hidden" style={{ minHeight: 360 }}>
        <motion.div
          key={activeSlide}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full px-6 md:px-12"
        >
          {activeSlide === 0 ? <Slide1 /> : <Slide2 />}
        </motion.div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: activeSlide === i ? 24 : 8,
              height: 8,
              background: activeSlide === i ? "#C23A57" : "#FFB7C5",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
