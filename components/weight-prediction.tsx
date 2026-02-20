"use client";

import { TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";

interface WeightPredictionProps {
  currentWeight: number;
  predictedWeight: number;
  direction: "lose" | "gain" | "maintain";
  days: number;
}

export function WeightPrediction({
  currentWeight,
  predictedWeight,
  direction,
  days,
}: WeightPredictionProps) {
  const diff = Math.abs(predictedWeight - currentWeight).toFixed(1);

  const config = {
    lose: {
      icon: TrendingDown,
      color: "var(--accent)",
      bg: "var(--protein-soft)",
      label: `Schudniesz ~${diff} kg`,
    },
    gain: {
      icon: TrendingUp,
      color: "var(--kcal)",
      bg: "var(--kcal-soft)",
      label: `Przytyjesz ~${diff} kg`,
    },
    maintain: {
      icon: Minus,
      color: "var(--carbs)",
      bg: "var(--carbs-soft)",
      label: "Utrzymasz wage",
    },
  };

  const { icon: Icon, color, bg, label } = config[direction];

  return (
    <div className="warm-card p-4">
      <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-[var(--text-secondary)]">
        <Scale className="h-4 w-4" />
        Prognoza wagi ({days} dni)
      </h3>
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{ backgroundColor: bg }}
      >
        <Icon className="h-8 w-8" style={{ color }} />
        <div>
          <p className="text-lg font-bold" style={{ color }}>{label}</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {currentWeight} kg &rarr; ~{predictedWeight} kg
          </p>
        </div>
      </div>
    </div>
  );
}
