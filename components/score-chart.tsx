"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { Meal } from "@/lib/types";

interface ScoreChartProps {
  meals: Meal[];
  days: string[];
}

function getScoreColor(score: number): string {
  if (score >= 7) return "var(--good)";
  if (score >= 5) return "var(--mid)";
  return "var(--bad)";
}

export function ScoreChart({ meals, days }: ScoreChartProps) {
  const data = useMemo(() => {
    const byDay: Record<string, number[]> = {};
    meals.forEach((m) => {
      if (m.score == null) return;
      const date = m.eaten_at.substring(0, 10);
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(m.score);
    });

    return days.map((date) => {
      const scores = byDay[date];
      const avg = scores && scores.length > 0
        ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
        : 0;
      return {
        date: date.substring(5), // MM-DD
        score: avg,
      };
    });
  }, [meals, days]);

  const hasScores = data.some((d) => d.score > 0);
  if (!hasScores) return null;

  return (
    <div className="warm-card p-4">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
        Score posilkow
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "none",
              borderRadius: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              fontSize: 12,
            }}
            formatter={(value) => [`${value}/10`, "Score"]}
          />
          <ReferenceLine
            y={7}
            stroke="var(--good)"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
          <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.score > 0 ? getScoreColor(entry.score) : "var(--warm-border)"}
                fillOpacity={entry.score > 0 ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
