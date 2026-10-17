import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MonthNavHeader } from "@/components/month-nav-header";
import {
  TransactionList,
  type TransactionItem,
} from "@/components/transaction-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { monthParam, monthRange, resolveMonth } from "@/lib/dates";

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
      date: monthRange(year, month),
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

  const query = await searchParams;
  const { year, month } = resolveMonth(query.month);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">
      <MonthNavHeader
        label="Transactions"
        path="/transactions"
        year={year}
        month={month}
      />

      <Suspense
        key={`tx-${monthParam(year, month)}`}
        fallback={<ListSkeleton />}
      >
        <TransactionListSection userId={userId} year={year} month={month} />
      </Suspense>
    </div>
  );
}
