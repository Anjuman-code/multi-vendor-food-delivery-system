import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const FoodCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Image aspect ratio container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Body content */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {/* Restaurant & Rating */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-10 rounded" />
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-4/5 rounded mb-1" />

        {/* Description line */}
        <Skeleton className="h-3.5 w-full rounded mb-1" />
        <Skeleton className="h-3.5 w-2/3 rounded mb-3" />

        {/* Dietary / tag pills */}
        <div className="flex items-center gap-1.5 mb-3">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>

        {/* Footer: Price & Add Button */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
