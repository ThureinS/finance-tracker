"use client";

import { createTransaction } from "@/app/actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TransactionForm, type CategoryOption } from "@/components/transaction-form";

export function TransactionSheet({
  open,
  onOpenChange,
  categories,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  defaultDate: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-xl gap-3 rounded-t-2xl border-x p-0 sm:bottom-6 sm:rounded-2xl sm:border"
      >
        <SheetHeader className="px-4 pt-4 pb-1 sm:px-5">
          <SheetTitle className="text-lg">Quick add</SheetTitle>
          <SheetDescription>
            Capture the amount first, then pick where it belongs.
          </SheetDescription>
        </SheetHeader>
        <TransactionForm
          action={createTransaction}
          categories={categories}
          defaultDate={defaultDate}
          onSuccess={() => onOpenChange(false)}
          surface="sheet"
        />
      </SheetContent>
    </Sheet>
  );
}
