export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
