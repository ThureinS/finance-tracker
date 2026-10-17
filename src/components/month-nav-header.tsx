import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonth, formatMonth, shiftMonthParam } from "@/lib/dates";

/**
 * Shared page header for month views: a title line, the month name, and
 * prev / next / Today controls. `path` is the route the controls link back
 * to ("/" or "/transactions"); the viewed month travels in the `month`
 * search param.
 */
export function MonthNavHeader({
  label,
  path,
  year,
  month,
}: {
  label: string;
  path: string;
  year: number;
  month: number;
}) {
  const current = currentMonth();
  const isCurrentMonth = year === current.year && month === current.month;

  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {formatMonth(year, month)}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link
            href={`${path}?month=${shiftMonthParam(year, month, -1)}`}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="icon" asChild>
          <Link
            href={`${path}?month=${shiftMonthParam(year, month, 1)}`}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        {!isCurrentMonth && (
          <Button variant="outline" size="sm" asChild>
            <Link href={path}>Today</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
