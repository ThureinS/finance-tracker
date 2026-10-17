"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TransactionType } from "@/generated/prisma/enums";
import { deleteTransaction } from "@/app/actions";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Pencil } from "lucide-react";

export type TransactionItem = {
  id: string;
  categoryName: string;
  dateLabel: string;
  description?: string;
  type: TransactionType;
  amount: number;
};

export function TransactionList({ items }: { items: TransactionItem[] }) {
  const [optimisticItems, removeItem] = useOptimistic(
    items,
    (state, id: string) => state.filter((item) => item.id !== id),
  );
  const [pending, startTransition] = useTransition();

  return (
    <ul className="divide-y">
      {optimisticItems.map((item) => (
        <li
          key={item.id}
          className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="min-w-0 flex flex-col gap-1">
            <span className="font-medium">{item.categoryName}</span>
            <span className="truncate text-sm text-muted-foreground">
              {item.dateLabel}
              {item.description ? ` · ${item.description}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 sm:justify-end">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/transactions/${item.id}/edit`}
                aria-label="Edit transaction"
              >
                <Pencil className="size-4" />
              </Link>
            </Button>
            <DeleteTransactionButton
              pending={pending}
              onDelete={() =>
                startTransition(async () => {
                  removeItem(item.id);
                  const result = await deleteTransaction(item.id);
                  if (result.error) toast.error(result.error);
                })
              }
            />
            <Badge
              variant={
                item.type === TransactionType.INCOME ? "secondary" : "outline"
              }
            >
              {item.type}
            </Badge>
            <span
              className={`w-24 text-right font-medium tabular-nums ${
                item.type === TransactionType.INCOME
                  ? "text-income"
                  : "text-expense"
              }`}
            >
              {item.type === TransactionType.INCOME ? "+" : "-"}
              {formatCurrency(item.amount)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
