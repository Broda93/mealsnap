"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyChart } from "@/components/weekly-chart";
import { CalorieTrendChart } from "@/components/calorie-trend-chart";
import { MacroStackedChart } from "@/components/macro-stacked-chart";
import { WeightPrediction } from "@/components/weight-prediction";
import { BodyCompositionChart } from "@/components/body-composition-chart";
import { DietTypeCard } from "@/components/diet-type-card";
import { IFStatsCard } from "@/components/if-stats-card";
import { ScoreChart } from "@/components/score-chart";
import { StatsSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/auth-context";
import type { Meal, BodyMeasurement } from "@/lib/types";
import { predictWeight, predictBodyFatGoal, formatDate } from "@/lib/nutrition";

type Period = "7" | "14" | "30";

function getDaysArray(period: number): string[] {
  const days: string[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

export default function StatsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7");

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const from = formatDate(ninetyDaysAgo);

      try {
        const [mealsRes, measRes] = await Promise.all([
          fetch(`/api/meals?from=${from}`),
          fetch(`/api/measurements?from=${from}`),
        ]);
        if (mealsRes.ok) setMeals(await mealsRes.json());
        if (measRes.ok) setMeasurements(await measRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [authLoading]);

  const dailyData = useMemo(() => {
    const map: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    meals.forEach((m) => {
      const date = m.eaten_at.substring(0, 10);
      if (!map[date]) map[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      map[date].calories += m.calories;
      map[date].protein += m.protein_g;
      map[date].carbs += m.carbs_g;
      map[date].fat += m.fat_g;
    });
    return map;
  }, [meals]);

  const periodNum = Number(period);
  const daysInPeriod = useMemo(() => getDaysArray(periodNum), [periodNum]);

  const calorieData = useMemo(() => {
    return daysInPeriod.map((date) => ({
      date,
      calories: dailyData[date]?.calories || 0,
    }));
  }, [daysInPeriod, dailyData]);

  const macroData = useMemo(() => {
    return daysInPeriod.map((date) => ({
      date,
      protein: dailyData[date]?.protein || 0,
      carbs: dailyData[date]?.carbs || 0,
      fat: dailyData[date]?.fat || 0,
    }));
  }, [daysInPeriod, dailyData]);

  const avgCalories = useMemo(() => {
    const withData = calorieData.filter((d) => d.calories > 0);
    if (withData.length === 0) return 0;
    return Math.round(withData.reduce((s, d) => s + d.calories, 0) / withData.length);
  }, [calorieData]);

  const avgMacros = useMemo(() => {
    const withData = macroData.filter((d) => d.protein + d.carbs + d.fat > 0);
    if (withData.length === 0) return { protein: 0, carbs: 0, fat: 0 };
    const n = withData.length;
    return {
      protein: Math.round(withData.reduce((s, d) => s + d.protein, 0) / n),
      carbs: Math.round(withData.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(withData.reduce((s, d) => s + d.fat, 0) / n),
    };
  }, [macroData]);

  const avg7 = useMemo(() => {
    const days = getDaysArray(7);
    const vals = days.map((d) => dailyData[d]?.calories || 0).filter((c) => c > 0);
    return vals.length ? Math.round(vals.reduce((s, c) => s + c, 0) / vals.length) : 0;
  }, [dailyData]);

  const avg30 = useMemo(() => {
    const days = getDaysArray(30);
    const vals = days.map((d) => dailyData[d]?.calories || 0).filter((c) => c > 0);
    return vals.length ? Math.round(vals.reduce((s, c) => s + c, 0) / vals.length) : 0;
  }, [dailyData]);

  const calorieTarget = profile?.daily_calorie_target || 2000;

  const trend = useMemo(() => {
    const last7 = getDaysArray(7).map((d) => dailyData[d]?.calories || 0);
    const recent = last7.slice(4).filter((c) => c > 0);
    const older = last7.slice(0, 4).filter((c) => c > 0);
    if (recent.length === 0 || older.length === 0) return "stable";
    const recentAvg = recent.reduce((s, c) => s + c, 0) / recent.length;
    const olderAvg = older.reduce((s, c) => s + c, 0) / older.length;
    const diff = recentAvg - olderAvg;
    if (diff > 100) return "up";
    if (diff < -100) return "down";
    return "stable";
  }, [dailyData]);

  const prediction = useMemo(() => {
    if (!profile || avg7 === 0) return null;
    return predictWeight(profile.weight_kg, calorieTarget, avg7, 30);
  }, [profile, calorieTarget, avg7]);

  const bfPrediction = useMemo(() => {
    if (!profile || !profile.body_fat_percent || avg7 === 0) return null;
    const tdee = calorieTarget + (profile.goal === "lose" ? 500 : profile.goal === "gain" ? -300 : 0);
    const dailyDeficit = tdee - avg7;
    if (dailyDeficit <= 0) return null;
    const targetBf = profile.gender === "male" ? 15 : 22;
    if (profile.body_fat_percent <= targetBf) return null;
    const days = predictBodyFatGoal(profile.weight_kg, profile.body_fat_percent, targetBf, dailyDeficit);
    return days ? { days, targetBf } : null;
  }, [profile, calorieTarget, avg7]);

  const weeklyComparison = useMemo(() => {
    const weeks: { label: string; avg: number }[] = [];
    for (let w = 0; w < Math.ceil(periodNum / 7); w++) {
      const start = w * 7;
      const end = Math.min(start + 7, periodNum);
      const weekDays = daysInPeriod.slice(start, end);
      const vals = weekDays.map((d) => dailyData[d]?.calories || 0).filter((c) => c > 0);
      const avg = vals.length ? Math.round(vals.reduce((s, c) => s + c, 0) / vals.length) : 0;
      weeks.push({ label: `Tyg ${w + 1}`, avg });
    }
    return weeks;
  }, [daysInPeriod, dailyData, periodNum]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          <span className="text-[var(--accent)]">Statystyki</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Twoje postepy i prognozy
        </p>
      </motion.div>

      {loading || authLoading ? (
        <StatsSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="warm-card p-4 text-center">
              <p className="text-2xl font-bold text-[var(--kcal)]">{avg7}</p>
              <p className="text-xs text-[var(--text-secondary)]">Srednia / 7 dni</p>
            </div>
            <div className="warm-card p-4 text-center">
              <p className="text-2xl font-bold text-[var(--kcal)]">{avg30}</p>
              <p className="text-xs text-[var(--text-secondary)]">Srednia / 30 dni</p>
            </div>
            <div className="warm-card p-4 text-center">
              <div className="flex justify-center">
                {trend === "up" && <TrendingUp className="h-6 w-6 text-[var(--kcal)]" />}
                {trend === "down" && <TrendingDown className="h-6 w-6 text-[var(--accent)]" />}
                {trend === "stable" && <Minus className="h-6 w-6 text-[var(--carbs)]" />}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {trend === "up" ? "Rosnie" : trend === "down" ? "Maleje" : "Stabilny"}
              </p>
            </div>
          </div>

          {/* Period toggle */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="w-full">
              <TabsTrigger value="7" className="flex-1">7 dni</TabsTrigger>
              <TabsTrigger value="14" className="flex-1">14 dni</TabsTrigger>
              <TabsTrigger value="30" className="flex-1">30 dni</TabsTrigger>
            </TabsList>
          </Tabs>

          <CalorieTrendChart data={calorieData} calorieTarget={calorieTarget} />
          <WeeklyChart data={calorieData} calorieTarget={calorieTarget} />
          <MacroStackedChart data={macroData} />

          {/* Score chart */}
          <ScoreChart meals={meals} days={daysInPeriod} />

          {/* Weekly averages vs target */}
          {weeklyComparison.length > 1 && (
            <div className="warm-card p-4">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-[var(--accent)]" />
                Srednie tygodniowe vs cel ({calorieTarget} kcal)
              </h3>
              <div className="space-y-2">
                {weeklyComparison.map((w) => {
                  const pct = calorieTarget > 0 ? Math.min((w.avg / calorieTarget) * 100, 120) : 0;
                  const over = w.avg > calorieTarget;
                  return (
                    <div key={w.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{w.label}</span>
                        <span
                          className="font-medium"
                          style={{ color: over ? "var(--kcal)" : "var(--accent)" }}
                        >
                          {w.avg > 0 ? `${w.avg} kcal` : "\u2014"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--warm-border)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: over ? "var(--kcal)" : "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Average macros for period */}
          <div className="warm-card p-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
              Srednie makro ({period} dni)
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-[var(--protein)]">{avgMacros.protein}g</p>
                <p className="text-xs text-[var(--text-secondary)]">Bialko</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--carbs)]">{avgMacros.carbs}g</p>
                <p className="text-xs text-[var(--text-secondary)]">Weglowodany</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--fat)]">{avgMacros.fat}g</p>
                <p className="text-xs text-[var(--text-secondary)]">Tluszcz</p>
              </div>
            </div>
          </div>

          {/* Weight prediction */}
          {prediction && profile && (
            <WeightPrediction
              currentWeight={profile.weight_kg}
              predictedWeight={prediction.predictedWeight}
              direction={prediction.direction}
              days={30}
            />
          )}

          {/* Body Composition Charts */}
          {measurements.length > 0 && (
            <>
              <BodyCompositionChart measurements={measurements} mode="bodyfat" />
              <BodyCompositionChart measurements={measurements} mode="composition" />
            </>
          )}

          {/* BF% Goal Prediction */}
          {bfPrediction && profile?.body_fat_percent && (
            <div className="warm-card p-4">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                Prognoza redukcji tkanki tluszczowej
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[var(--kcal)]">{profile.body_fat_percent}%</p>
                  <p className="text-xs text-[var(--text-secondary)]">Obecny BF%</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--accent)]">{bfPrediction.targetBf}%</p>
                  <p className="text-xs text-[var(--text-secondary)]">Cel BF%</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Przy obecnym deficycie osiagniesz cel za ok.{" "}
                  <span className="font-bold" style={{ color: "var(--text)" }}>
                    {bfPrediction.days} dni
                  </span>{" "}
                  ({Math.round(bfPrediction.days / 7)} tyg.)
                </p>
              </div>
            </div>
          )}

          {/* IF Stats */}
          {profile?.if_enabled && (
            <IFStatsCard meals={meals} profile={profile} days={daysInPeriod} />
          )}

          {/* Diet type - based on period average */}
          {avgMacros.protein + avgMacros.carbs + avgMacros.fat > 0 && (
            <DietTypeCard
              proteinG={avgMacros.protein}
              carbsG={avgMacros.carbs}
              fatG={avgMacros.fat}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
