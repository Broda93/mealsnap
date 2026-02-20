"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DailyMacro {
  date: string;
  protein: number;
  carbs: number;
  fat: number;
}

interface MacroStackedChartProps {
  data: DailyMacro[];
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "none",
  borderRadius: "12px",
  color: "var(--text)",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
};

export function MacroStackedChart({ data }: MacroStackedChartProps) {
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
        Makroskladniki dziennie (g)
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
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  protein: "Bialko",
                  carbs: "Weglowodany",
                  fat: "Tluszcz",
                };
                return [`${Math.round(Number(value))}g`, labels[String(name)] || String(name)];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  protein: "Bialko",
                  carbs: "Wegle",
                  fat: "Tluszcz",
                };
                return labels[value] || value;
              }}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="protein" stackId="macro" fill="var(--protein)" radius={[0, 0, 0, 0]} maxBarSize={40} />
            <Bar dataKey="carbs" stackId="macro" fill="var(--carbs)" radius={[0, 0, 0, 0]} maxBarSize={40} />
            <Bar dataKey="fat" stackId="macro" fill="var(--fat)" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
