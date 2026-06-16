/**
 * LiveStageStrip — DoorDash/Uber-style fine-grained progress for the delivery
 * leg, driven by the rider's `deliveryStage`. Complements the coarse
 * OrderStatus stepper; only meaningful once a rider is assigned.
 */
import type { DeliveryStage } from '@/types/order';
import { Bike, CheckCircle2, MapPin, Package, Store, UtensilsCrossed } from 'lucide-react';

export const STAGE_STEPS: {
  key: DeliveryStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'heading_to_store', label: 'Heading to store', icon: Bike },
  { key: 'at_store', label: 'At store', icon: Store },
  { key: 'picked_up', label: 'Picked up', icon: Package },
  { key: 'heading_to_customer', label: 'On the way', icon: UtensilsCrossed },
  { key: 'arrived', label: 'Arrived', icon: MapPin },
];

interface LiveStageStripProps {
  stage?: DeliveryStage | null;
  className?: string;
}

export const LiveStageStrip: React.FC<LiveStageStripProps> = ({
  stage,
  className,
}) => {
  const currentIdx = stage
    ? STAGE_STEPS.findIndex((s) => s.key === stage)
    : -1;

  return (
    <div className={`flex items-center ${className ?? ''}`}>
      {STAGE_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const Icon = active ? step.icon : done ? CheckCircle2 : step.icon;
        return (
          <div
            key={step.key}
            className="flex flex-1 items-center last:flex-initial"
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  active
                    ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                    : done
                      ? 'bg-orange-400 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`mt-1 hidden text-center text-[10px] sm:block ${
                  active ? 'font-semibold text-orange-600' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STAGE_STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${
                  idx < currentIdx ? 'bg-orange-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LiveStageStrip;
