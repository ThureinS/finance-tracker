/**
 * The app's single currency formatter. A fixed USD/en-US formatter keeps
 * server and client rendering byte-identical (no locale drift), and every
 * surface — dashboard totals, budget rows, the ledger, chart tooltips —
 * formats amounts the same way.
 */

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount: number) {
  return formatter.format(amount);
}

/** The currency symbol, derived from `formatCurrency` itself. */
export const currencySymbol =
  formatter.formatToParts(0).find((part) => part.type === "currency")
    ?.value ?? "$";
