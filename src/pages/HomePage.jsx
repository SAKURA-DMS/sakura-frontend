import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import logoSakura from "@/assets/logo_sakura.png";
import SakuraBranch, { FloatingParticles, PetalBurstOverlay, usePetalBurst } from "@/components/sakura/SakuraBranch";
import FallingPetals from "@/components/sakura/FallingPetals";
import AboutSection from "@/components/home/AboutSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import SchoolSection from "@/components/home/SchoolSection";

export default function HomePage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const { petals, triggerBurst } = usePetalBurst();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(194,58,87,0.08)" : "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/90 shadow-sm border border-white/30 flex items-center justify-center">
            <img src={logoSakura} alt="SAKURA" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-foreground tracking-wider text-sm">SAKURA</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
          >
            Masuk
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Daftar
          </button>
        </div>
      </nav>

      {/* Falling petals */}
      <FallingPetals />

      {/* Burst petals overlay */}
      <PetalBurstOverlay petals={petals} />

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative w-full"
        style={{
          minHeight: "100vh",
          overflowX: "hidden",
          overflowY: "visible",
          zIndex: 3,
          background: "radial-gradient(ellipse at 50% 40%, #FFF0F3 0%, #FFE4EC 60%, #FFEFF5 100%)",
        }}
      >
        <FloatingParticles count={25} />
        <SakuraBranch onFlowerClick={triggerBurst} />

        {/* Hero text */}
        <motion.div
          className="absolute z-20 right-6 md:right-[10%] top-1/2 -translate-y-1/2 max-w-sm md:max-w-md text-right"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
        >
          <motion.span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-medium tracking-wide mb-4"
            style={{ background: "rgba(194, 24, 91, 0.08)", color: "#C2185B" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            SMP Negeri 4 Cikarang Barat
          </motion.span>

          <motion.h1
            className="text-5xl md:text-7xl font-bold leading-none mb-3"
            style={{ fontFamily: "'Playfair Display', serif", color: "#1A0A0F" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            SAKURA
          </motion.h1>

          <motion.p
            className="text-xs md:text-sm leading-relaxed mb-1"
            style={{ color: "#6B4C5A" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.8 }}
          >
            Secure Archiving and Keeping of
            <br />
            Unified Records for Administration
          </motion.p>

          <motion.p
            className="text-[11px] mb-6"
            style={{ color: "#9B7A8A" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            SMP Negeri 4 Cikarang Barat · Kab. Bekasi
          </motion.p>

          <motion.button
            onClick={() => navigate("/login")}
            className="group inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold transition-all duration-300"
            style={{
              background: "#C23A57",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(194, 24, 91, 0.25)",
            }}
            whileHover={{ boxShadow: "0 6px 30px rgba(194, 24, 91, 0.45)", scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, duration: 0.6 }}
          >
            Masuk ke Sistem
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          <span className="text-[11px] tracking-wide font-medium" style={{ color: "#C2185B" }}>
            🌸 Klik bunga untuk menjelajahi
          </span>
          <motion.div
            className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
            style={{ borderColor: "#D4A0B0" }}
          >
            <motion.div
              className="w-1 h-2 rounded-full"
              style={{ background: "#C2185B" }}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Feature sections */}
      <div
        className="relative"
        style={{
          zIndex: 2,
          background: "linear-gradient(180deg, #FFE4EC 0%, #FFEAF1 50%, #FFE4EC 100%)",
        }}
      >
        <div className="relative z-[2] max-w-5xl mx-auto px-6 py-24 space-y-24">
          <AboutSection />
          <FeaturesSection />
          <SchoolSection />
        </div>
      </div>
    </div>
  );
}
