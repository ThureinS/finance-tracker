import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTransaction } from "@/app/actions";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { monthKey, toInputDate } from "@/lib/dates";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function EditTransactionPage({
  params,
}: PageProps<"/transactions/[id]/edit">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { id } = await params;
  const [transaction, categories] = await Promise.all([
    db.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: { category: true },
    }),
    db.category.findMany({
      where: { userId: session.user.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);
  if (!transaction) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit transaction
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/transactions?month=${monthKey(transaction.date)}`}>
            Cancel
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {transaction.category.name} · {toInputDate(transaction.date)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            action={updateTransaction.bind(null, transaction.id)}
            categories={categories}
            defaultValues={{
              type: transaction.type,
              amount: String(transaction.amount),
              categoryId: transaction.categoryId,
              description: transaction.description ?? "",
              date: toInputDate(transaction.date),
            }}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
