import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  X,
  Minus,
  Send,
  Search,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Ellipsis,
  User,
  Upload,
} from "lucide-react";
import { sendChatMessage } from "@/services/chatbotService";
import { useApp } from "@/contexts/AppContext";
import * as documentService from "@/services/documentService";
import profileLogo from "@/assets/logo_sakura.jpg";
import chatbotGif from "@/assets/aichatbot_sakura.gif";
import chatbotPoster from "@/assets/sakura_chatbot_poster.png";
import sakuraBranch from "@/assets/sakura_branch.png";

// ── Path alias: terjemahan Bahasa → route internal ────────────────────────────
// FIX: AI backend sering kembalikan path versi Indonesia (e.g. /arsip).
// Semua alias di sini di-resolve ke route React Router yang valid.
const PATH_ALIASES = {
  "/arsip": "/archive",
  "/arsip-digital": "/archive",
  "/beranda": "/home",
  "/profil": "/profile",
  "/pengaturan": "/settings",
  "/sampah": "/trash",
  "/sampah-digital": "/trash",
  "/persetujuan": "/approval/pending",
  "/menunggu": "/approval/pending",
  "/disetujui": "/approval/approved",
  "/pengguna": "/users",
  "/peran": "/roles",
  "/log": "/logs",
  "/riwayat": "/logs",
};

function resolvePath(path) {
  if (!path) return "/";
  const lower = path.toLowerCase().trim();
  return PATH_ALIASES[lower] || path;
}

// ── Avatar petal config ───────────────────────────────────────────────────────
const AVATAR_PETALS = [
  { x: 26, y: -22, rot: 160, delay: 0 },
  { x: -28, y: -18, rot: 260, delay: 0.05 },
  { x: 30, y: 14, rot: 90, delay: 0.1 },
  { x: -26, y: 20, rot: 320, delay: 0.02 },
  { x: 4, y: -32, rot: 40, delay: 0.08 },
  { x: -6, y: 30, rot: 200, delay: 0.12 },
];

