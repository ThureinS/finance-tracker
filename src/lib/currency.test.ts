import { describe, expect, it } from "vitest";
import { currencySymbol, formatCurrency } from "@/lib/currency";

describe("formatCurrency", () => {
  it("formats amounts as en-US USD", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("keeps the sign on negative amounts", () => {
    expect(formatCurrency(-12.5)).toBe("-$12.50");
  });

  it("rounds to cents", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
    expect(formatCurrency(1.005)).toBe("$1.01");
  });

  it("exposes the same symbol the formatter prints", () => {
    expect(currencySymbol).toBe("$");
    expect(formatCurrency(1)).toContain(currencySymbol);
  });
});
