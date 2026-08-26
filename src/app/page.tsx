import { Suspense } from "react";
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { TransactionType } from "@/generated/prisma/enums";
import { createTransaction } from "@/app/actions";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { TransactionForm } from "@/components/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { monthKey } from "@/lib/dates";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function resolveMonth(param: string | string[] | undefined) {
  const now = new Date();
  const match = typeof param === "string" ? /^(\d{4})-(\d{2})$/.exec(param) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

async function MonthCards({
  userId,
  year,
  month,
}: {
  userId: string;
  year: number;
  month: number;
}) {
  const totals = await db.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      date: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) },
    },
    _sum: { amount: true },
  });

  const income = Number(
    totals.find((t) => t.type === TransactionType.INCOME)?._sum.amount ?? 0,
  );
  const expenses = Number(
    totals.find((t) => t.type === TransactionType.EXPENSE)?._sum.amount ?? 0,
  );
  const balance = income - expenses;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Income
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold text-emerald-600">
          {currency.format(income)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold text-red-600">
          {currency.format(expenses)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">
          {currency.format(balance)}
        </CardContent>
      </Card>
    </div>
  );
}

async function MonthList({
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
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions this month yet.
          </p>
        ) : (
          <ul className="divide-y">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{t.category}</span>
                  <span className="text-sm text-muted-foreground">
                    {t.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                    {t.description ? ` · ${t.description}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      href={`/transactions/${t.id}/edit`}
                      aria-label="Edit transaction"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <DeleteTransactionButton id={t.id} />
                  <Badge
                    variant={
                      t.type === TransactionType.INCOME
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {t.type}
                  </Badge>
                  <span
                    className={`w-24 text-right font-medium tabular-nums ${
                      t.type === TransactionType.INCOME
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {t.type === TransactionType.INCOME ? "+" : "-"}
                    {currency.format(Number(t.amount))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <div className="mb-3 h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <Card className="mt-6" aria-hidden>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
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

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Finance Tracker
        </h1>
        <p className="text-muted-foreground">
          Sign in to see your transactions.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <Button>Sign in with GitHub</Button>
        </form>
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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/?month=${monthKey(new Date(year, month - 1, 1))}`}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {monthStart.toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h1>
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/?month=${monthKey(new Date(year, month + 1, 1))}`}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Today</Link>
            </Button>
          )}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <Suspense key={`cards-${monthKey(monthStart)}`} fallback={<CardsSkeleton />}>
        <MonthCards userId={userId} year={year} month={month} />
      </Suspense>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm action={createTransaction} />
        </CardContent>
      </Card>

      <Suspense key={`list-${monthKey(monthStart)}`} fallback={<ListSkeleton />}>
        <MonthList userId={userId} year={year} month={month} />
      </Suspense>
    </div>
  );
}
