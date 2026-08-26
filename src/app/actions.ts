"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/dates";

const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().trim().min(1, "Category is required").max(50),
  description: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
});

export type FormState = { error?: string; ok?: boolean };

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const parsed = createTransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db.transaction.create({
    data: {
      userId: session.user.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: parsed.data.date,
    },
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

  const parsed = createTransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await db.transaction.updateMany({
    where: { id, userId: session.user.id },
    data: {
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: parsed.data.date,
    },
  });
  if (result.count === 0) {
    return { error: "Transaction not found." };
  }

  revalidatePath("/");
  redirect(`/?month=${monthKey(parsed.data.date)}`);
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
