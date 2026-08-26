"use client";

import { useTransition } from "react";
import { deleteTransaction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete transaction"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this transaction?")) {
          startTransition(async () => {
            await deleteTransaction(id);
          });
        }
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
