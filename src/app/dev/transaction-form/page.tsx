import { notFound } from "next/navigation";
import type { FormState } from "@/app/actions";
import { TransactionForm } from "@/components/transaction-form";

const previewCategories = [
  { id: "groceries", name: "Groceries", type: "EXPENSE" },
  { id: "dining", name: "Dining", type: "EXPENSE" },
  { id: "transport", name: "Transport", type: "EXPENSE" },
  { id: "utilities", name: "Utilities", type: "EXPENSE" },
  { id: "salary", name: "Salary", type: "INCOME" },
  { id: "freelance", name: "Freelance", type: "INCOME" },
  { id: "interest", name: "Interest", type: "INCOME" },
];

async function previewTransactionAction(): Promise<FormState> {
  "use server";

  return {
    error: "Preview only. Nothing was saved.",
  };
}

export default function TransactionFormPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-popover shadow-xl">
        <div className="border-b px-4 pt-4 pb-2 sm:px-5">
          <h1 className="text-lg font-semibold">Quick add</h1>
          <p className="text-sm text-muted-foreground">
            Capture the amount first, then pick where it belongs.
          </p>
        </div>
        <TransactionForm
          action={previewTransactionAction}
          categories={previewCategories}
          surface="sheet"
        />
      </div>
    </main>
  );
}
