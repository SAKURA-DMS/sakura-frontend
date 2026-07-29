import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Send, Search, ChartNoAxesColumnIncreasing, CircleHelp, Ellipsis, User, Upload } from "lucide-react";
import { sendChatMessage } from "@/services/chatbotService";
import { useApp } from "@/contexts/AppContext";
import * as documentService from "@/services/documentService";
import profileLogo from "@/assets/logo_sakura.png";
import chatbotGif from "@/assets/aichatbot_sakura.gif";
import chatbotPoster from "@/assets/sakura_chatbot_poster.png";
import sakuraBranch from "@/assets/sakura_branch.png";
import sakuraAlt from "@/assets/sakura_1.png";

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

function SakuraAvatar({ size = 44, className = "", interactive = false, src }) {
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
      <img
        src={src || profileLogo}
        alt="SAKURA AI"
        className="sakura-avatar-img relative w-full h-full rounded-full object-cover border-2 border-white/80 shadow-md"
        style={{ transition: "transform 300ms ease" }}
      />
    </div>
  );
}

function extractMessage(res) {
  if (!res) return "Maaf, sistem sedang sibuk.";
  if (typeof res === "string") return res;
  return (
    res.text ||
    res.answer ||
    res.reply ||
    res.message ||
    "Maaf, sistem sedang sibuk."
  );
}

