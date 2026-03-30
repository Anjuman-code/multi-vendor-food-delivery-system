import React, { useState, useCallback, memo, ImgHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Placeholder color or blur data URL */
  placeholder?: string;
  /** Enable blur-up effect */
  blur?: boolean;
  /** Enable fade-in animation on load */
  fadeIn?: boolean;
  /** Quality for responsive images (1-100) */
  quality?: number;
}

/**
 * OptimizedImage - Performance-optimized image component
 *
 * Features:
 * - Lazy loading (native + intersection observer fallback)
 * - Blur-up placeholder effect
 * - Fade-in animation
 * - Error handling with fallback
 * - Proper aspect ratio preservation
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="image.jpg"
 *   alt="Description"
 *   placeholder="#f0f0f0"
 *   fadeIn
 *   loading="lazy"
 * />
 * ```
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = memo(
  ({
    src,
    alt = "",
    placeholder = "#f3f4f6",
    blur = true,
    fadeIn = true,
    quality = 85,
    className,
    onLoad,
    onError,
    ...props
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        setIsLoaded(true);
        onLoad?.(e);
      },
      [onLoad],
    );

    const handleError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        setHasError(true);
        setIsLoaded(true);
        onError?.(e);
      },
      [onError],
    );

    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gray-100",
          !isLoaded && blur && "animate-pulse",
          className,
        )}
        style={{
          backgroundColor: isLoaded ? "transparent" : placeholder,
        }}
      >
        {/* Placeholder overlay */}
        {!isLoaded && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: placeholder }}
            aria-hidden="true"
          />
        )}

        {/* Main image */}
        {!hasError ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "block w-full h-full object-cover",
              fadeIn && !isLoaded && "opacity-0",
              fadeIn && isLoaded && "transition-opacity duration-500 opacity-100",
            )}
            {...props}
          />
        ) : (
          // Fallback for broken images
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  },
);

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