function PetalRing({ scale = 1 }) {
  return (
    <>
      {AVATAR_PETALS.map((p, i) => (
        <span
          key={i}
          className="sakura-avatar-petal"
          style={{
            "--fly-x": `${p.x * scale}px`,
            "--fly-y": `${p.y * scale}px`,
            "--fly-rot": `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

// FIX LOGO: object-contain + bg-white/90 agar logo penuh kelihatan (sebelumnya
// object-cover memotong gambar sehingga logo tidak tampak di beberapa ukuran).
function SakuraAvatar({ size = 44, className = "", interactive = false }) {
  return (
    <div
      className={`sakura-avatar-group relative flex-shrink-0 outline-none ${className}`}
      style={{ width: size, height: size }}
      tabIndex={interactive ? 0 : -1}
    >
      {interactive && <PetalRing />}
      {interactive && (
        <div
          className="sakura-avatar-glow absolute inset-0 rounded-full"
          style={{ transition: "box-shadow 300ms ease" }}
        />
      )}
      {/* FIX: object-contain + p-0.5 + bg-white/90 agar logo tidak terpotong */}
      <img
        src={profileLogo}
        alt="SAKURA AI"
        className="sakura-avatar-img relative w-full h-full rounded-full object-contain bg-white/90 border-2 border-white/80 shadow-md p-0.5"
        style={{ transition: "transform 300ms ease" }}
        onError={(e) => {
          // Fallback: tampilkan teks "S" jika gambar gagal load
          e.target.style.display = "none";
          e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
        }}
      />
      {/* Fallback teks jika img gagal */}
      <div
        className="absolute inset-0 rounded-full bg-primary/20 items-center justify-center text-primary font-bold text-sm hidden"
        aria-hidden="true"
      >
        S
      </div>
    </div>
  );
}

function formatTime(date) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);
}

// ── Bubble pesan ──────────────────────────────────────────────────────────────
function MessageBubble({ msg, navigate, onLinkClick }) {
  const isUser = msg.role === "user";

  const routeMap = [
    { keys: ["upload dokumen", "halaman upload", "upload"], path: "/upload", label: "Buka halaman upload" },
    { keys: ["dashboard", "statistik", "statistik dokumen"], path: "/dashboard", label: "Buka dashboard" },
    { keys: ["arsip", "archive", "arsip digital"], path: "/archive", label: "Buka arsip" },
    { keys: ["persetujuan", "approval", "menunggu"], path: "/approval/pending", label: "Lihat persetujuan" },
    { keys: ["persetujuan pending", "approval pending"], path: "/approval/pending", label: "Lihat persetujuan (menunggu)" },
    { keys: ["persetujuan disetujui", "approved", "approval approved"], path: "/approval/approved", label: "Lihat persetujuan (disetujui)" },
    { keys: ["profil", "profile"], path: "/profile", label: "Buka profil" },
    { keys: ["ganti password", "change password", "ubah kata sandi"], path: "/change-password", label: "Ganti password" },
    { keys: ["pengguna", "users", "manajemen pengguna"], path: "/users", label: "Manajemen pengguna" },
    { keys: ["peran", "roles", "manajemen peran"], path: "/roles", label: "Manajemen peran" },
    { keys: ["log", "logs", "riwayat"], path: "/logs", label: "Lihat log" },
    { keys: ["sampah", "trash"], path: "/trash", label: "Sampah" },
    { keys: ["pengaturan", "settings"], path: "/settings", label: "Buka pengaturan" },
    { keys: ["beranda", "home", "halaman beranda"], path: "/home", label: "Beranda" },
  ];

  function findLinksFromText(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];

    // Deteksi path eksplisit (/upload, /arsip, dll) — lalu resolve alias
    const pathMatch = text.match(/\/(?:[a-z0-9\-_/]+)/i);
    if (pathMatch) {
      const resolved = resolvePath(pathMatch[0]);
      found.push({ path: resolved, label: `Buka ${resolved}` });
    }

    for (const m of routeMap) {
      if (m.keys.some((k) => lower.includes(k))) {
        if (!found.some((f) => f.path === m.path)) found.push({ path: m.path, label: m.label });
      }
    }

    return found;
  }

  // Prefer structured links dari backend; fallback ke deteksi teks
  const rawLinks = msg.links && msg.links.length ? msg.links : findLinksFromText(msg.text || "");
  // FIX: resolve alias untuk semua link (termasuk yang dari backend)
  const links = rawLinks.map((l) => ({ ...l, path: resolvePath(l.path) }));
  const time = formatTime(msg.time || new Date());

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"} mb-3.5`}>
      {!isUser && <SakuraAvatar size={28} className="mb-0.5" />}

      <div className={`flex flex-col max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
            isUser
              ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl rounded-br-md"
              : msg.isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl rounded-bl-md"
              : "bg-card text-card-foreground border border-secondary rounded-2xl rounded-bl-md"
          }`}
        >
          {msg.text}
          {!isUser && !msg.isError && links.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {links.map((l, idx) => (
                <button
                  key={idx}
                  onClick={() => (onLinkClick ? onLinkClick(l) : navigate(resolvePath(l.path)))}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {l.label}
                </button>
              ))}
            </div>
          )}
          {msg.doc && (
            <div className="mt-2.5 p-3 bg-secondary/60 rounded-xl border border-secondary">
              <div className="font-semibold text-sm text-foreground">{msg.doc.judul || msg.doc.nomor || `Dokumen #${msg.doc.id}`}</div>
              {msg.doc.nomor && <div className="text-xs opacity-80 mt-0.5">Nomor: {msg.doc.nomor}</div>}
              {msg.doc.status && <div className="text-xs opacity-80">Status: {msg.doc.status}</div>}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => navigate(`/archive?q=${encodeURIComponent(msg.doc.judul || msg.doc.nomor || '')}`)}
                  className="text-xs px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  Buka arsip
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 px-1">{time}</span>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mb-0.5">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { key: "cari", label: "Cari dokumen", icon: Search, prompt: "Saya ingin mencari dokumen" },
  { key: "statistik", label: "Statistik dokumen", icon: ChartNoAxesColumnIncreasing, prompt: "Tampilkan statistik dokumen" },
  { key: "bantuan", label: "Bantuan penggunaan", icon: CircleHelp, prompt: "Bagaimana cara menggunakan SAKURA?" },
];

const MORE_ACTIONS = [
  { key: "menunggu", label: "Dokumen menunggu persetujuan", prompt: "Ada dokumen apa saja yang menunggu persetujuan?" },
  { key: "upload", label: "Cara upload dokumen", prompt: "Bagaimana cara upload dokumen baru?" },
  { key: "reset", label: "Mulai percakapan baru", prompt: "__reset__" },
];

// ── Komponen utama ChatBot ─────────────────────────────────────────────────────
export default function ChatBot() {
  const { isLoggedIn } = useApp();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const welcomeMessage = {
    role: "assistant",
    text: "Halo! Saya SAKURA AI 🌸\nSaya siap membantu kamu mencari informasi seputar dokumen di sistem SAKURA DMS.",
    time: new Date(),
  };
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const dragConstraintsRef = useRef(null);
  // FIX: dragX dipakai BERSAMA oleh button dan chat panel agar keduanya sinkron
  const dragX = useMotionValue(0);

  // Auto-resize textarea
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    // Reset tinggi dulu agar bisa mengecil kembali
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Delay kecil agar animasi selesai dulu sebelum focus
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, isMinimized]);

  // Reset tinggi textarea saat input dikosongkan (setelah kirim)
  useEffect(() => {
    if (!input && inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input]);

  if (!isLoggedIn) return null;

  async function sendText(text) {
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", text, time: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text);
      const answer = typeof res === "string" ? res : res.answer || res.reply || "";
      const links = res.links || [];
      setMessages((prev) => [...prev, { role: "assistant", text: answer, links, time: new Date() }]);
    } catch (err) {
      const serverMsg =
        err?.response?.data?.error || err?.message || "Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠️ ${serverMsg}`, isError: true, time: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendText(text);
  }

  function handleQuickAction(action) {
    setShowMore(false);
    if (action.prompt === "__reset__") {
      setMessages([{ ...welcomeMessage, time: new Date() }]);
      return;
    }
    sendText(action.prompt);
  }

  async function handleLinkClick(link) {
    try {
      if (!link || !link.path) return;

      // FIX: resolve alias sebelum navigate
      const resolved = resolvePath(link.path);

      if (resolved.startsWith("/documents/")) {
        const parts = resolved.split("/");
        const id = parts[parts.length - 1];
        if (!id) return;
        setMessages((prev) => [...prev, { role: "assistant", text: `Memuat dokumen ${id}...`, time: new Date() }]);
        try {
          const { document } = await documentService.getDocument(id);
          setMessages((prev) => {
            const copy = prev.slice(0, -1);
            return [
              ...copy,
              {
                role: "assistant",
                text: `Detail dokumen: ${document.judul || document.nomor || ""}`,
                doc: { id: document.id, judul: document.judul, nomor: document.nomor_dokumen || document.nomor, status: document.status },
                time: new Date(),
              },
            ];
          });
        } catch (e) {
          setMessages((prev) => [...prev, { role: "assistant", text: `Gagal memuat dokumen: ${e.message || e}`, time: new Date() }]);
        }
        return;
      }

      navigate(resolved);
    } catch (e) {
      console.error("handleLinkClick error", e);
    }
  }

  function handleKeyDown(e) {
    // Enter kirim pesan; Shift+Enter baris baru
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function openChat() {
    setIsOpen(true);
    setIsMinimized(false);
  }

  return (
    <>
      {/* ── Chat Window ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            // FIX DRAG SYNC: gunakan dragX yang sama dengan floating button,
            // sehingga panel chat mengikuti posisi icon ke manapun ia digeser.
            style={{ x: dragX, height: isMinimized ? "auto" : "520px", maxHeight: "80vh" }}
            className="fixed bottom-24 right-5 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl ring-1 ring-black/5 border border-secondary bg-card overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0 overflow-hidden text-primary-foreground">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${sakuraBranch})`,
                  backgroundSize: "cover",
                  backgroundPosition: "right center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/60" />

              <SakuraAvatar size={40} className="relative z-10" interactive />

              <div className="flex-1 min-w-0 relative z-10">
                <p className="font-semibold text-sm leading-none flex items-center gap-1">
                  SAKURA AI <span aria-hidden="true">🌸</span>
                </p>
                <p className="text-[11px] opacity-85 mt-1">AI Search Assistant</p>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <button
                  onClick={() => setIsMinimized((v) => !v)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground/85 hover:text-primary-foreground hover:bg-white/15 transition-colors"
                  aria-label={isMinimized ? "Perbesar chatbot" : "Kecilkan chatbot"}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground/85 hover:text-primary-foreground hover:bg-white/15 transition-colors"
                  aria-label="Tutup chatbot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3.5 py-4 bg-background">
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} navigate={navigate} onLinkClick={handleLinkClick} />
                  ))}
                  {loading && (
                    <div className="flex items-end gap-2 mb-3.5">
                      <SakuraAvatar size={28} />
                      <div className="bg-card border border-secondary px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm shadow-sm">
                        <span className="inline-flex gap-1">
                          <span className="animate-bounce [animation-delay:0ms] text-primary">●</span>
                          <span className="animate-bounce [animation-delay:150ms] text-primary">●</span>
                          <span className="animate-bounce [animation-delay:300ms] text-primary">●</span>
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick actions */}
                <div className="px-3 pt-2.5 pb-1 flex-shrink-0 bg-background border-t border-secondary">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {QUICK_ACTIONS.map((qa) => {
                      const Icon = qa.icon;
                      return (
                        <button
                          key={qa.key}
                          onClick={() => handleQuickAction(qa)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/25 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {qa.label}
                        </button>
                      );
                    })}
                    <div className="relative">
                      <button
                        onClick={() => setShowMore((v) => !v)}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-primary/25 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        aria-label="Opsi lainnya"
                      >
                        <Ellipsis className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showMore && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-10 right-0 w-56 rounded-xl border border-secondary bg-card shadow-lg overflow-hidden z-20"
                          >
                            {MORE_ACTIONS.map((a) => (
                              <button
                                key={a.key}
                                onClick={() => handleQuickAction(a)}
                                className="w-full text-left text-xs px-3.5 py-2.5 hover:bg-secondary/70 transition-colors text-card-foreground"
                              >
                                {a.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* FIX INPUT: textarea (wrap otomatis ke bawah) + border halus tanpa ring biru */}
                <div className="flex items-end gap-2 px-3 py-3 flex-shrink-0 bg-background">
                  <div className="flex-1 flex items-end gap-2 rounded-2xl border border-input/70 bg-card px-3.5 py-2.5 hover:border-primary/40 focus-within:border-primary/60 transition-colors">
                    <span
                      className="text-base leading-none flex-shrink-0 mb-0.5"
                      aria-hidden="true"
                    >
                      🌸
                    </span>
                    {/* textarea menggantikan input: teks panjang wrap ke bawah bukan ke samping */}
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Tanyakan sesuatu tentang dokume… (Enter kirim, Shift+Enter baris baru)"
                      disabled={loading}
                      rows={1}
                      className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none disabled:opacity-50 resize-none overflow-y-auto leading-relaxed"
                      style={{ maxHeight: "80px" }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Kirim pesan"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ─────────────────────────────────────────────────── */}
      {/* dragConstraintsRef diletakkan di sini agar button bisa drag kiri-kanan */}
      <div
        ref={dragConstraintsRef}
        className="fixed inset-x-4 bottom-5 h-16 pointer-events-none z-40"
        aria-hidden="true"
      />
      {!isOpen && (
        <motion.button
          drag="x"
          dragConstraints={dragConstraintsRef}
          dragElastic={0.06}
          dragMomentum={false}
          // FIX DRAG SYNC: gunakan dragX yang sama dengan chat panel
          style={{ x: dragX }}
          onTap={openChat}
          className="sakura-avatar-group group fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full shadow-xl ring-1 ring-black/5 flex items-center justify-center cursor-grab active:cursor-grabbing transition-[transform,box-shadow] duration-300 ease-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30"
          aria-label="Buka SAKURA AI Assistant (bisa digeser ke kiri/kanan)"
          title="SAKURA AI — geser untuk memindahkan"
        >
          <PetalRing scale={1.3} />
          <div
            className="sakura-avatar-glow absolute inset-0 rounded-full"
            style={{ transition: "box-shadow 300ms ease" }}
          />
          {/* Poster statis (default) */}
          <img
            src={chatbotPoster}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="sakura-avatar-img absolute inset-0 w-full h-full rounded-full object-cover border-2 border-white shadow-lg opacity-100 group-hover:opacity-0 transition-opacity duration-200"
          />
          {/* GIF animasi saat hover */}
          <img
            src={chatbotGif}
            alt="SAKURA AI"
            draggable={false}
            className="sakura-avatar-img absolute inset-0 w-full h-full rounded-full object-cover border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          />
        </motion.button>
      )}
    </>
  );
}