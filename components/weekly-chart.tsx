"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface WeeklyChartProps {
  data: { date: string; calories: number }[];
  calorieTarget: number;
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "none",
  borderRadius: "12px",
  color: "var(--text)",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
};

export function WeeklyChart({ data, calorieTarget }: WeeklyChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    day: new Date(d.date + "T00:00:00").toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="warm-card p-4">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
        Kalorie dzienne
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--warm-border)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} kcal`, "Kalorie"]} />
            <ReferenceLine
              y={calorieTarget}
              stroke="var(--accent)"
              strokeDasharray="5 5"
              strokeOpacity={0.6}
              label={{
                value: "Cel",
                fill: "var(--accent)",
                fontSize: 10,
              }}
            />
            <Bar dataKey="calories" radius={[8, 8, 0, 0]} maxBarSize={40}>
              {formatted.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.calories > calorieTarget * 1.15 ? "var(--bad)" : entry.calories > calorieTarget ? "var(--mid)" : "var(--kcal)"}
                  fillOpacity={entry.calories > 0 ? 1 : 0.2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
