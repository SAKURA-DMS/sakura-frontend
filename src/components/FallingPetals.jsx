import { useEffect, useRef } from "react";

const FLOWERS = [
  { x: 10, y: 37 }, { x: 15, y: 31 }, { x: 20, y: 26 },
  { x: 26, y: 22 }, { x: 31, y: 18 }, { x: 37, y: 15 },
  { x: 43, y: 13 }, { x: 49, y: 14 }, { x: 55, y: 17 },
  { x: 60, y: 21 }, { x: 35, y: 43 }, { x: 41, y: 50 },
  { x: 47, y: 56 },
];

const COLORS = [
  [255, 183, 197], [255, 158, 186], [255, 200, 213],
  [255, 173, 192], [255, 208, 220], [255, 144, 175],
];

function makePetal(ox, oy) {
  const f = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
  const xPct = (ox ?? f.x) + (Math.random() - 0.5) * 3;
  const yPct = (oy ?? f.y) + (Math.random() - 0.5) * 2;
  return {
    xPct,
    yPct,
    x: 0,
    y: 0,
    size: 8 + Math.random() * 12,
    speed: 0.4 + Math.random() * 0.5,
    swayAmp: 30 + Math.random() * 60,
    swayFreq: 0.005 + Math.random() * 0.008,
    rot: 0,
    rotSpeed: 1 + Math.random() * 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 0.5 + Math.random() * 0.4,
    age: 0,
    life: 500 + Math.random() * 500,
    phase: Math.random() * Math.PI * 2,
    needsInit: true,
  };
}

export default function FallingPetals() {
  const canvasRef = useRef(null);
  const petalsRef = useRef([]);
  const rafRef = useRef(null);
  const spawnTimerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    function drawPetal(x, y, size, rot, color, opacity) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      const h = size * 1.3;
      const w = size;
      ctx.moveTo(0, -h / 2);
      ctx.bezierCurveTo(w / 2, -h / 3, w / 2, h / 3, 0, h / 2);
      ctx.bezierCurveTo(-w / 2, h / 3, -w / 2, -h / 3, 0, -h / 2);
      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + 2);
      ctx.lineTo(0, h / 2 - 2);
      ctx.strokeStyle = `rgba(255,255,255,0.3)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    // Animation loop
    function animate() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const petals = petalsRef.current;
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];

        if (p.needsInit) {
          p.x = (p.xPct / 100) * w;
          p.y = (p.yPct / 100) * h;
          p.needsInit = false;
        }

        p.age++;
        p.y += p.speed;
        p.x += Math.sin(p.age * p.swayFreq + p.phase) * 0.8;
        p.rot += p.rotSpeed;

        let alpha = p.opacity;
        const fadeStart = p.life * 0.75;
        if (p.age > fadeStart) {
          alpha *= 1 - (p.age - fadeStart) / (p.life * 0.25);
        }

        if (p.age > p.life || alpha <= 0) {
          petals.splice(i, 1);
          continue;
        }

        drawPetal(p.x, p.y, p.size, p.rot, p.color, Math.max(0, alpha));
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    for (let i = 0; i < 30; i++) {
      const p = makePetal();
      p.age = Math.floor(Math.random() * 300); 
      petalsRef.current.push(p);
    }

    spawnTimerRef.current = setInterval(() => {
      if (petalsRef.current.length < 150) {
        petalsRef.current.push(makePetal());
      }
    }, 380);

    const onBurst = (e) => {
      const { x, y } = e.detail;
      for (let i = 0; i < 20; i++) {
        const p = makePetal(x, y);
        p.speed = 0.5 + Math.random() * 0.8;
        p.opacity = 0.7 + Math.random() * 0.3;
        petalsRef.current.push(p);
      }
    };
    window.addEventListener("sakuraBurst", onBurst);

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("sakuraBurst", onBurst);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 40,
      }}
      aria-hidden="true"
    />
  );
}
