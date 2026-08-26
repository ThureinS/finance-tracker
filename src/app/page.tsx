import { Suspense } from "react";
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { TransactionType } from "@/generated/prisma/enums";
import { createTransaction } from "@/app/actions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TransactionList, type TransactionItem } from "@/components/transaction-list";
import { TransactionForm } from "@/components/transaction-form";
import { BudgetsCard } from "@/components/budgets-card";
import { SpendChart } from "@/components/spend-chart";
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
  categories,
}: {
  userId: string;
  year: number;
  month: number;
  categories: { id: string; name: string; type: TransactionType }[];
}) {
  const dateRange = {
    gte: new Date(year, month, 1),
    lt: new Date(year, month + 1, 1),
  };

  const [totals, byCategory, budgets] = await Promise.all([
    db.transaction.groupBy({
      by: ["type"],
      where: { userId, date: dateRange },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["type", "categoryId"],
      where: { userId, date: dateRange },
      _sum: { amount: true },
    }),
    db.budget.findMany({
      where: { userId },
      select: { categoryId: true, amount: true },
    }),
  ]);

  const budgetAmounts = new Map(
    budgets.map((budget) => [budget.categoryId, Number(budget.amount)]),
  );

  const budgetRows = categories
    .filter((category) => category.type === TransactionType.EXPENSE)
    .map((category) => {
      const spent = byCategory.find(
        (row) =>
          row.type === TransactionType.EXPENSE &&
          row.categoryId === category.id,
      );
      return {
        id: category.id,
        name: category.name,
        spent: Number(spent?._sum.amount ?? 0),
        budget: budgetAmounts.get(category.id) ?? null,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const categoryIds = [...new Set(byCategory.map((row) => row.categoryId))];
  const categoryNames = new Map(
    (
      await db.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    ).map((c) => [c.id, c.name]),
  );

  const income = Number(
    totals.find((t) => t.type === TransactionType.INCOME)?._sum.amount ?? 0,
  );
  const expenses = Number(
    totals.find((t) => t.type === TransactionType.EXPENSE)?._sum.amount ?? 0,
  );
  const balance = income - expenses;

  const expenseRows = byCategory
    .filter((row) => row.type === TransactionType.EXPENSE)
    .sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0))
    .map((row) => ({
      id: row.categoryId,
      name: categoryNames.get(row.categoryId) ?? "Unknown",
      amount: Number(row._sum.amount ?? 0),
      isIncome: false,
      budget: budgetAmounts.get(row.categoryId) ?? null,
    }));
  const incomeRows = byCategory
    .filter((row) => row.type === TransactionType.INCOME)
    .sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0))
    .map((row) => ({
      id: row.categoryId,
      name: categoryNames.get(row.categoryId) ?? "Unknown",
      amount: Number(row._sum.amount ?? 0),
      isIncome: true,
    }));

  return (
    <div className="flex flex-col gap-4">
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

      {budgetRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetsCard rows={budgetRows} />
          </CardContent>
        </Card>
      )}

      {(expenseRows.length > 0 || incomeRows.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By category
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <CategoryRows rows={expenseRows} />
              <CategoryRows rows={incomeRows} />
            </div>
            {expenseRows.length > 0 && (
              <div className="flex-1">
                <SpendChart rows={expenseRows} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryRows({
  rows,
}: {
  rows: { id: string; name: string; amount: number; isIncome: boolean }[];
}) {
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between text-sm"
        >
          <span>{row.name}</span>
          <span
            className={`font-medium tabular-nums ${
              row.isIncome ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {currency.format(row.amount)}
          </span>
        </li>
      ))}
    </ul>
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions this month yet.
          </p>
        ) : (
          <TransactionList items={items} />
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

  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/categories">Categories</Link>
          </Button>
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
        </div>
      </header>

      <Suspense key={`cards-${monthKey(monthStart)}`} fallback={<CardsSkeleton />}>
        <MonthCards
          userId={userId}
          year={year}
          month={month}
          categories={categories}
        />
      </Suspense>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm action={createTransaction} categories={categories} />
        </CardContent>
      </Card>

      <Suspense key={`list-${monthKey(monthStart)}`} fallback={<ListSkeleton />}>
        <MonthList userId={userId} year={year} month={month} />
      </Suspense>
    </div>
  );
}
