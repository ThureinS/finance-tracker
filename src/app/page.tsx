import { Suspense } from "react";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { TransactionType } from "@/generated/prisma/enums";
import { BudgetsCard } from "@/components/budgets-card";
import { MonthNavHeader } from "@/components/month-nav-header";
import { SpendChart } from "@/components/spend-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import {
  monthParam,
  monthRange,
  resolveMonth,
} from "@/lib/dates";

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
  const range = monthRange(year, month);

  const [totals, byCategory, budgets] = await Promise.all([
    db.transaction.groupBy({
      by: ["type"],
      where: { userId, date: range },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["type", "categoryId"],
      where: { userId, date: range },
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

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
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
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-income">
            {formatCurrency(income)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-expense">
            {formatCurrency(expenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCurrency(balance)}
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
              row.isIncome ? "text-income" : "text-expense"
            }`}
          >
            {formatCurrency(row.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <div className="mb-3 h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function safeCallbackPath(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.length === 0) return "/";
  let path = value;
  if (!path.startsWith("/")) {
    // The proxy sends the full URL as callbackUrl; keep only its path + query.
    try {
      const url = new URL(path);
      path = url.pathname + url.search;
    } catch {
      return "/";
    }
  }
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await auth();
  const query = await searchParams;

  if (!session?.user?.id) {
    const redirectTo = safeCallbackPath(query.callbackUrl);

    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Finance Tracker
        </h1>
        <p className="text-muted-foreground">
          Sign in to see your transactions.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo });
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

  const { year, month } = resolveMonth(query.month);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">
      <MonthNavHeader label="Overview" path="/" year={year} month={month} />

      <Suspense
        key={`cards-${monthParam(year, month)}`}
        fallback={<CardsSkeleton />}
      >
        <MonthCards
          userId={userId}
          year={year}
          month={month}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
