"use client";

import { motion } from "framer-motion";

interface MacroRingProps {
  protein: number;
  carbs: number;
  fat: number;
}

const MACROS = [
  { key: "protein", label: "Bialko", cssColor: "var(--protein)", cssSoft: "var(--protein-soft)" },
  { key: "carbs", label: "Wegle", cssColor: "var(--carbs)", cssSoft: "var(--carbs-soft)" },
  { key: "fat", label: "Tluszcz", cssColor: "var(--fat)", cssSoft: "var(--fat-soft)" },
] as const;

export function MacroRing({ protein, carbs, fat }: MacroRingProps) {
  const values = { protein, carbs, fat };
  const total = protein + carbs + fat;

  if (total === 0) {
    return (
      <div className="warm-card p-6 h-full">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Makroskladniki</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-[var(--text-secondary)] text-sm">Brak danych</p>
        </div>
      </div>
    );
  }

  return (
    <div className="warm-card p-6 h-full">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Makroskladniki</h3>

      <div className="space-y-4">
        {MACROS.map((macro, i) => {
          const value = values[macro.key];
          const pct = Math.round((value / total) * 100);
          return (
            <motion.div
              key={macro.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: macro.cssColor }}>
                  {macro.label}
                </span>
                <div className="text-sm">
                  <span className="font-semibold">{value.toFixed(0)}g</span>
                  <span className="text-[var(--text-secondary)] ml-1">{pct}%</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: macro.cssSoft }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: macro.cssColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}

        <div className="text-center pt-1">
          <span className="text-lg font-bold">{Math.round(total)}g</span>
          <span className="text-xs text-[var(--text-secondary)] ml-1">razem</span>
        </div>
      </div>
    </div>
  );
}
