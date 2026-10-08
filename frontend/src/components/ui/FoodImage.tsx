import React, { memo, useEffect, useMemo, useState } from 'react';
import { resolveFoodImage, getGenericFoodPlaceholder } from '@/utils/foodImage';
import { cn } from '@/utils/cn';

export interface FoodImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  name: string;
  src?: string | null;
  aspectRatio?: '4/3' | '1/1' | '16/9' | 'auto';
  className?: string;
  imgClassName?: string;
  showFallbackBadge?: boolean;
}

export const FoodImage: React.FC<FoodImageProps> = memo(({
  name,
  src: rawSrc,
  aspectRatio = '4/3',
  className,
  imgClassName,
  showFallbackBadge = false,
  alt,
  loading = 'lazy',
  decoding = 'async',
  ...props
}) => {
  // Resolved canonical fallback for this dish name
  const canonicalFallback = useMemo(() => resolveFoodImage(name), [name]);
  const genericPlaceholder = useMemo(() => getGenericFoodPlaceholder(), []);

  // Track if primary image failed or if fallback failed
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Reset failures if src changes
  useEffect(() => {
    setPrimaryFailed(false);
    setFallbackFailed(false);
  }, [rawSrc, name]);

  const hasPrimary = Boolean(rawSrc && rawSrc.trim());

  let activeSrc: string;
  let isUsingFallback = false;

  if (hasPrimary && !primaryFailed) {
    activeSrc = rawSrc!;
  } else if (canonicalFallback && !fallbackFailed) {
    activeSrc = canonicalFallback.src;
    isUsingFallback = true;
  } else {
    activeSrc = genericPlaceholder;
    isUsingFallback = true;
  }

  const handleImageError = () => {
    if (hasPrimary && !primaryFailed) {
      setPrimaryFailed(true);
    } else if (canonicalFallback && !fallbackFailed) {
      setFallbackFailed(true);
    }
  };

  const aspectClass =
    aspectRatio === '4/3'
      ? 'aspect-[4/3]'
      : aspectRatio === '1/1'
      ? 'aspect-square'
      : aspectRatio === '16/9'
      ? 'aspect-video'
      : '';

  return (
    <div className={cn('relative overflow-hidden bg-gray-100 flex items-center justify-center select-none', aspectClass, className)}>
      <img
        src={activeSrc}
        alt={alt || name || 'Food item'}
        loading={loading}
        decoding={decoding}
        onError={handleImageError}
        className={cn('w-full h-full object-cover transition-opacity duration-200', imgClassName)}
        {...props}
      />

      {showFallbackBadge && isUsingFallback && (
        <span
          className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded font-medium select-none pointer-events-none z-10"
          title="Sample photo for this dish"
        >
          Sample photo
        </span>
      )}
    </div>
  );
});

FoodImage.displayName = 'FoodImage';
export default FoodImage;
