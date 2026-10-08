import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { cn } from "@/utils/cn";

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  thumbLabels?: string[];
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, thumbLabels, ...props }, ref) => {
  // Dynamically extract values array to render a thumb for each value (supports single and dual/range sliders)
  const values = React.useMemo(() => {
    if (Array.isArray(props.value)) return props.value;
    if (Array.isArray(props.defaultValue)) return props.defaultValue;
    if (typeof props.value === "number") return [props.value];
    if (typeof props.defaultValue === "number") return [props.defaultValue];
    return [props.min ?? 0];
  }, [props.value, props.defaultValue, props.min]);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2.5",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200/80">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={
            thumbLabels?.[index] ??
            (values.length === 2
              ? index === 0
                ? "Minimum value picker"
                : "Maximum value picker"
              : `Value ${index + 1}`)
          }
          className={cn(
            "relative block h-5 w-5 rounded-full border-2 border-brand-500 bg-white shadow-md shadow-brand-500/20 ring-offset-background",
            "transition-transform duration-100 hover:scale-115 hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing active:scale-95",
            // Accessible 44px tap target expansion for mobile touch
            "after:absolute after:-inset-3 after:content-[''] after:rounded-full",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
