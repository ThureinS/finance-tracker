import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const DEFAULT_CATEGORIES = [
  { name: "Groceries", type: "EXPENSE" },
  { name: "Rent", type: "EXPENSE" },
  { name: "Utilities", type: "EXPENSE" },
  { name: "Transport", type: "EXPENSE" },
  { name: "Dining", type: "EXPENSE" },
  { name: "Other", type: "EXPENSE" },
  { name: "Salary", type: "INCOME" },
  { name: "Other income", type: "INCOME" },
] as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [GitHub],
  events: {
    createUser: async ({ user }) => {
      if (!user.id) return;
      try {
        await db.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            ...category,
            userId: user.id as string,
          })),
        });
      } catch (error) {
        console.error("Failed to seed default categories", error);
      }
    },
  },
});
