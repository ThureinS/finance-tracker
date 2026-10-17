"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/dates";
import { TransactionType } from "@/generated/prisma/enums";

const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.coerce
      .number({ error: "Enter a valid amount" })
      .positive("Amount must be greater than 0")
      .max(9_999_999_999.99, "Amount is too large")
      .transform((value) => Math.round(value * 100) / 100),
    categoryId: z.string().trim().min(1, "Category is required").optional(),
    newCategory: z
      .string()
      .trim()
      .min(1, "Category name is required")
      .max(50)
      .optional(),
    description: z.string().trim().max(200).optional(),
    date: z.coerce.date(),
  })
  .refine((data) => Boolean(data.categoryId || data.newCategory), {
    message: "Category is required",
  });

export type FormState = { error?: string; ok?: boolean };

function revalidateFinanceRoutes() {
  revalidatePath("/");
  revalidatePath("/transactions");
}

type ResolvedInput =
  | {
      ok: true;
      data: {
        type: "INCOME" | "EXPENSE";
        amount: number;
        categoryId: string;
        description?: string;
        date: Date;
      };
    }
  | { ok: false; error: string };

async function resolveNewCategory(
  userId: string,
  type: "INCOME" | "EXPENSE",
  name: string,
): Promise<{ id?: string; error?: string }> {
  const existing = await db.category.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    if (existing.type !== type) {
      return {
        error: `You already have an ${existing.type.toLowerCase()} category named "${existing.name}".`,
      };
    }
    return { id: existing.id };
  }

  const category = await db.category.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name, type },
  });
  if (category.type !== type) {
    return {
      error: `You already have an ${category.type.toLowerCase()} category named "${name}".`,
    };
  }
  return { id: category.id };
}

async function resolveTransactionInput(
  userId: string,
  formData: FormData,
): Promise<ResolvedInput> {
  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId") || undefined,
    newCategory: formData.get("newCategory") || undefined,
    description: formData.get("description") || undefined,
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  let categoryId: string | undefined;
  if (parsed.data.newCategory) {
    const result = await resolveNewCategory(
      userId,
      parsed.data.type,
      parsed.data.newCategory,
    );
    if (result.error || !result.id) {
      return { ok: false, error: result.error ?? "Could not create category." };
    }
    categoryId = result.id;
  } else if (parsed.data.categoryId) {
    const category = await db.category.findFirst({
      where: { id: parsed.data.categoryId, userId, type: parsed.data.type },
    });
    if (!category) {
      return { ok: false, error: "Pick a valid category." };
    }
    categoryId = category.id;
  }

  return {
    ok: true,
    data: {
      type: parsed.data.type,
      amount: parsed.data.amount,
      categoryId: categoryId as string,
      description: parsed.data.description,
      date: parsed.data.date,
    },
  };
}

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const input = await resolveTransactionInput(session.user.id, formData);
  if (!input.ok) {
    return { error: input.error };
  }

  await db.transaction.create({
    data: { userId: session.user.id, ...input.data },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const input = await resolveTransactionInput(session.user.id, formData);
  if (!input.ok) {
    return { error: input.error };
  }

  const result = await db.transaction.updateMany({
    where: { id, userId: session.user.id },
    data: input.data,
  });
  if (result.count === 0) {
    return { error: "Transaction not found." };
  }

  revalidateFinanceRoutes();
  redirect(`/transactions?month=${monthKey(input.data.date)}`);
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  await db.transaction.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidateFinanceRoutes();
}

const renameCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(50),
});

export async function updateCategory(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const parsed = renameCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const duplicate = await db.category.findFirst({
    where: {
      userId: session.user.id,
      name: { equals: parsed.data.name, mode: "insensitive" },
      id: { not: id },
    },
  });
  if (duplicate) {
    return { error: "You already have a category with that name." };
  }

  const result = await db.category.updateMany({
    where: { id, userId: session.user.id },
    data: { name: parsed.data.name },
  });
  if (result.count === 0) {
    return { error: "Category not found." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  const inUse = await db.transaction.count({
    where: { categoryId: id, userId: session.user.id },
  });
  if (inUse > 0) {
    return;
  }

  await db.category.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/", "layout");
}

const budgetAmountSchema = z.coerce
  .number()
  .positive("Budget must be greater than 0")
  .max(99_999_999, "Budget is too large");

export async function setBudget(
  categoryId: string,
  amount: number | null,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }
  const userId = session.user.id;

  if (amount === null) {
    await db.budget.deleteMany({ where: { userId, categoryId } });
    revalidatePath("/");
    return {};
  }

  const parsed = budgetAmountSchema.safeParse(amount);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const category = await db.category.findFirst({
    where: { id: categoryId, userId, type: TransactionType.EXPENSE },
  });
  if (!category) {
    return { error: "Budgets can only be set on your expense categories." };
  }

  await db.budget.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    update: { amount: parsed.data },
    create: { userId, categoryId, amount: parsed.data },
  });

  revalidatePath("/");
  return {};
}
