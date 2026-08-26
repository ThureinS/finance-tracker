"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TransactionFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    type?: string;
    amount?: string;
    category?: string;
    description?: string;
    date?: string;
  };
  submitLabel?: string;
};

export function TransactionForm({
  action,
  defaultValues,
  submitLabel = "Add transaction",
}: TransactionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue={defaultValues?.type ?? "EXPENSE"}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            defaultValue={defaultValues?.amount}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="Groceries"
            defaultValue={defaultValues?.category}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={
              defaultValues?.date ??
              new Date().toLocaleDateString("en-CA")
            }
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Weekly market run"
          defaultValue={defaultValues?.description}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
