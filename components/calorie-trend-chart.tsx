"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

interface CalorieTrendChartProps {
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

export function CalorieTrendChart({ data, calorieTarget }: CalorieTrendChartProps) {
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
        Trend kalorii
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="calorieGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--kcal)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--kcal)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
                value: `Cel: ${calorieTarget}`,
                fill: "var(--accent)",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <Area
              type="monotone"
              dataKey="calories"
              stroke="var(--kcal)"
              fill="url(#calorieGrad)"
              strokeWidth={2.5}
              dot={{
                fill: "var(--surface)",
                stroke: "var(--kcal)",
                strokeWidth: 2,
                r: 3.5,
              }}
              activeDot={{
                r: 5,
                fill: "var(--kcal)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
