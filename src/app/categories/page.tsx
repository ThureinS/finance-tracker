import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TransactionType } from "@/generated/prisma/enums";
import { CategoryList } from "@/components/category-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CategoryWithCount = {
  id: string;
  name: string;
  type: TransactionType;
  _count: { transactions: number };
};

function CategorySection({
  title,
  items,
  className,
}: {
  title: string;
  items: CategoryWithCount[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <CategoryList
            items={items.map((category) => ({
              id: category.id,
              name: category.name,
              transactionCount: category._count.transactions,
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const categories = await db.category.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });

  const expenses = categories.filter(
    (category) => category.type === TransactionType.EXPENSE,
  );
  const incomes = categories.filter(
    (category) => category.type === TransactionType.INCOME,
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Back</Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No categories yet. Create one with the &quot;+ Add new…&quot;
            option when adding a transaction.
          </CardContent>
        </Card>
      ) : (
        <>
          <CategorySection title="Expense categories" items={expenses} />
          <CategorySection
            title="Income categories"
            items={incomes}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
