"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BodyMeasurement } from "@/lib/types";

interface BodyCompositionChartProps {
  measurements: BodyMeasurement[];
  mode: "bodyfat" | "composition";
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--warm-border)",
  borderRadius: "8px",
  color: "var(--text)",
};

export function BodyCompositionChart({ measurements, mode }: BodyCompositionChartProps) {
  if (measurements.length === 0) {
    return (
      <div className="warm-card p-6 text-center text-[var(--text-secondary)] text-sm">
        Brak pomiarow. Dodaj pierwszy pomiar w profilu.
      </div>
    );
  }

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = sorted.map((m) => ({
    date: new Date(m.date + "T00:00:00").toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    }),
    bf: m.body_fat_percent,
    weight: m.weight_kg,
    lean: m.lean_mass_kg,
    fat: m.fat_mass_kg,
  }));

  if (mode === "bodyfat") {
    return (
      <div className="warm-card p-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">% Tkanki tluszczowej</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--warm-border)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Body fat"]} />
              <Line
                type="monotone"
                dataKey="bf"
                stroke="var(--kcal)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--kcal)" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="warm-card p-4">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Sklad ciala (kg)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--warm-border)" />
            <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
            <YAxis stroke="var(--text-secondary)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line
              type="monotone"
              dataKey="weight"
              name="Waga"
              stroke="var(--kcal)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="lean"
              name="Masa beztl."
              stroke="var(--protein)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="fat"
              name="Masa tl."
              stroke="var(--fat)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
