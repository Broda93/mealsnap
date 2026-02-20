"use client";

import { motion } from "framer-motion";
import { Flame, Target } from "lucide-react";

interface DailySummaryProps {
  totalCalories: number;
  calorieTarget: number;
}

export function DailySummary({ totalCalories, calorieTarget }: DailySummaryProps) {
  const percentage = calorieTarget > 0 ? Math.min((totalCalories / calorieTarget) * 100, 100) : 0;
  const remaining = Math.max(calorieTarget - totalCalories, 0);
  const over = totalCalories > calorieTarget;

  return (
    <div className="warm-card p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-[var(--kcal)]" />
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Cel dzienny</h3>
      </div>

      <div className="space-y-4">
        {/* Big calorie number */}
        <div className="text-center">
          <motion.span
            className="text-4xl font-bold text-[var(--kcal)]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {totalCalories}
          </motion.span>
          <span className="text-sm text-[var(--text-secondary)] ml-1">kcal</span>
        </div>

        {/* Horizontal progress bar */}
        <div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--kcal-soft)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "var(--kcal)" }}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-[var(--text-secondary)]">
            <span>{Math.round(percentage)}% celu</span>
            <span>{calorieTarget} kcal</span>
          </div>
        </div>

        {/* Remaining / over */}
        {over ? (
          <div className="flex items-center justify-center gap-1.5 text-[var(--destructive)]">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-medium">
              +{totalCalories - calorieTarget} ponad cel
            </span>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-[var(--text-secondary)]">Zostalo</p>
            <p className="text-lg font-semibold text-[var(--accent)]">{remaining} kcal</p>
          </div>
        )}
      </div>
    </div>
  );
}
