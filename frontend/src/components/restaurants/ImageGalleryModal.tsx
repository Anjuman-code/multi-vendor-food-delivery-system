import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { Restaurant } from "@/types/restaurant";

interface ImageGalleryModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get images array (use main image if no images array)
  const images = restaurant?.images?.length
    ? restaurant.images
    : restaurant
      ? [restaurant.image]
      : [];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setImageLoaded(false);
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "z":
        case "Z":
          setIsZoomed((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageLoaded(false);
    setIsZoomed(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageLoaded(false);
    setIsZoomed(false);
  }, [images.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentIndex(index);
    setImageLoaded(false);
    setIsZoomed(false);
  }, []);

  const handleImageClick = useCallback(() => {
    setIsZoomed((prev) => !prev);
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share && restaurant) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `Check out ${restaurant.name}!`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  }, [restaurant]);

  const handleDownload = useCallback(() => {
    if (images[currentIndex]) {
      const link = document.createElement("a");
      link.href = images[currentIndex];
      link.download = `${restaurant?.name || "restaurant"}-${currentIndex + 1}.jpg`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [images, currentIndex, restaurant]);

  if (!restaurant || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={`Image gallery for ${restaurant.name}`}
        >
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4"
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div>
                <h2 className="text-white font-semibold text-lg">
                  {restaurant.name}
                </h2>
                <p className="text-white/60 text-sm">
                  {currentIndex + 1} of {images.length} photos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="text-white hover:bg-white/20"
                  aria-label={isZoomed ? "Zoom out" : "Zoom in"}
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>

                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="text-white hover:bg-white/20"
                    aria-label="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                  aria-label="Download image"
                >
                  <Download className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                  aria-label="Close gallery"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Main Image */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center p-4",
              "pt-20 pb-24",
            )}
            onClick={handleImageClick}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative max-w-full max-h-full transition-transform duration-300",
                  isZoomed && "cursor-zoom-out scale-150",
                )}
              >
                {/* Loading skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg" />
                )}

                <img
                  src={images[currentIndex]}
                  alt={`${restaurant.name} photo ${currentIndex + 1}`}
                  className={cn(
                    "max-w-full max-h-[70vh] object-contain rounded-lg transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0",
                    !isZoomed && "cursor-zoom-in",
                  )}
                  onLoad={() => setImageLoaded(true)}
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Thumbnails */}
          {images.length > 1 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
            >
              <div className="flex justify-center gap-2 max-w-3xl mx-auto overflow-x-auto py-2 px-4 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500",
                      currentIndex === index
                        ? "ring-2 ring-white scale-110"
                        : "opacity-50 hover:opacity-100",
                    )}
                    aria-label={`View photo ${index + 1}`}
                    aria-current={currentIndex === index ? "true" : undefined}
                  >
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Keyboard hints */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs hidden md:flex items-center gap-4">
            <span>← → Navigate</span>
            <span>Z Zoom</span>
            <span>ESC Close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageGalleryModal;
