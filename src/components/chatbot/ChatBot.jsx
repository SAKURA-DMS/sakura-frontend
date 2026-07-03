import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendChatMessage } from "@/services/chatbotService";
import { useApp } from "@/contexts/AppContext";
import aichatbotSakura from "@/assets/aichatbot_sakura.gif";
import * as documentService from "@/services/documentService";

// ── Komponen bubble pesan ──────────────────────────────────────────────────────
function MessageBubble({ msg, navigate, onLinkClick }) {
  const isUser = msg.role === "user";

  // Simple mapping: keyword -> internal route
  const routeMap = [
    { keys: ["upload dokumen", "halaman upload", "upload"], path: "/upload", label: "Buka halaman upload" },
    { keys: ["dashboard", "statistik", "statistik dokumen"], path: "/dashboard", label: "Buka dashboard" },
    { keys: ["arsip", "archive", "arsip digital"], path: "/archive", label: "Buka arsip" },
    { keys: ["persetujuan", "approval", "menunggu"], path: "/approval", label: "Lihat persetujuan" },
    { keys: ["persetujuan pending", "approval pending", "menunggu"], path: "/approval/pending", label: "Lihat persetujuan (menunggu)" },
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

    // explicit relative path detection, e.g. /upload
    const pathMatch = text.match(/\/(?:[a-z0-9\-_/]+)/i);
    if (pathMatch) {
      found.push({ path: pathMatch[0], label: `Buka ${pathMatch[0]}` });
    }

    for (const m of routeMap) {
      if (m.keys.some((k) => lower.includes(k))) {
        if (!found.some((f) => f.path === m.path)) found.push({ path: m.path, label: m.label });
      }
    }

    return found;
  }

  // prefer structured links from backend if provided on the message
  const links = msg.links && msg.links.length ? msg.links : findLinksFromText(msg.text || "");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      {!isUser && (
        <img
          src={aichatbotSakura}
          alt="SAKURA AI"
          className="w-7 h-7 rounded-full mr-2 flex-shrink-0 self-end"
        />
      )}

      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : msg.isError
            ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
            : "bg-secondary text-secondary-foreground rounded-bl-sm"
        }`}
      >
        {msg.text}
        {/* Quick link buttons */}
        {!isUser && !msg.isError && links.length > 0 && (
          <div className="mt-2 flex gap-2">
            {links.map((l, idx) => (
              <button
                key={idx}
                onClick={() => onLinkClick ? onLinkClick(l) : navigate(l.path)}
                className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 border border-border text-primary-foreground"
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
        {msg.doc && (
          <div className="mt-2 p-3 bg-white/10 rounded-md border border-border">
            <div className="font-semibold text-sm">{msg.doc.judul || msg.doc.nomor || `Dokumen #${msg.doc.id}`}</div>
            {msg.doc.nomor && <div className="text-xs opacity-80">Nomor: {msg.doc.nomor}</div>}
            {msg.doc.status && <div className="text-xs opacity-80">Status: {msg.doc.status}</div>}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => navigate(`/archive?q=${encodeURIComponent(msg.doc.judul || msg.doc.nomor || '')}`)}
                className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 border border-border text-primary-foreground"
              >
                Buka arsip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Komponen utama ChatBot ─────────────────────────────────────────────────────
export default function ChatBot() {
  const { isLoggedIn } = useApp();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Halo! Saya SAKURA AI 🌸\nAda yang bisa saya bantu cari di sistem SAKURA?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll ke bawah setiap ada pesan baru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Fokus input saat jendela dibuka
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Hanya tampilkan jika user sudah login
  if (!isLoggedIn) return null;

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text);
      const answer = typeof res === "string" ? res : res.answer || res.reply || "";
      const links = res.links || [];
      setMessages((prev) => [...prev, { role: "assistant", text: answer, links }]);
    } catch (err) {
      const serverMsg =
        err?.response?.data?.error || err?.message || "Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ ${serverMsg}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkClick(link) {
    try {
      if (!link || !link.path) return;
      // If it's a document link like /documents/:id, fetch and show inline
      if (link.path.startsWith("/documents/")) {
        const parts = link.path.split("/");
        const id = parts[parts.length - 1];
        if (!id) return;
        // show a temporary loading message
        setMessages((prev) => [...prev, { role: "assistant", text: `Memuat dokumen ${id}...` }]);
        try {
          const { document } = await documentService.getDocument(id);
          // replace the loading message with the document card
          setMessages((prev) => {
            const copy = prev.slice(0, -1);
            return [...copy, { role: "assistant", text: `Detail dokumen: ${document.judul || document.nomor || ''}`, doc: { id: document.id, judul: document.judul, nomor: document.nomor_dokumen || document.nomor, status: document.status } }];
          });
        } catch (e) {
          setMessages((prev) => [...prev, { role: "assistant", text: `Gagal memuat dokumen: ${e.message || e}` }]);
        }
        return;
      }

      // Otherwise navigate to the path
      navigate(link.path);
    } catch (e) {
      console.error("handleLinkClick error", e);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* ── Chat Window ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-5 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-border bg-card overflow-hidden"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
            <img src={aichatbotSakura} alt="SAKURA AI" className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <p className="font-semibold text-sm leading-none">SAKURA AI</p>
              <p className="text-xs opacity-75 mt-0.5">AI Search Assistant</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors ml-2 text-lg leading-none"
              aria-label="Tutup chatbot"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} navigate={navigate} onLinkClick={handleLinkClick} />
            ))}
            {loading && (
              <div className="flex justify-start mb-2">
                <img src={aichatbotSakura} alt="SAKURA AI" className="w-7 h-7 rounded-full mr-2 flex-shrink-0 self-end" />
                <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-2xl rounded-bl-sm text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce [animation-delay:0ms]">●</span>
                    <span className="animate-bounce [animation-delay:150ms]">●</span>
                    <span className="animate-bounce [animation-delay:300ms]">●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-border bg-background flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan sesuatu tentang dokumen…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 max-h-28 overflow-y-auto"
              style={{ lineHeight: "1.4" }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Kirim pesan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-45">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-primary/30"
        aria-label="Buka SAKURA AI Assistant"
        title="SAKURA AI Search Assistant"
      >
        <img src={aichatbotSakura} alt="SAKURA AI" className="w-14 h-14 rounded-full object-cover" />
      </button>
    </>
  );
}
