"use client";

import { useMemo } from "react";
import { Timer, Flame, TrendingUp } from "lucide-react";
import type { Meal, Profile } from "@/lib/types";

interface IFStatsCardProps {
  meals: Meal[];
  profile: Profile;
  days: string[];
}

export function IFStatsCard({ meals, profile, days }: IFStatsCardProps) {
  const stats = useMemo(() => {
    // Group meals by day
    const mealsByDay: Record<string, Meal[]> = {};
    meals.forEach((m) => {
      const date = m.eaten_at.substring(0, 10);
      if (!mealsByDay[date]) mealsByDay[date] = [];
      mealsByDay[date].push(m);
    });

    // Count compliant days (all meals in IF window)
    let compliantDays = 0;
    let totalDaysWithMeals = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Process days in chronological order
    const sortedDays = [...days].sort();

    for (const day of sortedDays) {
      const dayMeals = mealsByDay[day];
      if (!dayMeals || dayMeals.length === 0) continue;

      totalDaysWithMeals++;
      const allInWindow = dayMeals.every((m) => m.in_if_window !== false);

      if (allInWindow) {
        compliantDays++;
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Current streak: count from the most recent day backwards
    currentStreak = 0;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const dayMeals = mealsByDay[sortedDays[i]];
      if (!dayMeals || dayMeals.length === 0) continue;
      const allInWindow = dayMeals.every((m) => m.in_if_window !== false);
      if (allInWindow) {
        currentStreak++;
      } else {
        break;
      }
    }

    const compliancePercent = totalDaysWithMeals > 0
      ? Math.round((compliantDays / totalDaysWithMeals) * 100)
      : 0;

    // Average fasting time (simplified: based on protocol)
    const avgFastHours = 24 - profile.if_window_hours;

    return {
      compliancePercent,
      compliantDays,
      totalDaysWithMeals,
      currentStreak,
      maxStreak,
      avgFastHours,
    };
  }, [meals, profile, days]);

  return (
    <div className="warm-card p-4">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
        <Timer className="h-4 w-4" style={{ color: "var(--fast)" }} />
        Intermittent Fasting
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: "var(--fast-bg)", color: "var(--fast)" }}
        >
          {profile.if_protocol}
        </span>
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Compliance */}
        <div className="text-center">
          <p
            className="text-3xl font-extrabold"
            style={{
              color: stats.compliancePercent >= 80 ? "var(--good)" :
                     stats.compliancePercent >= 50 ? "var(--mid)" : "var(--bad)",
            }}
          >
            {stats.compliancePercent}%
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Compliance ({stats.compliantDays}/{stats.totalDaysWithMeals} dni)
          </p>
        </div>

        {/* Average fast time */}
        <div className="text-center">
          <p className="text-3xl font-extrabold" style={{ color: "var(--fast)" }}>
            {stats.avgFastHours}h
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Sredni czas postu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Current streak */}
        <div className="text-center rounded-xl p-3" style={{ backgroundColor: "var(--fast-bg)" }}>
          <div className="flex items-center justify-center gap-1.5">
            <Flame className="h-4 w-4" style={{ color: "var(--streak)" }} />
            <span className="text-xl font-bold" style={{ color: "var(--streak)" }}>
              {stats.currentStreak}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Aktualna seria</p>
        </div>

        {/* Max streak */}
        <div className="text-center rounded-xl p-3" style={{ backgroundColor: "var(--fast-bg)" }}>
          <div className="flex items-center justify-center gap-1.5">
            <TrendingUp className="h-4 w-4" style={{ color: "var(--fast)" }} />
            <span className="text-xl font-bold" style={{ color: "var(--fast)" }}>
              {stats.maxStreak}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Najdluzsza seria</p>
        </div>
      </div>
    </div>
  );
}
