"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteCategory, updateCategory, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";

type CategoryRowProps = {
  id: string;
  name: string;
  transactionCount: number;
};

export function CategoryRow({
  id,
  name,
  transactionCount,
}: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const inUse = transactionCount > 0;

  const [state, renameAction, renamePending] = useActionState(
    async (prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateCategory(id, prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    {},
  );

  if (editing) {
    return (
      <form action={renameAction} className="flex w-full items-center gap-2">
        <Input
          name="name"
          defaultValue={name}
          maxLength={50}
          autoFocus
          required
          className="h-8"
        />
        <Button type="submit" size="sm" disabled={renamePending}>
          {renamePending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        {state.error && (
          <span className="text-xs text-red-600">{state.error}</span>
        )}
      </form>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">
          {inUse
            ? `${transactionCount} transaction${transactionCount === 1 ? "" : "s"}`
            : "Unused"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Rename ${name}`}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${name}`}
          disabled={inUse || deletePending}
          title={
            inUse ? "Reassign or delete its transactions first" : undefined
          }
          onClick={() => {
            if (confirm(`Delete "${name}"?`)) {
              startDelete(async () => {
                await deleteCategory(id);
              });
            }
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
