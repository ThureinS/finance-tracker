import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { TransactionType } from "@/generated/prisma/enums";
import { AddTransactionForm } from "@/components/add-transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function Home() {
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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: { gte: monthStart, lt: nextMonthStart },
    },
    orderBy: { date: "desc" },
  });

  const income = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expenses;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {monthStart.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h1>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTransactionForm />
        </CardContent>
      </Card>

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
                      })}
                      {t.description ? ` · ${t.description}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
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
    </div>
  );
}
