export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveMonth(param: string | string[] | undefined) {
  const now = new Date();
  const match = typeof param === "string" ? /^(\d{4})-(\d{2})$/.exec(param) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}
