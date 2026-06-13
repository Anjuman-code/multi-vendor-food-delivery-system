import { AnimatePresence, motion } from "framer-motion";

import { getPasswordStrength } from "@/lib/passwordStrength";
import { cn } from "@/utils/cn";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

/**
 * Five-segment strength bar that animates in once the user starts typing.
 * Scoring lives in `lib/passwordStrength` so it tracks the Zod rules.
 */
export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);

  return (
    <AnimatePresence initial={false}>
      {password && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn("space-y-1.5 pt-1", className)}
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i <= strength.score ? strength.barClass : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Password strength:{" "}
            <span className={cn("font-medium", strength.textClass)}>
              {strength.label}
            </span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
