import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import type {
  OnboardingRole,
  OnboardingStep,
} from "@/components/onboarding/types";

interface RoleMeta {
  badge: string;
  heading: string;
  blurb: string;
}

const ROLE_META: Record<OnboardingRole, RoleMeta> = {
  customer: {
    badge: "Welcome to Food Rush",
    heading: "You're moments away from your first order",
    blurb:
      "Set your delivery address and how you'd like to pay. It takes less than a minute, and you can change everything later.",
  },
  vendor: {
    badge: "Partner onboarding",
    heading: "Let's get your restaurant online",
    blurb:
      "Tell us about your restaurant and how you'd like to get paid. Once you're set up, you can start taking orders right away.",
  },
  rider: {
    badge: "Rider onboarding",
    heading: "A few steps and you're ready to earn",
    blurb:
      "Upload your documents and choose a payout method. We'll review your application and notify you the moment you're approved.",
  },
};

interface OnboardingLayoutProps {
  role: OnboardingRole;
  steps: OnboardingStep[];
  /** 0-based index of the active step. */
  currentStep: number;
  /** Active step content. */
  children: React.ReactNode;
  /** Optional escape hatch shown top-right (e.g. "Skip for now"). */
  onExit?: () => void;
  exitLabel?: string;
}

/**
 * OnboardingLayout — split-screen shell shared by the customer, vendor and
 * rider onboarding flows. Left: a branded gradient panel with a vertical
 * stepper (hidden below `lg`). Right: a sticky progress header, a centered
 * content slot and per-role copy. The visual language mirrors AuthLayout so
 * the jump from sign-up to onboarding feels seamless.
 */
const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  role,
  steps,
  currentStep,
  children,
  onExit,
  exitLabel = "Skip for now",
}) => {
  const meta = ROLE_META[role];
  const total = steps.length;
  const safeStep = Math.min(Math.max(currentStep, 0), total - 1);
  const percent = ((safeStep + 1) / total) * 100;

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Brand + stepper panel (lg+) ─────────────────────────── */}
      <aside className="relative hidden w-[42%] shrink-0 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-red-500 lg:flex xl:w-[38%]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-red-500/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.14),transparent_45%)]" />
        </div>

        <div className="relative z-10 flex w-full flex-col p-10 xl:p-12">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo.svg" alt="" aria-hidden className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-white">
              Food Rush
            </span>
          </Link>

          <div className="mt-12">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {meta.badge}
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-white xl:text-4xl">
              {meta.heading}
            </h1>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-white/80">
              {meta.blurb}
            </p>
          </div>

          {/* Vertical stepper */}
          <ol className="mt-12 space-y-1">
            {steps.map((step, index) => {
              const isComplete = index < safeStep;
              const isActive = index === safeStep;
              const isLast = index === steps.length - 1;
              const Icon = step.icon;
              return (
                <li key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <motion.span
                      initial={false}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition-colors duration-300",
                        isComplete &&
                          "border-white/0 bg-white text-brand-600",
                        isActive &&
                          "border-white bg-white/20 text-white shadow-lg shadow-black/10",
                        !isComplete &&
                          !isActive &&
                          "border-white/25 bg-white/5 text-white/60",
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5" strokeWidth={2.5} />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </motion.span>
                    {!isLast && (
                      <span
                        className={cn(
                          "my-1 w-px flex-1 transition-colors duration-300",
                          isComplete ? "bg-white/70" : "bg-white/20",
                        )}
                      />
                    )}
                  </div>
                  <div className={cn("pb-6 pt-1.5", isLast && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isActive || isComplete ? "text-white" : "text-white/55",
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-relaxed transition-colors duration-300",
                        isActive ? "text-white/75" : "text-white/45",
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-auto pt-10 text-xs text-white/55">
            © {new Date().getFullYear()} Food Rush. Need a hand?{" "}
            <Link to="/contact" className="font-medium text-white/80 underline-offset-2 hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </aside>

      {/* ── Content column ──────────────────────────────────────── */}
      <div className="flex w-full flex-1 flex-col">
        {/* Sticky top bar with progress (mobile shows brand + stepper) */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 py-4 md:px-8">
            <Link to="/" className="inline-flex items-center gap-2 lg:hidden">
              <img src="/logo.svg" alt="" aria-hidden className="h-7 w-7" />
              <span className="text-base font-bold tracking-tight text-foreground">
                Food Rush
              </span>
            </Link>
            <span className="hidden text-sm font-medium text-muted-foreground lg:inline">
              {steps[safeStep]?.label}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground">
                Step {safeStep + 1} of {total}
              </span>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground"
                >
                  {exitLabel}
                </button>
              )}
            </div>
          </div>
          {/* Thin progress bar */}
          <div className="h-1 w-full bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-500 to-red-500"
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        </header>

        {/* Mobile compact stepper */}
        <div className="border-b border-border/60 px-5 py-3 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-1.5">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  index <= safeStep ? "bg-brand-500" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <main className="flex flex-1 justify-center px-5 py-8 md:px-8 md:py-12">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={safeStep}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OnboardingLayout;
