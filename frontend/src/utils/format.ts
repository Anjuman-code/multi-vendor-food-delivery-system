/**
 * Shared formatting helpers for the vendor (and wider) dashboard.
 * Consolidates the ৳-currency / number / date formatting that was previously
 * re-declared in nearly every page.
 */

const BDT = "৳";

/**
 * Coerce a value to a finite number. Handles Mongo `Decimal128` shapes
 * (`{ $numberDecimal: "12.3" }`), numeric strings, null/undefined.
 */
export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    const n = parseFloat((value as { $numberDecimal: string }).$numberDecimal);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/** Format an amount as Bangladeshi Taka, e.g. ৳1,250 or ৳1,250.50. */
export const formatCurrency = (
  value: unknown,
  opts: { decimals?: number } = {},
): string => {
  const n = toNumber(value);
  const decimals = opts.decimals ?? (Number.isInteger(n) ? 0 : 2);
  return `${BDT}${n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/** Compact currency for tight spaces, e.g. ৳1.2k, ৳3.4M. */
export const formatCurrencyCompact = (value: unknown): string => {
  const n = toNumber(value);
  if (Math.abs(n) >= 1_000_000) return `${BDT}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${BDT}${(n / 1_000).toFixed(1)}k`;
  return formatCurrency(n);
};

/** Plain grouped number, e.g. 1,250. */
export const formatNumber = (value: unknown): string =>
  toNumber(value).toLocaleString("en-US");

/** A percentage with one decimal, e.g. 92.4%. */
export const formatPercent = (value: unknown, decimals = 1): string =>
  `${toNumber(value).toFixed(decimals)}%`;

const toDate = (value: string | number | Date | undefined | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** e.g. Jun 13, 2026 */
export const formatDate = (value: string | number | Date | undefined | null): string => {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
};

/** e.g. Jun 13, 2:45 PM */
export const formatDateTime = (
  value: string | number | Date | undefined | null,
): string => {
  const d = toDate(value);
  return d
    ? d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
};

/** e.g. just now, 5m ago, 3h ago, 2d ago, else a date. */
export const formatRelativeTime = (
  value: string | number | Date | undefined | null,
): string => {
  const d = toDate(value);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};
