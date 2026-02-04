import * as React from "react";
import { cn } from "@/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width class or custom width */
  width?: string;
  /** Height class or custom height */
  height?: string;
}

function Skeleton({ className, width, height, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      style={{
        width: width,
        height: height,
      }}
      {...props}
    />
  );
}

// Pre-styled skeleton variants
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row">
      {/* Image skeleton */}
      <Skeleton className="w-full md:w-72 h-48 flex-shrink-0 rounded-none" />

      {/* Content skeleton */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? "75%" : "100%" }}
        />
      ))}
    </div>
  );
}

function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

function SkeletonButton({ width = "w-24" }: { width?: string }) {
  return <Skeleton className={cn("h-10 rounded-md", width)} />;
}

export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar, SkeletonButton };
