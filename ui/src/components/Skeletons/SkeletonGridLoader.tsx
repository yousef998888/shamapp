// src/components/Skeletons/SkeletonGridLoader.tsx

interface SkeletonGridLoaderProps {
  /**
   * The number of skeleton items to display.
   * @default 8
   */
  count?: number;
  /**
   * Tailwind CSS grid column classes for responsiveness.
   * @example "grid-cols-2 md:grid-cols-4 lg:grid-cols-5"
   * @default "grid-cols-2 md:grid-cols-4"
   */
  gridCols?: string;
  /**
   * Additional Tailwind CSS classes for the individual skeleton item container.
   * @default "bg-white rounded-lg shadow-sm p-6"
   */
  itemClassName?: string;
  /**
   * Additional Tailwind CSS classes for the icon placeholder.
   * @default "w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4"
   */
  iconPlaceholderClassName?: string;
  /**
   * Additional Tailwind CSS classes for the title placeholder.
   * @default "h-4 bg-gray-200 rounded mx-auto mb-2"
   */
  titlePlaceholderClassName?: string;
  /**
   * Additional Tailwind CSS classes for the description placeholder.
   * @default "h-3 bg-gray-200 rounded mx-auto"
   */
  descriptionPlaceholderClassName?: string;
}

/**
 * A reusable skeleton loader component for grid layouts.
 * Displays animated placeholder items to indicate loading content.
 */
export function SkeletonGridLoader({
  count = 8,
  gridCols = "grid-cols-2 md:grid-cols-4",
  itemClassName = "bg-white rounded-lg shadow-sm p-6",
  iconPlaceholderClassName = "w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4",
  titlePlaceholderClassName = "h-4 bg-gray-200 rounded mx-auto mb-2",
  descriptionPlaceholderClassName = "h-3 bg-gray-200 rounded mx-auto",
}: SkeletonGridLoaderProps) {
  return (
    <div className={`grid ${gridCols} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${itemClassName} animate-pulse`}>
          {/* Icon Placeholder */}
          <div className={iconPlaceholderClassName}></div>
          {/* Title Placeholder */}
          <div className={titlePlaceholderClassName}></div>
          {/* Description Placeholder */}
          <div className={descriptionPlaceholderClassName}></div>
        </div>
      ))}
    </div>
  );
}