function formatTime(date) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function MessageBubble({ msg, navigate, onLinkClick }) {
  const isUser = msg.role === "user";
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

  const links = Array.isArray(msg.links) ? msg.links : findLinksFromText(msg.text || "");
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
          {/* Quick link buttons */}
          {!isUser && !msg.isError && links.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {links.map((l, idx) => (
                <button
                  key={`${l.path}-${idx}`}
                  onClick={() =>
                    onLinkClick
                      ? onLinkClick(l)
                      : navigate(l.path)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />

                  <span>
                    {l.label}
                  </span>
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
  const [inputFocused, setInputFocused] = useState(false);

  const buttonRef = useRef(null);
  const [buttonPos, setButtonPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ dragging: false, moved: false });
  const DRAG_THRESHOLD_PX = 4;
  const EDGE_MARGIN_PX = 16; 

  // Measure the header's real rendered height so the "minimize" collapse
  // animates to an exact pixel value instead of "auto" (which can't be
  // animated smoothly and previously left the panel looking not fully
  // collapsed).
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const PANEL_HEIGHT = 520;

  // Only the X (close) button should wipe the conversation; minimizing,
  // or closing by tapping the floating avatar again, must keep history.
  const shouldResetChatRef = useRef(false);

  function clampToViewport(left, top, width, height) {
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop),
    };
  }

  function computeSnapPosition(left, top, width, height) {
    const { top: clampedTop } = clampToViewport(left, top, width, height);
    const viewportWidth = window.innerWidth;

    const distanceLeft = left;
    const distanceRight = viewportWidth - (left + width);

    let snappedLeft =
      distanceLeft <= distanceRight
        ? EDGE_MARGIN_PX
        : viewportWidth - width - EDGE_MARGIN_PX;

    snappedLeft = Math.min(Math.max(0, snappedLeft), Math.max(0, viewportWidth - width));
    return { left: snappedLeft, top: clampedTop };
  }

  function handleButtonPointerDown(e) {
    const btn = buttonRef.current;
    if (!btn) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    btn.setPointerCapture?.(e.pointerId);

    const rect = btn.getBoundingClientRect();
    dragStateRef.current = {
      dragging: true,
      moved: false,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function handleButtonPointerMove(e) {
    const state = dragStateRef.current;
    if (!state.dragging) return;

    const dxFromStart = e.clientX - state.startClientX;
    const dyFromStart = e.clientY - state.startClientY;

    if (!state.moved) {
      if (Math.abs(dxFromStart) < DRAG_THRESHOLD_PX && Math.abs(dyFromStart) < DRAG_THRESHOLD_PX) return;
      state.moved = true;
      setIsDragging(true);
    }

    // Drive position purely through React state (instead of mutating
    // btn.style directly) so the value used to compute the snap target on
    // release is always exactly what's on screen — no DOM/state desync,
    // which is what caused snap-to-edge to only work on the very first drag.
    const rawLeft = state.startLeft + dxFromStart;
    const rawTop = state.startTop + dyFromStart;
    const { left, top } = clampToViewport(rawLeft, rawTop, state.width, state.height);
    setButtonPos({ left, top });
  }

  function finishDrag(e) {
    const state = dragStateRef.current;
    if (!state.dragging) return;
    const btn = buttonRef.current;
    btn?.releasePointerCapture?.(e.pointerId);

    const wasMoved = state.moved;
    const { width, height, startLeft, startTop } = state;
    dragStateRef.current = { dragging: false, moved: false };
    setIsDragging(false);

    if (wasMoved) {
      setButtonPos((prev) => {
        const base = prev || { left: startLeft, top: startTop };
        return computeSnapPosition(base.left, base.top, width, height);
      });
    } else {
      setIsOpen((v) => !v);
    }
  }

  function handleButtonPointerUp(e) {
    finishDrag(e);
  }

  function handleButtonPointerCancel(e) {
    dragStateRef.current = { dragging: false, moved: false };
    setIsDragging(false);
  }

  useEffect(() => {
    function handleResize() {
      const btn = buttonRef.current;
      if (!btn || buttonPos === null) return;
      const rect = btn.getBoundingClientRect();
      const snapped = computeSnapPosition(rect.left, rect.top, rect.width, rect.height);
      setButtonPos(snapped);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [buttonPos]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [isOpen]);

  if (!isLoggedIn) return null;

  async function sendText(text) {
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text, time: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role,
          content: msg.text || "",
          links: Array.isArray(msg.links) ? msg.links : [],
        }));

      const res = await sendChatMessage(text, history);
      const answer = extractMessage(res);
      const links = res.links || res.link || [];
      setMessages((prev) => [...prev, { role: "assistant", text: answer, links, time: new Date() }]);
    } catch (err) {
      const serverMsg =
        err?.response?.data?.error || err?.message || "Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ ${serverMsg}`,
          isError: true,
          time: new Date(),
        },
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

    if (action.key === "cari") {
      const prefix = "Cari dokumen: ";
      setInput(prefix);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange?.(prefix.length, prefix.length);
      });
      return;
    }

    sendText(action.prompt);
  }

  async function handleLinkClick(link) {
    try {
      if (!link || !link.path) return;
      if (link.path.startsWith("/documents/")) {
        const parts = link.path.split("/");
        const id = parts[parts.length - 1];
        if (!id) return;
        setMessages((prev) => [...prev, { role: "assistant", text: `Memuat dokumen ${id}...`, time: new Date() }]);
        try {
          const { document } = await documentService.getDocument(id);
          setMessages((prev) => {
            const copy = prev.slice(0, -1);
            return [...copy, { role: "assistant", text: `Detail dokumen: ${document.judul || document.nomor || ''}`, doc: { id: document.id, judul: document.judul, nomor: document.nomor_dokumen || document.nomor, status: document.status }, time: new Date() }];
          });
        } catch (e) {
          setMessages((prev) => [...prev, { role: "assistant", text: `Gagal memuat dokumen: ${e.message || e}`, time: new Date() }]);
        }
        return;
      }

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

  function openChat() {
    setIsOpen(true);
    setIsMinimized(false);
  }

  // "X" fully closes the widget AND clears the conversation (fresh start
  // next time it's opened). Minimizing, or toggling closed via the
  // floating avatar, must NOT clear anything.
  function closeAndResetHistory() {
    shouldResetChatRef.current = true;
    setIsOpen(false);
  }

  // Reset transient UI state only after the close animation has fully
  // finished, so the panel never reopens with a stale isMinimized/showMore
  // state (which previously caused the header to render at the wrong
  // height/position and look "duplicated" right after reopening).
  function handlePanelExitComplete() {
    setIsMinimized(false);
    setShowMore(false);
    if (shouldResetChatRef.current) {
      setMessages([{ ...welcomeMessage, time: new Date() }]);
      shouldResetChatRef.current = false;
    }
  }

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence mode="wait" onExitComplete={handlePanelExitComplete}>
        {isOpen && (
            <motion.div
            key="sakura-chatbot-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96, height: PANEL_HEIGHT }}
            animate={{ opacity: 1, y: 0, scale: 1, height: isMinimized ? headerHeight : PANEL_HEIGHT }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
              className={`fixed bottom-24 right-5 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl ring-1 ring-black/5 border border-secondary bg-card overflow-hidden`}
            style={{ maxHeight: "80vh" }}
          >
            {/* Header */}
            <div ref={headerRef} className="relative flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0 overflow-hidden text-primary-foreground">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${sakuraBranch})`,
                  backgroundSize: "cover",
                  backgroundPosition: "right center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/60" />

              <SakuraAvatar size={40} className="relative z-10" interactive src={sakuraAlt} />

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
                  title={isMinimized ? "Perbesar" : "Kecilkan"}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={closeAndResetHistory}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground/85 hover:text-primary-foreground hover:bg-white/15 transition-colors"
                  aria-label="Tutup chatbot"
                  title="Tutup"
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
                        title="Lainnya"
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

                {/* Input */}
                <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0 bg-background">
                  <div className={`flex-1 flex items-center gap-2 rounded-full bg-card px-3.5 py-2 transition-shadow ${inputFocused ? 'border-transparent' : 'border border-input'}`}>
                      <span className="text-base leading-none flex-shrink-0" aria-hidden="true">🌸</span>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tanyakan sesuatu tentang dokumen…"
                        disabled={loading}
                        rows={1}
                        className="flex-1 min-w-0 resize-none bg-transparent text-sm focus:outline-none disabled:opacity-50 max-h-36 overflow-auto"
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        onInput={(e) => {
                          const ta = e.target;
                          ta.style.height = "auto";
                          ta.style.height = Math.min(ta.scrollHeight, 144) + "px";
                        }}
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

      {/* Floating Button */}
      <motion.button
        ref={buttonRef}
        onPointerDown={handleButtonPointerDown}
        onPointerMove={handleButtonPointerMove}
        onPointerUp={handleButtonPointerUp}
        onPointerCancel={handleButtonPointerCancel}
        className={`sakura-avatar-group group fixed ${buttonPos === null ? "bottom-5 right-5" : ""} z-50 w-16 h-16 rounded-full shadow-xl ring-1 ring-black/5 flex items-center justify-center transition-[transform,box-shadow] duration-300 ease-out hover:scale-105 focus:outline-none ${isOpen ? "opacity-80 scale-95" : ""}`}
        style={{
          touchAction: "none",
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging
            ? "none"
            : "left 260ms cubic-bezier(0.22, 1, 0.36, 1), top 260ms cubic-bezier(0.22, 1, 0.36, 1), transform 300ms ease-out, box-shadow 300ms ease-out",
          ...(buttonPos !== null
            ? { left: buttonPos.left, top: buttonPos.top, right: "auto", bottom: "auto" }
            : {}),
        }}
        aria-label="Buka SAKURA AI Assistant (bisa digeser bebas dengan mouse atau sentuhan)"
        title="SAKURA AI Search Assistant"
      >
        <PetalRing scale={1.3} />
        <div className="sakura-avatar-glow absolute inset-0 rounded-full" style={{ transition: "box-shadow 300ms ease" }} />

        {/* Poster statis */}
        <img
          src={chatbotPoster}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="sakura-avatar-img absolute inset-0 w-full h-full rounded-full object-cover border-2 border-white shadow-lg opacity-100 group-hover:opacity-0 transition-opacity duration-200"
          style={{ transition: "opacity 200ms ease, transform 300ms ease" }}
        />
        {/* GIF animasi */}
        <img
          src={chatbotGif}
          alt="SAKURA AI"
          draggable={false}
          className="sakura-avatar-img absolute inset-0 w-full h-full rounded-full object-cover border-2 border-white shadow-lg opacity-0 group-hover:opacity-100"
          style={{ transition: "opacity 200ms ease, transform 300ms ease" }}
        />
      </motion.button>
    </>
  );
}