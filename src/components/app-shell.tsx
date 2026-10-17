"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { TransactionSheet } from "@/components/transaction-sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Plus,
  Tags,
  Wallet,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/categories", label: "Categories", icon: Tags },
] as const;

export function AppShell({
  children,
  categories,
  defaultDate,
}: {
  children: React.ReactNode;
  categories: { id: string; name: string; type: string }[];
  defaultDate: string;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navLinks = NAV.map((item) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return { item, active, Icon };
  });

  return (
    <div className="flex min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">finance-tracker</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navLinks.map(({ item, active, Icon }) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70"
            onClick={() => void signOut()}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-dvh w-full flex-1 flex-col md:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              <Wallet className="size-3.5" />
            </span>
            <span className="font-semibold tracking-tight">
              finance-tracker
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card/95 backdrop-blur md:hidden">
          {navLinks.map(({ item, active, Icon }) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <TransactionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          categories={categories}
          defaultDate={defaultDate}
        />
        <button
          aria-label="Add transaction"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}
