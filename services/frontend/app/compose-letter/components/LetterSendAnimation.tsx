import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, useMotionValueEvent, useSpring } from "framer-motion";

interface LetterSendAnimationProps {
  show: boolean;
  onAnimationComplete: () => void;
  embedded?: boolean;
  onCancel?: () => void;
  imageSrc?: string | null;
  onSendWithImage?: (imageSrc: string | null) => Promise<void>;
}

export default function LetterSendAnimation({ show, onAnimationComplete, embedded = false, onCancel, imageSrc = null, onSendWithImage }: LetterSendAnimationProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const topCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const midCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bottomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const initialYRef = useRef(0);

  // configurable fold sensitivity: smaller value = less movement required to fold
  const FOLD_RANGE = 60; // px
  const FOLD_THRESHOLD = Math.round(FOLD_RANGE * 0.85);

  const yDrag = useMotionValue(0);
  const [isFolded, setIsFolded] = useState(false);
  const [sliceHeights, setSliceHeights] = useState<number[]>([0, 0, 0]);
  const [gridRows, setGridRows] = useState<string>("1fr 1fr 1fr");
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const pointerDownRef = useRef(false);
  const movedRef = useRef(false);
  const lastPointerYRef = useRef<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(true);
  const [progress, setProgress] = useState(50);

  // Compute wrapper sizing so the letter can fill most of the popup when not embedded.
  // When embedded (sidebar) keep a compact width; when used as a modal, occupy
  // most of the viewport while leaving room for padding/controls.
  // Use the same pixel aspect ratio as the export (816 x 1056) so the
  // captured JPEG and the animation render with the same proportions.
  const popupSizeStyle: React.CSSProperties = embedded
    ? { width: "min(80vw, 420px)", aspectRatio: "816/1056" }
    : {
        // Use a centered aspect-ratio box that fills the DialogContent but
        // preserves the US-letter aspect ratio used for exports (816/1056).
        // compute aspect ratio in a way CSS understands — use calc() with a
        // numeric multiplier so the browser can compute the width correctly.
        width: `min(100%, calc(80vh * ${816 / 1056}))`,
        height: "min(100%, 90vh)",
        aspectRatio: "816/1056",
        display: "block",
        margin: "0 auto",
        maxWidth: "100%",
        maxHeight: "100%",
      };

  const foldProgress = useTransform(yDrag, (y) => Math.max(0, -y / FOLD_RANGE));

  // Two springs for direction-aware smoothing
  const smoothedFast = useSpring(foldProgress, { stiffness: 60, damping: 22, mass: 1.4 });
  const smoothedSlow = useSpring(foldProgress, { stiffness: 30, damping: 18, mass: 1 });

  const lastFoldMV = useMotionValue(foldProgress.get());
  const isFoldingMV = useMotionValue(0);

  useMotionValueEvent(foldProgress, "change", (v) => {
    const prev = lastFoldMV.get();
    isFoldingMV.set(v > prev ? 1 : 0);
    lastFoldMV.set(v);
  });

  const smoothedFold = useMotionValue<number>(smoothedFast.get());

  useEffect(() => {
    const unsubFast = smoothedFast.onChange((v) => {
      if (isFoldingMV.get() <= 0) smoothedFold.set(v as number);
    });
    const unsubSlow = smoothedSlow.onChange((v) => {
      if (isFoldingMV.get() > 0) smoothedFold.set(v as number);
    });
    const unsubDir = isFoldingMV.onChange((d) => {
      const val = d > 0 ? smoothedSlow.get() : smoothedFast.get();
      smoothedFold.set(val as number);
    });

    return () => {
      unsubFast();
      unsubSlow();
      unsubDir();
    };
  }, [smoothedFast, smoothedSlow, smoothedFold, isFoldingMV]);

  const centerScale = useTransform(smoothedFold, [0, 1], [1, 0.01]);
  const yTopSection = useTransform(smoothedFold, [0, 1], [0, 0]);
  const topYFromScale = useTransform(centerScale, (scale) => (sliceHeights[1] ? (1 - scale) * sliceHeights[1] / 2 : 0));
  const combinedTopY = useTransform([yTopSection, topYFromScale], ([y, ys]) => (y as number) + (ys as number));

  const maxFoldY = sliceHeights[1] || 0;
  const yBottomSection = useTransform(smoothedFold, [0, 1], [0, -maxFoldY * 0.4]);
  const bottomYFromScale = useTransform(centerScale, (scale) => (sliceHeights[1] ? sliceHeights[1] * (scale - 1) : 0));
  const bottomRotateX = useTransform(smoothedFold, [0, 1], [0, -90]);
  const bottomZIndex = useTransform(bottomRotateX, [0, -90], [0, -1]);
  const combinedBottomY = useTransform([bottomYFromScale, yBottomSection], ([ys, y]) => Math.min((ys as number) + (y as number), 0));

  useMotionValueEvent(yDrag, "change", (currentY) => {
    if (currentY <= -FOLD_THRESHOLD) {
      setIsFolded(true);
    } else {
      setIsFolded(false);
    }
  });

  // Wheel handler for when pointer is locked
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!isPointerLocked) return;
      try { e.preventDefault(); } catch (err) {}
      const cur = yDrag.get();
      const next = Math.max(-FOLD_RANGE, Math.min(0, cur + e.deltaY));
      yDrag.set(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, [isPointerLocked, yDrag]);

  const drawAllSlices = useCallback((img: HTMLImageElement) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const dstW = Math.max(1, Math.round(rect.width));
    const dstH = Math.max(1, Math.round(rect.height));

    const dst = sliceHeights; // Use the current sliceHeights

    const natH = img.naturalHeight;
    const natW = img.naturalWidth;
    const src = [Math.floor(natH / 3), Math.floor(natH / 3), Math.floor(natH / 3)];
    src[2] += natH - (src[0] + src[1] + src[2]);

    const canvases = [topCanvasRef.current, midCanvasRef.current, bottomCanvasRef.current];
    for (let i = 0; i < 3; i++) {
      const c = canvases[i];
      if (!c) continue;
      c.width = dstW;
      c.height = dst[i];
      c.style.width = "100%";
      c.style.height = "100%";
      const ctx = c.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, c.width, c.height);
      const srcY = src.slice(0, i).reduce((a, b) => a + b, 0);
      ctx.drawImage(img, 0, srcY, natW, src[i], 0, 0, dstW, dst[i]);
    }
  }, [sliceHeights]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new window.Image();
    const srcToUse = imageSrc || "";
    img.src = srcToUse;
    // Only set crossOrigin when loading from an external/url source.
    // Setting crossOrigin on data: URLs or local modules can cause failures.
    try {
      if (typeof srcToUse === 'string' && !srcToUse.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
    } catch (err) {
      // ignore
    }
    img.onload = () => {
      imgRef.current = img;
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const dstH = Math.max(1, Math.round(rect.height));
        const dst = [Math.floor(dstH / 3), Math.floor(dstH / 3) + 3, Math.floor(dstH / 3)];
        dst[2] += dstH - (dst[0] + dst[1] + dst[2]);
        setSliceHeights(dst);
        setGridRows(`${dst[0]}px ${dst[1]}px ${dst[2]}px`);
      }
    };
    img.onerror = (ev) => {
      console.warn('LetterSendAnimation: failed to load image', srcToUse, ev);
      imgRef.current = null;
    };
    return () => { imgRef.current = null; };
  }, [imageSrc]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    let ro: ResizeObserver | null = null;
    const remeasure = () => { if (imgRef.current) drawAllSlices(imgRef.current); };
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(remeasure);
      ro.observe(wrapperRef.current);
    } else {
      window.addEventListener("resize", remeasure);
    }
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", remeasure); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sliceHeights.every(h => h > 0) && imgRef.current) {
      const img = imgRef.current;
      setTimeout(() => {
        drawAllSlices(img);
        setShowProgress(false);
      }, 500);
    }
  }, [sliceHeights, drawAllSlices]);

  useEffect(() => {
    let start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const newProgress = 50 + (100 - 50) * Math.min(elapsed / 500, 1);
      setProgress(newProgress);
      if (elapsed < 500) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  if (!show) return null;

  const motionTransition = { duration: 0.12 };

  const content = (
    <motion.div
      animate={isFolded ? "folded" : "open"}
      variants={{ open: { scale: 1, transition: motionTransition }, folded: { scale: 0.9, transition: motionTransition } }}
      initial="open"
      transition={motionTransition}
      className="relative flex flex-col items-center w-full h-full"
    >
      {showProgress && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-64 bg-gray-200 rounded-full h-4">
            <div
              className="bg-pink-500 h-4 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      <motion.div
        animate={{ opacity: isFolded ? 0 : 1 }}
        transition={motionTransition}
        className={`mt-4 flex w-full justify-center ${embedded ? "text-base" : "text-xl"} font-semibold`}
      >
        <p className="rounded-2xl bg-white px-6 py-4 text-black select-none">Fold your letter by holding and dragging ↑↓</p>
      </motion.div>
      <motion.div className="relative p-0 flex-1 w-full h-full">
        <div ref={wrapperRef} className="overflow-hidden rounded-none shadow-none w-full h-full" style={{ ...popupSizeStyle, display: "grid", gridTemplateRows: gridRows, background: "transparent" }}>
          <motion.div style={{ y: combinedTopY, zIndex: 10 } as any} className="relative origin-bottom-right overflow-hidden">
            <canvas ref={topCanvasRef} />
          </motion.div>
          <motion.div style={{ scaleY: centerScale, zIndex: 5 } as any} className="relative overflow-hidden">
            <canvas ref={midCanvasRef} />
          </motion.div>
          <motion.div style={{ y: combinedBottomY, rotateX: bottomRotateX, transformOrigin: "top", zIndex: bottomZIndex } as any} className="relative origin-top-left overflow-hidden">
            <canvas ref={bottomCanvasRef} />
          </motion.div>
          <motion.div
            drag="y"
            onDragStart={() => {
              initialYRef.current = yDrag.get();
              movedRef.current = false;
            }}
            onDrag={(event, info) => {
              movedRef.current = true;
              const raw = initialYRef.current + info.offset.y;
              const clamped = Math.max(-FOLD_RANGE, Math.min(0, raw));
              yDrag.set(clamped);
            }}
            onDragEnd={() => { lastPointerYRef.current = null; }}
            onPointerDown={(e: any) => { pointerDownRef.current = true; movedRef.current = false; lastPointerYRef.current = e.clientY; }}
            onPointerUp={() => {
              if (!movedRef.current && pointerDownRef.current) {
                setIsPointerLocked((s) => !s);
              }
              pointerDownRef.current = false;
              movedRef.current = false;
              lastPointerYRef.current = null;
            }}
            dragConstraints={{ top: -FOLD_RANGE, bottom: 0 }}
            className={`absolute inset-0 z-10 ${isPointerLocked ? "cursor-grabbing" : "cursor-grab"} active:cursor-grabbing`}
          />
        </div>
        {isFolded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="flex flex-col items-center space-y-4 p-6 bg-white bg-opacity-90 rounded-lg mt-12 pointer-events-auto">
              <p className="text-center text-black font-semibold select-none">Are you sure the letter is readable for the receiver?</p>
              <div className="flex space-x-4">
                <button
                  onClick={async () => {
                    if (!onSendWithImage) {
                      try { onAnimationComplete(); } catch (err) {}
                      yDrag.set(0);
                      setIsPointerLocked(false);
                      setIsFolded(false);
                      return;
                    }
                    setIsSending(true);
                    setSendError(null);
                    try {
                      await onSendWithImage(imageSrc);
                      yDrag.set(0);
                      setIsPointerLocked(false);
                      setIsFolded(false);
                      try { onAnimationComplete(); } catch (err) {}
                    } catch (error) {
                      setSendError(error instanceof Error ? error.message : 'Failed to send letter');
                    } finally {
                      setIsSending(false);
                    }
                  }}
                  disabled={isSending}
                  className="rounded-2xl bg-black px-4 py-2 text-white font-semibold hover:bg-opacity-90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed select-none"
                >
                  {isSending ? 'Sending...' : 'Send Letter'}
                </button>
                <button
                  onClick={() => {
                    // Reset local animation state
                    yDrag.set(0);
                    setIsPointerLocked(false);
                    setIsFolded(false);
                    setSendError(null);
                    // Notify parent (if provided) to close the popup/dialog
                    try { onCancel && onCancel(); } catch (err) {}
                  }}
                  className="rounded-2xl bg-white px-4 py-2 text-black font-semibold hover:bg-opacity-90 transition-colors text-sm border border-black select-none"
                >
                  Cancel
                </button>
              </div>
              {sendError && (
                <p className="text-red-500 text-sm mt-2">{sendError}</p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );

  if (embedded) return content;

  // When used inside a Dialog's DialogContent, avoid creating another
  // full-screen fixed element (can conflict with Dialog's portal/transform).
  // Instead, return a full-width/height wrapper that fills the DialogContent
  // area so the `content` can size itself to the popup.
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <div className="w-full h-full flex items-center justify-center">{content}</div>
    </div>
  );
}
