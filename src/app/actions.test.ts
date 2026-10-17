import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTransaction,
  deleteCategory,
  deleteTransaction,
  setBudget,
  updateCategory,
  updateTransaction,
} from "@/app/actions";

/**
 * Server actions are public POST endpoints, so every test here starts from
 * the two rules the app promises: the session decides identity, and every
 * query/update is scoped by that userId.
 *
 * `@/lib/db` is mocked, so the tests assert *which queries* the actions
 * build (ownership scoping) rather than hitting Postgres.
 */

const mocks = vi.hoisted(() => {
  const db = {
    transaction: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    budget: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return {
    db,
    auth: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect:${url}`);
  }
}

const USER_ID = "user-1";

function formData(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    type: "EXPENSE",
    amount: "12.34",
    categoryId: "cat-1",
    description: "",
    date: "2026-08-15",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: USER_ID } });
  // Interactive transactions run their callback against the same mock
  // client, so the per-model spies observe the queries either way.
  mocks.db.$transaction.mockImplementation(
    async (callback: (tx: typeof mocks.db) => unknown) => callback(mocks.db),
  );
  mocks.redirect.mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
});

describe("createTransaction", () => {
  it("refuses when signed out without touching the database", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await createTransaction({}, formData());

    expect(result).toEqual({ error: "You must be signed in." });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.transaction.create).not.toHaveBeenCalled();
    expect(mocks.db.category.upsert).not.toHaveBeenCalled();
  });

  it("validates ownership of an existing category by id, userId, and type", async () => {
    mocks.db.category.findFirst.mockResolvedValue({
      id: "cat-1",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockResolvedValue({});

    await createTransaction({}, formData());

    expect(mocks.db.category.findFirst).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: USER_ID, type: "EXPENSE" },
    });
  });

  it("rejects a category the user does not own", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);

    const result = await createTransaction({}, formData());

    expect(result).toEqual({ error: "Pick a valid category." });
    expect(mocks.db.transaction.create).not.toHaveBeenCalled();
  });

  it("writes the row under the session userId, never a form value", async () => {
    mocks.db.category.findFirst.mockResolvedValue({
      id: "cat-1",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockResolvedValue({});

    const result = await createTransaction({}, formData());

    expect(mocks.db.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        type: "EXPENSE",
        amount: 12.34,
        categoryId: "cat-1",
        description: undefined,
        date: new Date("2026-08-15T00:00:00.000Z"),
      },
    });
    expect(result).toEqual({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rounds amounts to cents before writing", async () => {
    mocks.db.category.findFirst.mockResolvedValue({
      id: "cat-1",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockResolvedValue({});

    await createTransaction({}, formData({ amount: "10.999" }));

    expect(mocks.db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 11 }),
    });
  });

  it.each([
    ["a missing category", { categoryId: undefined }],
    ["an empty category", { categoryId: "" }],
    ["a zero amount", { amount: "0" }],
    ["a negative amount", { amount: "-5" }],
    ["a non-numeric amount", { amount: "abc" }],
    ["an amount past Decimal(12,2)", { amount: "10000000000" }],
    ["an invalid date", { date: "not-a-date" }],
    ["an unknown type", { type: "TRANSFER" }],
  ])("rejects %s without touching the database", async (_label, overrides) => {
    const result = await createTransaction({}, formData(overrides));

    expect(result.error).toBeTruthy();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.transaction.create).not.toHaveBeenCalled();
    expect(mocks.db.category.upsert).not.toHaveBeenCalled();
  });

  it("resolves the category and writes the row on the same transaction client", async () => {
    const touched = new Set<PropertyKey>();
    const tx = new Proxy(mocks.db, {
      get(target, prop, receiver) {
        touched.add(prop);
        return Reflect.get(target, prop, receiver);
      },
    });
    mocks.db.$transaction.mockImplementation(
      async (callback: (client: typeof mocks.db) => unknown) => callback(tx),
    );
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.upsert.mockResolvedValue({
      id: "cat-new",
      name: "Pets",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockResolvedValue({});

    await createTransaction(
      {},
      formData({ categoryId: undefined, newCategory: "Pets" }),
    );

    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(touched.has("category")).toBe(true);
    expect(touched.has("transaction")).toBe(true);
  });

  it("propagates an insert failure so Prisma rolls back the new category", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.upsert.mockResolvedValue({
      id: "cat-new",
      name: "Pets",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockRejectedValue(new Error("insert failed"));

    await expect(
      createTransaction(
        {},
        formData({ categoryId: undefined, newCategory: "Pets" }),
      ),
    ).rejects.toThrow("insert failed");
  });

  it("reuses an existing category name case-insensitively", async () => {
    mocks.db.category.findFirst.mockResolvedValue({
      id: "cat-9",
      name: "Food",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockResolvedValue({});

    await createTransaction(
      {},
      formData({ categoryId: undefined, newCategory: "food" }),
    );

    expect(mocks.db.category.upsert).not.toHaveBeenCalled();
    expect(mocks.db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ categoryId: "cat-9" }),
    });
  });

  it("creates a new category scoped to the user via the compound unique key", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.upsert.mockResolvedValue({
      id: "cat-new",
      name: "Pets",
      type: "EXPENSE",
    });
    mocks.db.transaction.create.mockResolvedValue({});

    await createTransaction(
      {},
      formData({ categoryId: undefined, newCategory: "Pets" }),
    );

    expect(mocks.db.category.upsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: USER_ID, name: "Pets" } },
      update: {},
      create: { userId: USER_ID, name: "Pets", type: "EXPENSE" },
    });
  });

  it("refuses a new category name that exists under the other type", async () => {
    mocks.db.category.findFirst.mockResolvedValue({
      id: "cat-9",
      name: "Salary",
      type: "INCOME",
    });

    const result = await createTransaction(
      {},
      formData({ categoryId: undefined, newCategory: "salary", type: "EXPENSE" }),
    );

    expect(result.error).toMatch(/income/i);
    expect(mocks.db.transaction.create).not.toHaveBeenCalled();
  });
});

describe("updateTransaction", () => {
  beforeEach(() => {
    mocks.db.category.findFirst.mockResolvedValue({
      id: "cat-1",
      type: "EXPENSE",
    });
  });

  it("refuses when signed out", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await updateTransaction("tx-1", {}, formData());

    expect(result).toEqual({ error: "You must be signed in." });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("scopes the write to the owner and redirects to the saved date's month", async () => {
    mocks.db.transaction.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      updateTransaction("tx-1", {}, formData()),
    ).rejects.toThrow("redirect:/transactions?month=2026-08");

    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.db.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: "tx-1", userId: USER_ID },
      data: expect.objectContaining({ categoryId: "cat-1", amount: 12.34 }),
    });
  });

  it("propagates an update failure so a new category rolls back with it", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.upsert.mockResolvedValue({
      id: "cat-new",
      name: "Pets",
      type: "EXPENSE",
    });
    mocks.db.transaction.updateMany.mockRejectedValue(new Error("update failed"));

    await expect(
      updateTransaction(
        "tx-1",
        {},
        formData({ categoryId: undefined, newCategory: "Pets" }),
      ),
    ).rejects.toThrow("update failed");
  });

  it("returns a generic error when the row is not the user's", async () => {
    mocks.db.transaction.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateTransaction("tx-1", {}, formData());

    expect(result).toEqual({ error: "Transaction not found." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("deleteTransaction", () => {
  it("refuses without a session and does not write", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await deleteTransaction("tx-1");

    expect(result).toEqual({ error: "You must be signed in." });
    expect(mocks.db.transaction.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes only the owner's row and reports success", async () => {
    mocks.db.transaction.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteTransaction("tx-1");

    expect(mocks.db.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: "tx-1", userId: USER_ID },
    });
    expect(result).toEqual({});
  });

  it("reports an already-deleted row and refreshes the list", async () => {
    mocks.db.transaction.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteTransaction("tx-1");

    expect(result.error).toMatch(/not found/i);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/transactions");
  });
});

describe("updateCategory", () => {
  it("refuses a blank name before any database call", async () => {
    const result = await updateCategory(
      "cat-1",
      {},
      formData({ name: "   " }),
    );

    expect(result.error).toBeTruthy();
    expect(mocks.db.category.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.category.updateMany).not.toHaveBeenCalled();
  });

  it("checks duplicates case-insensitively within the user's categories only", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateCategory("cat-1", {}, formData({ name: "Food" }));

    expect(mocks.db.category.findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        name: { equals: "Food", mode: "insensitive" },
        id: { not: "cat-1" },
      },
    });
    expect(result).toEqual({ ok: true });
  });

  it("refuses a duplicate name", async () => {
    mocks.db.category.findFirst.mockResolvedValue({ id: "cat-2" });

    const result = await updateCategory("cat-1", {}, formData({ name: "Food" }));

    expect(result.error).toMatch(/already have/i);
    expect(mocks.db.category.updateMany).not.toHaveBeenCalled();
  });

  it("scopes the rename to the owner", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.updateMany.mockResolvedValue({ count: 1 });

    await updateCategory("cat-1", {}, formData({ name: "Food" }));

    expect(mocks.db.category.updateMany).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: USER_ID },
      data: { name: "Food" },
    });
  });

  it("returns a generic error when the row is not the user's", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);
    mocks.db.category.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateCategory("cat-1", {}, formData({ name: "Food" }));

    expect(result).toEqual({ error: "Category not found." });
  });
});

describe("deleteCategory", () => {
  it("refuses without a session and does not write", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await deleteCategory("cat-1");

    expect(result).toEqual({ error: "You must be signed in." });
    expect(mocks.db.transaction.count).not.toHaveBeenCalled();
    expect(mocks.db.category.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses to delete a category that still has transactions", async () => {
    mocks.db.transaction.count.mockResolvedValue(2);

    const result = await deleteCategory("cat-1");

    expect(mocks.db.transaction.count).toHaveBeenCalledWith({
      where: { categoryId: "cat-1", userId: USER_ID },
    });
    expect(result.error).toMatch(/still has 2 transactions/i);
    expect(mocks.db.category.deleteMany).not.toHaveBeenCalled();
  });

  it("uses the singular noun for one transaction", async () => {
    mocks.db.transaction.count.mockResolvedValue(1);

    const result = await deleteCategory("cat-1");

    expect(result.error).toMatch(/still has 1 transaction\./i);
  });

  it("scopes the in-use count and the delete to the owner", async () => {
    mocks.db.transaction.count.mockResolvedValue(0);
    mocks.db.category.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCategory("cat-1");

    expect(mocks.db.transaction.count).toHaveBeenCalledWith({
      where: { categoryId: "cat-1", userId: USER_ID },
    });
    expect(mocks.db.category.deleteMany).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: USER_ID },
    });
    expect(result).toEqual({});
  });

  it("reports an already-deleted category", async () => {
    mocks.db.transaction.count.mockResolvedValue(0);
    mocks.db.category.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteCategory("cat-1");

    expect(result.error).toMatch(/not found/i);
  });

  it("surfaces an FK race instead of throwing (transaction added mid-delete)", async () => {
    mocks.db.transaction.count.mockResolvedValue(0);
    mocks.db.category.deleteMany.mockRejectedValue(
      new Error("Foreign key constraint violated"),
    );

    const result = await deleteCategory("cat-1");

    expect(result.error).toMatch(/could not delete/i);
  });
});

describe("setBudget", () => {
  it("refuses when signed out", async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await setBudget("cat-1", 250);

    expect(result).toEqual({ error: "You must be signed in." });
    expect(mocks.db.budget.upsert).not.toHaveBeenCalled();
  });

  it("only budgets the user's own expense categories", async () => {
    mocks.db.category.findFirst.mockResolvedValue(null);

    const result = await setBudget("cat-1", 250);

    expect(mocks.db.category.findFirst).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: USER_ID, type: "EXPENSE" },
    });
    expect(result.error).toMatch(/expense/i);
    expect(mocks.db.budget.upsert).not.toHaveBeenCalled();
  });

  it("upserts through the userId+categoryId compound key", async () => {
    mocks.db.category.findFirst.mockResolvedValue({ id: "cat-1" });
    mocks.db.budget.upsert.mockResolvedValue({});

    const result = await setBudget("cat-1", 250);

    expect(mocks.db.budget.upsert).toHaveBeenCalledWith({
      where: { userId_categoryId: { userId: USER_ID, categoryId: "cat-1" } },
      update: { amount: 250 },
      create: { userId: USER_ID, categoryId: "cat-1", amount: 250 },
    });
    expect(result).toEqual({});
  });

  it("rejects non-positive amounts", async () => {
    const result = await setBudget("cat-1", 0);

    expect(result.error).toBeTruthy();
    expect(mocks.db.budget.upsert).not.toHaveBeenCalled();
  });

  it("clears a budget when amount is null", async () => {
    mocks.db.budget.deleteMany.mockResolvedValue({ count: 1 });

    const result = await setBudget("cat-1", null);

    expect(mocks.db.budget.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, categoryId: "cat-1" },
    });
    expect(result).toEqual({});
  });
});
