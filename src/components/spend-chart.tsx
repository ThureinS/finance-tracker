"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/currency";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function SpendChart({
  rows,
}: {
  rows: { name: string; amount: number }[];
}) {
  const all = rows
    .map(({ name, amount }) => ({ name, value: amount }))
    .sort((a, b) => b.value - a.value);
  const data = all.slice(0, 7);
  const restValue = all
    .slice(7)
    .reduce((sum, item) => sum + item.value, 0);
  if (restValue > 0) data.push({ name: "Other", value: restValue });

  return (
    <div className="h-64 w-full" aria-label="Spending by category chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            strokeWidth={1}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            // Recharts' defaults are hardcoded (#fff background, #ccc border);
            // theme vars keep the tooltip following light/dark like the rest
            // of shadcn/ui. Item text stays per-slice via entry.color.
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
