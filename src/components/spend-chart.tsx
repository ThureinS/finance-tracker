"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
          <Tooltip formatter={(value) => currency.format(Number(value))} />
          <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
