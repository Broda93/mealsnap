"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Trophy, AlertTriangle, Lightbulb, Timer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalorieTrendChart } from "@/components/calorie-trend-chart";
import { MacroStackedChart } from "@/components/macro-stacked-chart";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/nutrition";
import type { Meal } from "@/lib/types";
import type { WeeklyReportData } from "@/lib/gemini";

function getDaysArray(period: number): string[] {
  const days: string[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

export default function ReportPage() {
  const { profile, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => getDaysArray(7), []);

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const from = days[0];
        const to = days[days.length - 1];
        const res = await fetch(`/api/meals?from=${from}&to=${to}`);
        if (res.ok) setMeals(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [authLoading, days]);

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

  const calorieData = useMemo(
    () => days.map((date) => ({ date, calories: dailyData[date]?.calories || 0 })),
    [days, dailyData]
  );

  const macroData = useMemo(
    () => days.map((date) => ({
      date,
      protein: dailyData[date]?.protein || 0,
      carbs: dailyData[date]?.carbs || 0,
      fat: dailyData[date]?.fat || 0,
    })),
    [days, dailyData]
  );

  const avgKcal = useMemo(() => {
    const withData = calorieData.filter((d) => d.calories > 0);
    return withData.length ? Math.round(withData.reduce((s, d) => s + d.calories, 0) / withData.length) : 0;
  }, [calorieData]);

  const avgMacros = useMemo(() => {
    const withData = macroData.filter((d) => d.protein + d.carbs + d.fat > 0);
    if (!withData.length) return { protein: 0, carbs: 0, fat: 0 };
    const n = withData.length;
    return {
      protein: Math.round(withData.reduce((s, d) => s + d.protein, 0) / n),
      carbs: Math.round(withData.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(withData.reduce((s, d) => s + d.fat, 0) / n),
    };
  }, [macroData]);

  const avgScore = useMemo(() => {
    const scored = meals.filter((m) => m.score != null);
    if (!scored.length) return 0;
    return Math.round((scored.reduce((s, m) => s + (m.score || 0), 0) / scored.length) * 10) / 10;
  }, [meals]);

  const ifCompliance = useMemo(() => {
    if (!profile?.if_enabled) return null;
    const mealsByDay: Record<string, Meal[]> = {};
    meals.forEach((m) => {
      const date = m.eaten_at.substring(0, 10);
      if (!mealsByDay[date]) mealsByDay[date] = [];
      mealsByDay[date].push(m);
    });
    const totalDays = Object.keys(mealsByDay).length;
    const compliantDays = Object.values(mealsByDay).filter(
      (dayMeals) => dayMeals.every((m) => m.in_if_window !== false)
    ).length;
    return totalDays > 0 ? Math.round((compliantDays / totalDays) * 100) : 0;
  }, [meals, profile]);

  const calorieTarget = profile?.daily_calorie_target || 2000;

  const generateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/weekly", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Blad generowania");
      }
      setReport(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad generowania raportu");
    } finally {
      setGenerating(false);
    }
  };

  const dateRange = `${days[0].substring(5).replace("-", ".")}–${days[days.length - 1].substring(5).replace("-", ".")} ${new Date().getFullYear()}`;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          Raport <span className="text-[var(--accent)]">tygodniowy</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">{dateRange}</p>
      </motion.div>

      {loading || authLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : meals.length === 0 ? (
        <div className="warm-card text-center py-12 px-4">
          <p className="text-[var(--text-secondary)]">Brak posilkow z ostatnich 7 dni</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="warm-card p-4 text-center">
              <p
                className="text-2xl font-bold"
                style={{
                  color: Math.abs(avgKcal - calorieTarget) < 200 ? "var(--good)" : "var(--kcal)",
                }}
              >
                {avgKcal}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">Srednie kcal</p>
              <p className="text-[10px] text-[var(--text-secondary)]">cel: {calorieTarget}</p>
            </div>
            <div className="warm-card p-4 text-center">
              <p className="text-2xl font-bold text-[var(--protein)]">{avgMacros.protein}g</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Srednie bialko</p>
            </div>
            <div className="warm-card p-4 text-center">
              <p
                className="text-2xl font-bold"
                style={{
                  color: avgScore >= 7 ? "var(--good)" : avgScore >= 5 ? "var(--mid)" : avgScore > 0 ? "var(--bad)" : "var(--text-secondary)",
                }}
              >
                {avgScore > 0 ? avgScore : "—"}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">Sredni score</p>
            </div>
          </div>

          {/* Charts */}
          <CalorieTrendChart data={calorieData} calorieTarget={calorieTarget} />
          <MacroStackedChart data={macroData} />

          {/* IF Compliance */}
          {ifCompliance !== null && (
            <div className="warm-card p-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                <Timer className="h-5 w-5" style={{ color: "var(--fast)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">IF Compliance</p>
                <div className="h-2 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--fast-bg)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${ifCompliance}%`,
                      backgroundColor: "var(--fast)",
                    }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--fast)" }}>
                {ifCompliance}%
              </span>
            </div>
          )}

          {/* AI Report Section */}
          {!report ? (
            <div className="warm-card p-6 text-center space-y-3">
              <Sparkles className="h-8 w-8 mx-auto" style={{ color: "var(--accent)" }} />
              <div>
                <p className="font-semibold">Twoj AI Trener podsumowuje</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Wygeneruj spersonalizowany raport z rekomendacjami
                </p>
              </div>
              {error && (
                <p className="text-sm" style={{ color: "var(--bad)" }}>{error}</p>
              )}
              <Button
                onClick={generateReport}
                disabled={generating}
                className="bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generuje...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generuj raport AI
                  </>
                )}
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Summary text */}
              <div className="warm-card p-4">
                <p className="text-sm leading-relaxed">{report.summary}</p>
              </div>

              {/* Best / Worst day */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "var(--good-bg)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4" style={{ color: "var(--good)" }} />
                    <span className="text-sm font-bold" style={{ color: "var(--good)" }}>
                      Najlepszy dzien
                    </span>
                  </div>
                  <p className="text-xs font-medium">{report.bestDay.date}</p>
                  {report.bestDay.score > 0 && (
                    <p className="text-xs text-[var(--text-secondary)]">Score: {report.bestDay.score}/10</p>
                  )}
                  <p className="text-sm mt-1">{report.bestDay.reason}</p>
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "var(--bad-bg)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" style={{ color: "var(--bad)" }} />
                    <span className="text-sm font-bold" style={{ color: "var(--bad)" }}>
                      Do poprawy
                    </span>
                  </div>
                  <p className="text-xs font-medium">{report.worstDay.date}</p>
                  {report.worstDay.score > 0 && (
                    <p className="text-xs text-[var(--text-secondary)]">Score: {report.worstDay.score}/10</p>
                  )}
                  <p className="text-sm mt-1">{report.worstDay.reason}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="warm-card p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-bold">Rekomendacje AI</span>
                </div>
                {report.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="text-sm leading-relaxed pl-3"
                    style={{ borderLeft: "3px solid var(--accent)" }}
                  >
                    {rec}
                  </div>
                ))}
              </div>

              {/* Regenerate button */}
              <Button
                onClick={generateReport}
                disabled={generating}
                variant="outline"
                className="w-full rounded-xl"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Regeneruj raport
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
