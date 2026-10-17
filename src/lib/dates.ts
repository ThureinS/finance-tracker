/**
 * Transaction dates are calendar dates stored as UTC midnights (`@db.Date`).
 * Every helper here works in UTC so month math never shifts with the
 * server's timezone.
 */

export function monthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function monthKey(date: Date) {
  return monthParam(date.getUTCFullYear(), date.getUTCMonth());
}

export function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

export function monthRange(year: number, month: number) {
  return {
    gte: monthStart(year, month),
    lt: monthStart(year, month + 1),
  };
}

export function shiftMonthParam(year: number, month: number, delta: number) {
  const shifted = new Date(Date.UTC(year, month + delta, 1));
  return monthParam(shifted.getUTCFullYear(), shifted.getUTCMonth());
}

export function formatMonth(year: number, month: number) {
  return monthStart(year, month).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function currentMonth() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

export function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveMonth(param: string | string[] | undefined) {
  const match =
    typeof param === "string" ? /^(\d{4})-(\d{2})$/.exec(param) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  return currentMonth();
}
