import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentMonth,
  formatMonth,
  monthKey,
  monthParam,
  monthRange,
  monthStart,
  resolveMonth,
  shiftMonthParam,
  toInputDate,
} from "@/lib/dates";

describe("UTC calendar helpers", () => {
  it("runs the suite under a non-UTC timezone", () => {
    // Guards every assertion below: if TZ were UTC, a local-time bug in
    // dates.ts would silently pass. Yangon is UTC+6:30 (the timezone that
    // exposed the original month-shift bug).
    expect(new Date(2026, 0, 1).getTime()).not.toBe(Date.UTC(2026, 0, 1));
  });

  it("monthStart returns UTC midnight", () => {
    expect(monthStart(2026, 7).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("monthRange is [start of month, start of next month)", () => {
    const { gte, lt } = monthRange(2026, 7);
    expect(gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("monthRange wraps the year boundary", () => {
    const { gte, lt } = monthRange(2026, 11);
    expect(gte.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("monthParam pads single-digit months", () => {
    expect(monthParam(2026, 0)).toBe("2026-01");
    expect(monthParam(2026, 11)).toBe("2026-12");
  });

  it("monthKey uses the UTC month, not the local one", () => {
    // Aug 1 00:00 UTC is still Jul 31 18:30 in Yangon.
    expect(monthKey(new Date(Date.UTC(2026, 7, 1)))).toBe("2026-08");
    expect(monthKey(new Date("2026-08-31T00:00:00.000Z"))).toBe("2026-08");
  });

  it("shiftMonthParam crosses year boundaries in both directions", () => {
    expect(shiftMonthParam(2026, 11, 1)).toBe("2027-01");
    expect(shiftMonthParam(2026, 0, -1)).toBe("2025-12");
    expect(shiftMonthParam(2026, 7, 0)).toBe("2026-08");
    expect(shiftMonthParam(2026, 0, -13)).toBe("2024-12");
  });

  it("formatMonth renders the UTC month name", () => {
    expect(formatMonth(2026, 7)).toBe("August 2026");
    expect(formatMonth(2025, 11)).toBe("December 2025");
  });

  it("currentMonth reads the current UTC month", () => {
    vi.useFakeTimers();
    // Aug 31 20:00 UTC is already Sep 1 in Yangon; UTC must win.
    vi.setSystemTime(new Date("2026-08-31T20:00:00.000Z"));
    expect(currentMonth()).toEqual({ year: 2026, month: 7 });
  });

  it("toInputDate formats UTC dates as YYYY-MM-DD", () => {
    expect(toInputDate(new Date(Date.UTC(2026, 7, 5)))).toBe("2026-08-05");
  });

  describe("resolveMonth", () => {
    it("parses a valid YYYY-MM param", () => {
      expect(resolveMonth("2026-08")).toEqual({ year: 2026, month: 7 });
      expect(resolveMonth("2026-01")).toEqual({ year: 2026, month: 0 });
    });

    it("falls back to the current month on invalid input", () => {
      const now = currentMonth();
      expect(resolveMonth(undefined)).toEqual(now);
      expect(resolveMonth("")).toEqual(now);
      expect(resolveMonth("garbage")).toEqual(now);
      expect(resolveMonth("2026-13")).toEqual(now);
      expect(resolveMonth("2026-00")).toEqual(now);
      expect(resolveMonth("2026-8")).toEqual(now);
      // Next.js searchParams can be string[]; only a single string is valid.
      expect(resolveMonth(["2026-08"])).toEqual(now);
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});
