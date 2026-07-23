import { useState, useMemo, useCallback } from "react";

/* Flower positions */
export const FLOWER_NODES = [
  { cx: 210, cy: 310, size: 78, rot: -10, section: "about", label: "Apa itu SAKURA?" },
  { cx: 370, cy: 225, size: 76, rot: 15, section: "why", label: "Arsip Digital" },
  { cx: 500, cy: 140, size: 78, rot: -5, section: "workflow", label: "Alur Persetujuan" },
  { cx: 505, cy: 460, size: 76, rot: -15, section: "school", label: "SMP Negeri 4" },
  { cx: 150, cy: 370, size: 44, rot: 12, section: null, label: null },
  { cx: 290, cy: 280, size: 46, rot: 25, section: null, label: null },
  { cx: 435, cy: 185, size: 44, rot: -18, section: null, label: null },
  { cx: 575, cy: 115, size: 42, rot: 8, section: null, label: null },
  { cx: 640, cy: 235, size: 48, rot: -20, section: null, label: null },
  { cx: 720, cy: 145, size: 42, rot: 5, section: null, label: null },
  { cx: 440, cy: 400, size: 44, rot: -8, section: null, label: null },
  { cx: 575, cy: 475, size: 42, rot: 10, section: null, label: null },
];

const BUD_POSITIONS = [
  { cx: 180, cy: 340, size: 9, rot: -20 },
  { cx: 330, cy: 250, size: 10, rot: 15 },
  { cx: 465, cy: 160, size: 8, rot: -10 },
  { cx: 600, cy: 190, size: 9, rot: 25 },
  { cx: 695, cy: 148, size: 8, rot: -15 },
  { cx: 470, cy: 430, size: 9, rot: 10 },
];

