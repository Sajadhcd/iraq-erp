/**
 * Enterprise ERP – Shared Formatters
 * A collection of null-safe, locale-aware helpers for numbers, dates and strings.
 */

/**
 * Format a numeric monetary value with locale-aware separators and a currency symbol.
 * Returns "—" for null / undefined / NaN.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currencySymbol = "د.ع",
  locale = "ar-IQ"
): string {
  const num = Number(value);
  if (value === null || value === undefined || isNaN(num)) return "—";
  return `${num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencySymbol}`;
}

/**
 * Format a date string or Date object into a locale-friendly short date.
 * Returns "—" for null / undefined / invalid dates.
 */
export function formatDate(
  value: string | Date | null | undefined,
  locale = "ar-IQ"
): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format a date-time string for display with both date and time parts.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  locale = "ar-IQ"
): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a number with locale-aware separators and optional decimal places.
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals = 0,
  locale = "ar-IQ"
): string {
  const num = Number(value);
  if (value === null || value === undefined || isNaN(num)) return "—";
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Truncate a string to the given max length, appending "…" if trimmed.
 */
export function truncate(value: string | null | undefined, maxLength = 50): string {
  if (!value) return "—";
  return value.length > maxLength ? value.substring(0, maxLength) + "…" : value;
}

/**
 * Safely convert any value to a lowercase string for searching.
 * Never returns undefined / null.
 */
export function toSearchable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).toLowerCase();
    } catch {
      return "";
    }
  }
  return String(value).toLowerCase();
}
