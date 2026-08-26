"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setBudget } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

export type BudgetRow = {
  id: string;
  name: string;
  spent: number;
  budget: number | null;
};

type AmountUpdate = { id: string; amount: number | null };

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function BudgetsCard({ rows }: { rows: BudgetRow[] }) {
  const [optimisticRows, applyUpdate] = useOptimistic(
    rows,
    (state, update: AmountUpdate) =>
      state.map((row) =>
        row.id === update.id ? { ...row, budget: update.amount } : row,
      ),
  );
  const [pending, startTransition] = useTransition();

  function save(
    id: string,
    amount: number | null,
  ): Promise<{ error?: string }> {
    return new Promise((resolve) => {
      void startTransition(async () => {
        applyUpdate({ id, amount });
        const result = await setBudget(id, amount);
        resolve(result);
      });
    });
  }

  if (optimisticRows.length === 0) return null;

  return (
    <ul className="flex flex-col gap-4">
      {optimisticRows.map((row) => (
        <li key={row.id}>
          <BudgetRowItem row={row} pending={pending} onSave={save} />
        </li>
      ))}
    </ul>
  );
}

function BudgetRowItem({
  row,
  pending,
  onSave,
}: {
  row: BudgetRow;
  pending: boolean;
  onSave: (
    id: string,
    amount: number | null,
  ) => Promise<{ error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const percent =
    row.budget && row.budget > 0 ? (row.spent / row.budget) * 100 : null;
  const over = percent !== null && percent > 100;

  async function submit(amount: number | null) {
    setError(null);
    const result = await onSave(row.id, amount);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  function handleSaveClick() {
    const parsed = Number(draft);
    if (!draft || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    void submit(Math.round(parsed * 100) / 100);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="min-w-24 text-sm font-medium">{row.name}</span>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Monthly budget"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSaveClick();
              if (event.key === "Escape") setEditing(false);
            }}
            autoFocus
            className="h-8 w-36"
          />
          <Button size="sm" disabled={pending} onClick={handleSaveClick}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {row.budget !== null && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => void submit(null)}
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{row.name}</span>
        <div className="flex items-center gap-1">
          <span
            className={`text-sm tabular-nums ${
              over ? "text-red-600" : "text-muted-foreground"
            }`}
          >
            {percent === null
              ? `${currency.format(row.spent)} · no budget`
              : over
                ? `${currency.format(row.spent)} · ${currency.format(row.spent - row.budget!)} over`
                : `${currency.format(row.spent)} / ${currency.format(row.budget!)}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Set budget for ${row.name}`}
            onClick={() => {
              setDraft(row.budget === null ? "" : String(row.budget));
              setError(null);
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={
          percent === null ? undefined : Math.round(Math.min(percent, 100))
        }
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${row.name} budget usage`}
      >
        {percent !== null && (
          <div
            className={`h-full rounded-full transition-[width] ${
              over ? "bg-red-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}
