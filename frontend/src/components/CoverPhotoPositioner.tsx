/**
 * CoverPhotoPositioner – Twitter-style drag-to-reposition cover photo.
 *
 * When the user enters "repositioning" mode, the cover image becomes draggable
 * vertically. A translucent overlay with instructions appears, and Save / Cancel
 * buttons let the user commit or discard changes.
 *
 * The component stores vertical position as a value from 0 (top) to 100 (bottom),
 * which maps to CSS `object-position: center <Y>%`.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Move, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverPhotoPositionerProps {
  /** Full URL of the cover image */
  imageUrl: string;
  /** Current saved vertical position (0–100, default 50) */
  initialPosition: number;
  /** Called when the user clicks Save with the new position */
  onSave: (position: number) => Promise<void>;
  /** Extra class names for the outer container */
  className?: string;
  /** Content to render on top of the cover (stats pills, camera button, etc.) */
  children?: React.ReactNode;
}

const CoverPhotoPositioner: React.FC<CoverPhotoPositionerProps> = ({
  imageUrl,
  initialPosition,
  onSave,
  className = "",
  children,
}) => {
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [savedPosition, setSavedPosition] = useState(initialPosition);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartY = useRef(0);
  const dragStartPosition = useRef(0);

  // Keep in sync with prop changes (e.g. after a new upload)
  useEffect(() => {
    setPosition(initialPosition);
    setSavedPosition(initialPosition);
  }, [initialPosition]);

  // ── Drag helpers ──────────────────────────────────────────

  const getPositionFromEvent = useCallback(
    (clientY: number) => {
      if (!containerRef.current || !imgRef.current) return position;

      const containerH = containerRef.current.getBoundingClientRect().height;
      const imgNaturalH = imgRef.current.naturalHeight;
      const imgNaturalW = imgRef.current.naturalWidth;
      const containerW = containerRef.current.getBoundingClientRect().width;

      // Determine the rendered height when the image covers the container width
      const renderedH = (imgNaturalH / imgNaturalW) * containerW;
      const overflow = renderedH - containerH;

      if (overflow <= 0) return 50; // Image is shorter than container – no repositioning possible

      const deltaY = clientY - dragStartY.current;
      // Moving mouse down → image pans up → position decreases
      const deltaPercent = (deltaY / overflow) * -100;
      const newPos = Math.min(
        100,
        Math.max(0, dragStartPosition.current + deltaPercent),
      );
      return Math.round(newPos * 10) / 10;
    },
    [position],
  );

  // ── Mouse events ──────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isRepositioning) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartPosition.current = position;
    },
    [isRepositioning, position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition(getPositionFromEvent(e.clientY));
    },
    [isDragging, getPositionFromEvent],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Touch events ──────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isRepositioning) return;
      setIsDragging(true);
      dragStartY.current = e.touches[0].clientY;
      dragStartPosition.current = position;
    },
    [isRepositioning, position],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // prevent scroll while dragging
      setPosition(getPositionFromEvent(e.touches[0].clientY));
    },
    [isDragging, getPositionFromEvent],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Attach / detach global listeners ──────────────────────

  useEffect(() => {
    if (isRepositioning) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isRepositioning,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // ── Actions ───────────────────────────────────────────────

  const handleStartRepositioning = useCallback(() => {
    setIsRepositioning(true);
  }, []);

  const handleCancel = useCallback(() => {
    setPosition(savedPosition);
    setIsRepositioning(false);
  }, [savedPosition]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(position);
      setSavedPosition(position);
      setIsRepositioning(false);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, position]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        cursor: isRepositioning
          ? isDragging
            ? "grabbing"
            : "grab"
          : undefined,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Cover image */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Cover"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none"
        style={{ objectPosition: `center ${position}%` }}
      />

      {/* Dark overlay when repositioning */}
      <AnimatePresence>
        {isRepositioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 z-10 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Instruction banner when repositioning */}
      <AnimatePresence>
        {isRepositioning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm font-medium pointer-events-none select-none"
          >
            <Move className="w-4 h-4" />
            Drag to reposition
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save / Cancel buttons when repositioning */}
      <AnimatePresence>
        {isRepositioning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 border-white/50 rounded-xl shadow-lg"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1" />
              )}
              Save
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reposition trigger button (shown when NOT repositioning) */}
      <AnimatePresence>
        {!isRepositioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 left-3 z-10"
          >
            <button
              type="button"
              onClick={handleStartRepositioning}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 rounded-xl text-white/80 text-xs font-medium opacity-0 group-hover/banner:opacity-100 hover:bg-black/50 hover:text-white transition-all duration-200 backdrop-blur-sm"
            >
              <Move className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reposition</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal overlay children (stats pills, camera button) – hidden during repositioning */}
      {!isRepositioning && children}
    </div>
  );
};

export default CoverPhotoPositioner;
