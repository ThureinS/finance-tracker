"use client";

import { useActionState, useRef, useState } from "react";
import type { FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currencySymbol } from "@/lib/currency";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  FileText,
  Plus,
  X,
} from "lucide-react";

export type CategoryOption = { id: string; name: string; type: string };

const NEW_CATEGORY = "__new__";

type TransactionFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: CategoryOption[];
  /** Date the (empty) form starts on; the server computes it as UTC today. */
  defaultDate: string;
  defaultValues?: {
    type?: string;
    amount?: string;
    categoryId?: string;
    description?: string;
  };
  submitLabel?: string;
  onSuccess?: () => void;
  surface?: "page" | "sheet";
};

export function TransactionForm({
  action,
  categories,
  defaultDate,
  defaultValues,
  submitLabel = "Add transaction",
  onSuccess,
  surface = "page",
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
        onSuccess?.();
      }
      return result;
    },
    {},
  );

  const options = categories.filter((c) => c.type === type);
  const selectedCategory =
    categoryId === NEW_CATEGORY
      ? "New category"
      : options.find((category) => category.id === categoryId)?.name;
  const isExpense = type === "EXPENSE";
  const typeOptions = [
    {
      value: "EXPENSE",
      label: "Expense",
      helper: "Money out",
      icon: ArrowDownCircle,
      activeClass:
        "border-expense/50 bg-expense/10 text-expense ring-expense/20",
    },
    {
      value: "INCOME",
      label: "Income",
      helper: "Money in",
      icon: ArrowUpCircle,
      activeClass: "border-income/50 bg-income/10 text-income ring-income/20",
    },
  ];
  const contentPadding = surface === "sheet" ? "px-4 sm:px-5" : "";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className={`flex-1 space-y-5 overflow-y-auto pb-4 ${contentPadding}`}>
        <input type="hidden" name="type" value={type} />
        {categoryId !== NEW_CATEGORY && (
          <input type="hidden" name="categoryId" value={categoryId} />
        )}

        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs uppercase text-muted-foreground">
            Amount
          </Label>
          <div
            className={`rounded-xl border bg-card p-4 shadow-sm ${
              isExpense ? "border-expense/20" : "border-income/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-3xl font-semibold ${
                  isExpense ? "text-expense" : "text-income"
                }`}
              >
                {currencySymbol}
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="0.00"
                defaultValue={defaultValues?.amount}
                autoFocus
                required
                className="h-14 border-0 bg-transparent px-0 text-4xl font-semibold shadow-none [appearance:textfield] focus-visible:ring-0 md:text-4xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedCategory
                ? `${selectedCategory} will be saved as ${type.toLowerCase()}.`
                : "Choose a category before saving."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2" aria-label="Transaction type">
          {typeOptions.map((item) => {
            const Icon = item.icon;
            const active = type === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setType(item.value);
                  setCategoryId("");
                }}
                className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  active
                    ? `${item.activeClass} ring-1`
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Icon className="size-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {item.helper}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs uppercase text-muted-foreground">
              Category
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCategoryId(NEW_CATEGORY)}
            >
              <Plus className="size-3.5" />
              New
            </Button>
          </div>

          {categoryId === NEW_CATEGORY ? (
            <div className="flex items-center gap-2 rounded-xl border bg-background p-2">
              <Input
                name="newCategory"
                placeholder="New category name"
                maxLength={50}
                autoFocus
                required
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Cancel new category"
                onClick={() => setCategoryId("")}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : options.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {options.map((category) => {
                const active = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategoryId(category.id)}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
                      active
                        ? isExpense
                          ? "border-expense/50 bg-expense/10 text-expense"
                          : "border-income/50 bg-income/10 text-income"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="line-clamp-1">{category.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCategoryId(NEW_CATEGORY)}
              className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed bg-background text-sm text-muted-foreground hover:bg-muted"
            >
              <Plus className="size-4" />
              Add your first {type.toLowerCase()} category
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label
              htmlFor="date"
              className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground"
            >
              <CalendarDays className="size-3.5" />
              Date
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              required
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground"
            >
              <FileText className="size-3.5" />
              Note
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Optional note"
              defaultValue={defaultValues?.description}
              className="min-h-8 resize-none"
            />
          </div>
        </div>

        {state.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>

      <div
        className={`border-t bg-popover/95 pt-3 backdrop-blur ${
          surface === "sheet" ? "px-4 pb-4 sm:px-5" : "pb-0"
        }`}
      >
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