function scrollToSection(id) {
  const el = document.getElementById(`section-${id}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const STAMEN_TIPS = [
  [50, 33], [60, 35], [65, 45], [63, 57], [55, 65],
  [45, 65], [37, 57], [35, 45], [40, 35],
];

function renderFlower(node, hoveredId, setHoveredId, onFlowerClick) {
  const { cx, cy, size, rot, section, label } = node;
  const isInteractive = !!section;
  const isHovered = hoveredId === section;
  const scale = isHovered ? 1.15 : 1;
  const uid = `fl-${cx}-${cy}`;
  const svgSize = size;

  const handleClick = (e) => {
    if (onFlowerClick) onFlowerClick(e);
    if (isInteractive) scrollToSection(section);
  };

  return (
    <g
      key={uid}
      className={isInteractive ? "sakura-flower-interactive" : ""}
      style={{
        cursor: "pointer",
        transform: `translate(${cx - svgSize / 2}px, ${cy - svgSize / 2}px) scale(${scale})`,
        transformOrigin: `${svgSize / 2}px ${svgSize / 2}px`,
        transition: "transform 0.3s ease",
        opacity: isInteractive ? 1 : 0.85,
      }}
      onClick={handleClick}
      onMouseEnter={isInteractive ? () => setHoveredId(section) : undefined}
      onMouseLeave={isInteractive ? () => setHoveredId(null) : undefined}
    >
      <svg
        viewBox="0 0 100 100"
        width={svgSize}
        height={svgSize}
        overflow="visible"
        style={{ transform: `rotate(${rot}deg)` }}
      >
        <defs>
          <radialGradient id={`pg-${uid}`} cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FFB7C5" />
            <stop offset="100%" stopColor="#E8607A" />
          </radialGradient>
          <radialGradient id={`cg-${uid}`} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="100%" stopColor="#FFA500" />
          </radialGradient>
        </defs>

        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle}, 50, 50)`}>
            <path
              d="M50,50 C38,38 30,20 50,10 C70,20 62,38 50,50Z"
              fill={`url(#pg-${uid})`}
              opacity="0.95"
            />
            <path
              d="M50,50 C50,35 50,22 50,10"
              stroke="white"
              strokeWidth="0.8"
              opacity="0.4"
              fill="none"
            />
          </g>
        ))}

        <circle cx="50" cy="50" r="9" fill={`url(#cg-${uid})`} />

        <g stroke="#C23A57" strokeWidth="1.2" opacity="0.7">
          {STAMEN_TIPS.map(([tx, ty], i) => (
            <line key={i} x1="50" y1="50" x2={tx} y2={ty} />
          ))}
        </g>

        {STAMEN_TIPS.map(([tx, ty], i) => (
          <circle key={`t${i}`} cx={tx} cy={ty} r="2" fill="#FFD700" opacity="0.9" />
        ))}
      </svg>

      {isInteractive && label && (
        <foreignObject
          x={0} y={-32}
          width="1" height="1"
          overflow="visible"
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div
            className="sakura-flower-label"
            style={{
              position: "absolute",
              left: "50%",
              bottom: "0",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "#C23A57",
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "20px",
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(194, 58, 87, 0.2)",
              whiteSpace: "nowrap",
              opacity: isHovered ? 1 : 0,
              transition: "opacity 0.2s ease",
              pointerEvents: "none",
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function renderBud(bud) {
  const { cx, cy, size, rot } = bud;
  return (
    <g key={`bud-${cx}-${cy}`} transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={size * 0.5} ry={size} fill="#FF85A1" opacity="0.75" />
      <ellipse cx={cx + 1} cy={cy - 1} rx={size * 0.35} ry={size * 0.75} fill="#FFB7C5" opacity="0.6" />
    </g>
  );
}

const branchDrawStyle = (delay = 0) => ({
  strokeDasharray: 1200,
  strokeDashoffset: 1200,
  opacity: 0,
  animation: `branchDraw 2.5s ease-out forwards`,
  animationDelay: `${delay}s`,
});

export default function SakuraBranch({ onFlowerClick }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMinYMin slice"
      style={{ zIndex: 2, overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="branchMain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D1C02" />
          <stop offset="30%" stopColor="#7B4A2D" />
          <stop offset="50%" stopColor="#8B5E3C" />
          <stop offset="70%" stopColor="#7B4A2D" />
          <stop offset="100%" stopColor="#3D1C02" />
        </linearGradient>
        <linearGradient id="branchSub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A2810" />
          <stop offset="40%" stopColor="#8B5E3C" />
          <stop offset="60%" stopColor="#8B5E3C" />
          <stop offset="100%" stopColor="#4A2810" />
        </linearGradient>
        <linearGradient id="branchTwig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C3A1E" />
          <stop offset="50%" stopColor="#9B7653" />
          <stop offset="100%" stopColor="#5C3A1E" />
        </linearGradient>
      </defs>

      {/* MAIN TRUNK */}
      <path
        d="M -60 420 C 40 400, 120 370, 200 340 C 280 310, 360 290, 440 270 C 520 250, 580 240, 650 235"
        fill="none" stroke="url(#branchMain)" strokeWidth="22" strokeLinecap="round"
        style={branchDrawStyle(0)}
      />
      <path
        d="M -60 420 C 20 405, 80 385, 160 360"
        fill="none" stroke="url(#branchMain)" strokeWidth="28" strokeLinecap="round" opacity="0.7"
        style={branchDrawStyle(0.15)}
      />

      {/* SUB-BRANCHES */}
      <path d="M 280 325 C 310 290, 340 250, 380 210 C 410 180, 440 160, 480 145" fill="none" stroke="url(#branchSub)" strokeWidth="12" strokeLinecap="round" style={branchDrawStyle(0.3)} />
      <path d="M 440 270 C 480 250, 520 230, 560 200 C 590 180, 620 165, 660 155" fill="none" stroke="url(#branchSub)" strokeWidth="10" strokeLinecap="round" style={branchDrawStyle(0.4)} />
      <path d="M 360 300 C 390 330, 420 360, 450 400 C 470 425, 490 445, 520 460" fill="none" stroke="url(#branchSub)" strokeWidth="11" strokeLinecap="round" style={branchDrawStyle(0.45)} />
      <path d="M 550 245 C 580 220, 610 195, 650 175" fill="none" stroke="url(#branchSub)" strokeWidth="8" strokeLinecap="round" style={branchDrawStyle(0.5)} />

      {/* TWIGS */}
      <path d="M 200 345 C 210 320, 225 300, 245 280" fill="none" stroke="url(#branchTwig)" strokeWidth="5" strokeLinecap="round" style={branchDrawStyle(0.55)} />
      <path d="M 320 305 C 330 280, 345 260, 365 245" fill="none" stroke="url(#branchTwig)" strokeWidth="4" strokeLinecap="round" style={branchDrawStyle(0.6)} />
      <path d="M 480 145 C 500 130, 520 120, 545 115" fill="none" stroke="url(#branchTwig)" strokeWidth="4" strokeLinecap="round" style={branchDrawStyle(0.65)} />
      <path d="M 520 460 C 540 470, 555 475, 575 478" fill="none" stroke="url(#branchTwig)" strokeWidth="4" strokeLinecap="round" style={branchDrawStyle(0.7)} />
      <path d="M 650 155 C 670 145, 690 138, 710 135" fill="none" stroke="url(#branchTwig)" strokeWidth="3.5" strokeLinecap="round" style={branchDrawStyle(0.75)} />
      <path d="M 650 235 C 670 230, 695 228, 720 230" fill="none" stroke="url(#branchTwig)" strokeWidth="5" strokeLinecap="round" style={branchDrawStyle(0.8)} />
      <path d="M 150 370 C 155 350, 165 335, 180 320" fill="none" stroke="url(#branchTwig)" strokeWidth="4" strokeLinecap="round" style={branchDrawStyle(0.85)} />
      <path d="M 600 210 C 615 195, 630 185, 650 178" fill="none" stroke="url(#branchTwig)" strokeWidth="3" strokeLinecap="round" style={branchDrawStyle(0.9)} />

      {BUD_POSITIONS.map((bud) => renderBud(bud))}

      {FLOWER_NODES.map((node) => renderFlower(node, hoveredId, setHoveredId, onFlowerClick))}
    </svg>
  );
}

/* FloatingParticles */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export function FloatingParticles({ count = 30 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${rand(0, 100)}%`,
      top: `${rand(0, 100)}%`,
      size: rand(2, 4),
      duration: `${rand(6, 14)}s`,
      delay: `${rand(0, 8)}s`,
      opacity: rand(0.15, 0.35),
    })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }} aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: "#FFB7C5",
            opacity: p.opacity,
            animation: `particleFloat ${p.duration} ${p.delay} ease-in-out infinite`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

/* PetalBurst */
const BURST_COLORS = ["#FFB7C5", "#FF9EB5", "#FFC8D5", "#FFD6E0"];

function PetalSVG({ color, size }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 18 24" fill="none">
      <path
        d="M 9 0 C 15 0 18 6 18 12 C 18 18 14 24 9 24 C 4 24 0 18 0 12 C 0 6 3 0 9 0 Z"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
}

export function usePetalBurst() {
  const [petals, setPetals] = useState([]);

  const triggerBurst = useCallback((e) => {
    e.stopPropagation();
    const x = e.clientX;
    const y = e.clientY;
    const burstId = Date.now() + Math.random();
    const newPetals = Array.from({ length: 15 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      return {
        id: burstId + i,
        x,
        y,
        burstX: Math.cos(angle),
        burstY: Math.sin(angle),
        duration: 5 + Math.random() * 4,
        size: 10 + Math.random() * 10,
        color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
        sway: (Math.random() - 0.5) * 120,
        delay: Math.random() * 0.3,
        spin: 360 + Math.random() * 360,
      };
    });
    setPetals((prev) => [...prev, ...newPetals]);
    setTimeout(() => {
      setPetals((prev) => prev.filter((p) => !newPetals.find((np) => np.id === p.id)));
    }, 10000);
  }, []);

  return { petals, triggerBurst };
}

export function PetalBurstOverlay({ petals }) {
  if (petals.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10000, overflow: "hidden" }}
      aria-hidden="true"
    >
      {petals.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            animationName: "petalBurst",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            animationFillMode: "forwards",
            "--burst-x": p.burstX,
            "--burst-y": p.burstY,
            "--sway": p.sway,
            "--spin": `${p.spin}deg`,
            opacity: 0,
          }}
        >
          <PetalSVG color={p.color} size={p.size} />
        </div>
      ))}
    </div>
  );
}