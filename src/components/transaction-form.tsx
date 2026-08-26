"use client";

import { useActionState, useRef, useState } from "react";
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

export type CategoryOption = { id: string; name: string; type: string };

const NEW_CATEGORY = "__new__";

type TransactionFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: CategoryOption[];
  defaultValues?: {
    type?: string;
    amount?: string;
    categoryId?: string;
    description?: string;
    date?: string;
  };
  submitLabel?: string;
};

export function TransactionForm({
  action,
  categories,
  defaultValues,
  submitLabel = "Add transaction",
}: TransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState(defaultValues?.type ?? "EXPENSE");
  const [categoryId, setCategoryId] = useState(
    defaultValues?.categoryId ?? "",
  );

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await action(prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setType("EXPENSE");
        setCategoryId("");
      }
      return result;
    },
    {},
  );

  const options = categories.filter((c) => c.type === type);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type</Label>
          <Select
            name="type"
            value={type}
            onValueChange={(value) => {
              setType(value);
              setCategoryId("");
            }}
          >
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
          {categoryId === NEW_CATEGORY ? (
            <div className="flex items-center gap-2">
              <Input
                name="newCategory"
                placeholder="New category name"
                maxLength={50}
                autoFocus
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCategoryId("")}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Select
              name="categoryId"
              value={categoryId}
              onValueChange={setCategoryId}
              required
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue
                  placeholder={
                    options.length > 0 ? "Pick a category" : "No categories yet"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY}>+ Add new…</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={
              defaultValues?.date ?? new Date().toLocaleDateString("en-CA")
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
