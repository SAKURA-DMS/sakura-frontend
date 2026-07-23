import { useState, useRef, useCallback, useEffect } from "react";

export default function CropOverlay({ imageUrl, cropArea, onChange }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const getRelativePos = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const startRef = useRef({ pos: { x: 0, y: 0 }, crop: { x: 0, y: 0, w: 0, h: 0 } });

  const handlePointerDown = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getRelativePos(e);
    startRef.current = { pos, crop: { ...cropArea } };
    setDragging(type);
  }, [cropArea, getRelativePos]);

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    const dx = pos.x - startRef.current.pos.x;
    const dy = pos.y - startRef.current.pos.y;
    const c = startRef.current.crop;
    let next = { ...c };

    if (dragging === "move") {
      next.x = clamp(c.x + dx, 0, 100 - c.w);
      next.y = clamp(c.y + dy, 0, 100 - c.h);
    } else if (dragging === "se") {
      next.w = clamp(c.w + dx, 10, 100 - c.x);
      next.h = clamp(c.h + dy, 10, 100 - c.y);
    } else if (dragging === "sw") {
      const newW = clamp(c.w - dx, 10, c.x + c.w);
      next.x = c.x + c.w - newW;
      next.w = newW;
      next.h = clamp(c.h + dy, 10, 100 - c.y);
    } else if (dragging === "ne") {
      next.w = clamp(c.w + dx, 10, 100 - c.x);
      const newH = clamp(c.h - dy, 10, c.y + c.h);
      next.y = c.y + c.h - newH;
      next.h = newH;
    } else if (dragging === "nw") {
      const newW = clamp(c.w - dx, 10, c.x + c.w);
      const newH = clamp(c.h - dy, 10, c.y + c.h);
      next.x = c.x + c.w - newW;
      next.y = c.y + c.h - newH;
      next.w = newW;
      next.h = newH;
    } else if (dragging === "n") {
      const newH = clamp(c.h - dy, 10, c.y + c.h);
      next.y = c.y + c.h - newH;
      next.h = newH;
    } else if (dragging === "s") {
      next.h = clamp(c.h + dy, 10, 100 - c.y);
    } else if (dragging === "e") {
      next.w = clamp(c.w + dx, 10, 100 - c.x);
    } else if (dragging === "w") {
      const newW = clamp(c.w - dx, 10, c.x + c.w);
      next.x = c.x + c.w - newW;
      next.w = newW;
    }

    onChange(next);
  }, [dragging, getRelativePos, onChange]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const cornerCls = "absolute z-30 bg-primary border-2 border-primary-foreground rounded-full shadow-lg";
  const cornerSize = 14;
  const offset = -cornerSize / 2;

  return (
    <div
      ref={containerRef}
      className="relative select-none touch-none bg-muted/30 flex items-center justify-center"
      style={{ maxHeight: "55vh", overflow: "hidden" }}
    >
      <img
        src={imageUrl}
        alt="Pratinjau potong"
        className="block max-w-full max-h-[55vh] object-contain"
        draggable={false}
        onLoad={() => setImgLoaded(true)}
      />

      {imgLoaded && (
        <div className="absolute inset-0">
          {/* Dark overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
            <div className="absolute bg-foreground/50" style={{ top: 0, left: 0, right: 0, height: `${cropArea.y}%` }} />
            <div className="absolute bg-foreground/50" style={{ bottom: 0, left: 0, right: 0, height: `${Math.max(0, 100 - cropArea.y - cropArea.h)}%` }} />
            <div className="absolute bg-foreground/50" style={{ top: `${cropArea.y}%`, left: 0, width: `${cropArea.x}%`, height: `${cropArea.h}%` }} />
            <div className="absolute bg-foreground/50" style={{ top: `${cropArea.y}%`, right: 0, width: `${Math.max(0, 100 - cropArea.x - cropArea.w)}%`, height: `${cropArea.h}%` }} />
          </div>

          {/* Crop box */}
          <div
            className="absolute border-2 border-primary cursor-move"
            style={{
              left: `${cropArea.x}%`, top: `${cropArea.y}%`,
              width: `${cropArea.w}%`, height: `${cropArea.h}%`,
              zIndex: 10,
            }}
            onMouseDown={(e) => handlePointerDown(e, "move")}
            onTouchStart={(e) => handlePointerDown(e, "move")}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-primary-foreground/30" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-primary-foreground/30" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-primary-foreground/30" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-primary-foreground/30" />
            </div>
          </div>

          {/* Corner handles */}
          {[
            { type: "nw", left: cropArea.x, top: cropArea.y, cursor: "nw-resize" },
            { type: "ne", left: cropArea.x + cropArea.w, top: cropArea.y, cursor: "ne-resize" },
            { type: "sw", left: cropArea.x, top: cropArea.y + cropArea.h, cursor: "sw-resize" },
            { type: "se", left: cropArea.x + cropArea.w, top: cropArea.y + cropArea.h, cursor: "se-resize" },
          ].map(({ type, left, top, cursor }) => (
            <div
              key={type}
              className={cornerCls}
              style={{
                left: `calc(${left}% + ${offset}px)`,
                top: `calc(${top}% + ${offset}px)`,
                width: cornerSize, height: cornerSize, cursor, zIndex: 20,
              }}
              onMouseDown={(e) => handlePointerDown(e, type)}
              onTouchStart={(e) => handlePointerDown(e, type)}
            />
          ))}

          {/* Edge handles */}
          {[
            { type: "n", left: `${cropArea.x + cropArea.w / 2}%`, top: `${cropArea.y}%`, cursor: "n-resize", w: 24, h: 6 },
            { type: "s", left: `${cropArea.x + cropArea.w / 2}%`, top: `${cropArea.y + cropArea.h}%`, cursor: "s-resize", w: 24, h: 6 },
            { type: "w", left: `${cropArea.x}%`, top: `${cropArea.y + cropArea.h / 2}%`, cursor: "w-resize", w: 6, h: 24 },
            { type: "e", left: `${cropArea.x + cropArea.w}%`, top: `${cropArea.y + cropArea.h / 2}%`, cursor: "e-resize", w: 6, h: 24 },
          ].map(({ type, left, top, cursor, w, h }) => (
            <div
              key={type}
              className="absolute bg-primary rounded-full shadow-md"
              style={{
                left: `calc(${left} - ${w / 2}px)`,
                top: `calc(${top} - ${h / 2}px)`,
                width: w, height: h, cursor, zIndex: 20,
              }}
              onMouseDown={(e) => handlePointerDown(e, type)}
              onTouchStart={(e) => handlePointerDown(e, type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
