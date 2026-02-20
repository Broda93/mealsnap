"use client";

import { BODY_FAT_CATEGORIES, type BodyFatCategory } from "@/lib/types";
import { getBodyFatCategory } from "@/lib/nutrition";

interface BodyFatCardProps {
  bodyFatPercent: number | null;
  gender: "male" | "female";
}

export function BodyFatCard({ bodyFatPercent, gender }: BodyFatCardProps) {
  if (!bodyFatPercent) return null;

  const category = getBodyFatCategory(bodyFatPercent, gender);
  const info = BODY_FAT_CATEGORIES[category];

  return (
    <div className="warm-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Tkanka tluszczowa</p>
          <p className="text-2xl font-bold" style={{ color: info.color }}>
            {bodyFatPercent}%
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: info.color }}
        >
          {info.label}
        </div>
      </div>
      {/* Mini bar showing position on scale */}
      <div className="mt-3 relative h-2 rounded-full overflow-hidden flex">
        {(Object.keys(BODY_FAT_CATEGORIES) as BodyFatCategory[]).map((key) => (
          <div
            key={key}
            className="flex-1 h-full"
            style={{ backgroundColor: BODY_FAT_CATEGORIES[key].color, opacity: 0.3 }}
          />
        ))}
        <div
          className="absolute top-0 h-full w-1 rounded-full shadow-lg"
          style={{
            left: `${Math.min(Math.max(((bodyFatPercent - 5) / 45) * 100, 0), 100)}%`,
            backgroundColor: "var(--text)",
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[var(--text-secondary)]">5%</span>
        <span className="text-[9px] text-[var(--text-secondary)]">50%</span>
      </div>
    </div>
  );
}
