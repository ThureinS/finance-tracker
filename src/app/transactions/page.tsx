import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  TransactionList,
  type TransactionItem,
} from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { monthKey, resolveMonth } from "@/lib/dates";

async function TransactionListSection({
  userId,
  year,
  month,
}: {
  userId: string;
  year: number;
  month: number;
}) {
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) },
    },
    orderBy: { date: "desc" },
    include: { category: true },
  });

  const items: TransactionItem[] = transactions.map((t) => ({
    id: t.id,
    categoryName: t.category.name,
    dateLabel: t.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    description: t.description ?? undefined,
    type: t.type,
    amount: Number(t.amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {items.length} transaction{items.length === 1 ? "" : "s"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions this month yet. Tap the + button to add one.
          </p>
        ) : (
          <TransactionList items={items} />
        )}
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <Card aria-hidden>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Sign in to see your transactions.
      </div>
    );
  }
  const userId = session.user.id;

  const { month: monthParam } = await searchParams;
  const { year, month } = resolveMonth(monthParam);
  const now = new Date();
  const monthStart = new Date(year, month, 1);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Transactions
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {monthStart.toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/transactions?month=${monthKey(new Date(year, month - 1, 1))}`}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/transactions?month=${monthKey(new Date(year, month + 1, 1))}`}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/transactions">Today</Link>
            </Button>
          )}
        </div>
      </header>

      <Suspense key={`tx-${monthKey(monthStart)}`} fallback={<ListSkeleton />}>
        <TransactionListSection userId={userId} year={year} month={month} />
      </Suspense>
    </div>
  );
}
