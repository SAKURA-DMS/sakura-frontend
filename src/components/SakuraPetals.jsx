import { useMemo } from "react";

const PETAL_COLORS = [
  "hsl(340 65% 82%)",
  "hsl(345 55% 78%)",
  "hsl(335 50% 85%)",
  "hsl(350 60% 80%)",
  "hsl(330 45% 83%)",
  "hsl(338 58% 76%)",
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * @param {number} count
 * @param {Array<{x:number, y:number}>} [blossomPositions] 
 */
export default function SakuraPetals({ count = 14, blossomPositions }) {
  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const hasPositions = blossomPositions && blossomPositions.length > 0;
      const blossom = hasPositions
        ? blossomPositions[i % blossomPositions.length]
        : null;

      const left = blossom
        ? `${blossom.x + randomBetween(-4, 4)}%`
        : `${randomBetween(0, 100)}%`;
      const top = blossom
        ? `${blossom.y + randomBetween(-2, 3)}%`
        : "-20px";

      return {
        id: i,
        left,
        top,
        size: randomBetween(5, 13),
        duration: `${randomBetween(9, 18)}s`,
        delay: `${randomBetween(0, 14)}s`,
        sway: `${randomBetween(-60, 60)}px`,
        rotation: `${randomBetween(180, 720)}deg`,
        color: PETAL_COLORS[i % PETAL_COLORS.length],
        opacity: randomBetween(0.2, 0.5),
        alt: i % 3 === 0,
      };
    });
  }, [count, blossomPositions]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {petals.map((p) => (
        <div
          key={p.id}
          className={p.alt ? "sakura-petal-alt" : "sakura-petal"}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size * 0.7}px`,
            borderRadius: "50% 0 50% 0",
            background: p.color,
            opacity: p.opacity,
            "--duration": p.duration,
            "--delay": p.delay,
            "--sway": p.sway,
            "--rotation": p.rotation,
          }}
        />
      ))}
    </div>
  );
}
