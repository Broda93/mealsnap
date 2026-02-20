"use client";

import { DIET_TYPE_INFO } from "@/lib/types";
import { classifyDiet, getMacroPercentages } from "@/lib/nutrition";

interface DietTypeCardProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function DietTypeCard({ proteinG, carbsG, fatG }: DietTypeCardProps) {
  const totalKcal = proteinG * 4 + carbsG * 4 + fatG * 9;
  if (totalKcal === 0) return null;

  const dietType = classifyDiet(proteinG, carbsG, fatG);
  const info = DIET_TYPE_INFO[dietType];
  const pct = getMacroPercentages(proteinG, carbsG, fatG);

  return (
    <div className="warm-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Typ diety dzis</p>
          <p className="text-lg font-bold" style={{ color: info.color }}>
            {info.emoji} {info.label}
          </p>
        </div>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-3">{info.description}</p>
      {/* Macro percentage bar */}
      <div className="h-3 rounded-full overflow-hidden flex">
        <div
          className="h-full transition-all"
          style={{ width: `${pct.protein}%`, backgroundColor: "var(--protein)" }}
          title={`Bialko ${pct.protein}%`}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${pct.carbs}%`, backgroundColor: "var(--carbs)" }}
          title={`Weglowodany ${pct.carbs}%`}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${pct.fat}%`, backgroundColor: "var(--fat)" }}
          title={`Tluszcz ${pct.fat}%`}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--protein)" }} />
          B {pct.protein}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--carbs)" }} />
          W {pct.carbs}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--fat)" }} />
          T {pct.fat}%
        </span>
      </div>
    </div>
  );
}
