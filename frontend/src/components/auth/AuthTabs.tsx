import { Link } from "react-router-dom";

import { cn } from "@/utils/cn";

interface AuthTabsProps {
  active: "login" | "register";
}

const TABS = [
  { key: "login", label: "Log in", to: "/login" },
  { key: "register", label: "Sign up", to: "/register" },
] as const;

/**
 * Segmented Log in / Sign up switcher shared by the login and customer
 * register pages. Pill style instead of the old underline tabs.
 */
export function AuthTabs({ active }: AuthTabsProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg py-2 text-center text-sm font-semibold transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
