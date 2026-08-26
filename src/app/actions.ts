"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/dates";

const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
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

  revalidatePath("/");
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

  revalidatePath("/");
  redirect(`/?month=${monthKey(input.data.date)}`);
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  await db.transaction.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/");
}
