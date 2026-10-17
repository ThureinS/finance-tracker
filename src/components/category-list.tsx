"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { deleteCategory } from "@/app/actions";
import { CategoryRow } from "@/components/category-row";

export type CategoryItem = {
  id: string;
  name: string;
  transactionCount: number;
};

export function CategoryList({ items }: { items: CategoryItem[] }) {
  const [optimisticItems, removeItem] = useOptimistic(
    items,
    (state, id: string) => state.filter((item) => item.id !== id),
  );
  const [pending, startTransition] = useTransition();

  return (
    <ul className="divide-y">
      {optimisticItems.map((item) => (
        <li key={item.id} className="flex items-center py-2.5">
          <CategoryRow
            id={item.id}
            name={item.name}
            transactionCount={item.transactionCount}
            deleting={pending}
            onDelete={() =>
              startTransition(async () => {
                removeItem(item.id);
                const result = await deleteCategory(item.id);
                if (result.error) toast.error(result.error);
              })
            }
          />
        </li>
      ))}
    </ul>
  );
}
