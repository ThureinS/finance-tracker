"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { TransactionType } from "@/generated/prisma/enums";
import { deleteTransaction } from "@/app/actions";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export type TransactionItem = {
  id: string;
  categoryName: string;
  dateLabel: string;
  description?: string;
  type: TransactionType;
  amount: number;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function TransactionList({ items }: { items: TransactionItem[] }) {
  const [optimisticItems, removeItem] = useOptimistic(
    items,
    (state, id: string) => state.filter((item) => item.id !== id),
  );
  const [pending, startTransition] = useTransition();

  return (
    <ul className="divide-y">
      {optimisticItems.map((item) => (
        <li key={item.id} className="flex items-center justify-between py-3">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{item.categoryName}</span>
            <span className="text-sm text-muted-foreground">
              {item.dateLabel}
              {item.description ? ` · ${item.description}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
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
                  await deleteTransaction(item.id);
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
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {item.type === TransactionType.INCOME ? "+" : "-"}
              {currency.format(item.amount)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
