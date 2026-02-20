"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { MealCard } from "./meal-card";
import type { Meal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MealCalendarProps {
  meals: Meal[];
  calorieTarget: number;
  onDelete?: (id: string) => void;
}

export function MealCalendar({ meals, calorieTarget, onDelete }: MealCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const dailyStats = useMemo(() => {
    const map: Record<string, { calories: number; protein: number; carbs: number; fat: number; scores: number[] }> = {};
    meals.forEach((m) => {
      const date = m.eaten_at.substring(0, 10);
      if (!map[date]) map[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, scores: [] };
      map[date].calories += m.calories;
      map[date].protein += m.protein_g;
      map[date].carbs += m.carbs_g;
      map[date].fat += m.fat_g;
      if (m.score != null) map[date].scores.push(m.score);
    });
    return map;
  }, [meals]);

  const selectedMeals = useMemo(() => {
    if (!selectedDate) return [];
    return meals
      .filter((m) => m.eaten_at.substring(0, 10) === selectedDate)
      .sort((a, b) => new Date(a.eaten_at).getTime() - new Date(b.eaten_at).getTime());
  }, [meals, selectedDate]);

  const getDotColor = (date: string) => {
    const stats = dailyStats[date];
    if (!stats) return "";
    // If scores available, color by avg score
    if (stats.scores.length > 0) {
      const avg = stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length;
      if (avg >= 7) return "var(--good)";
      if (avg >= 5) return "var(--mid)";
      return "var(--bad)";
    }
    // Fallback: color by calorie target
    if (stats.calories <= calorieTarget) return "var(--good)";
    if (stats.calories <= calorieTarget * 1.15) return "var(--mid)";
    return "var(--bad)";
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthName = currentMonth.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  const weekDays = ["Pn", "Wt", "Sr", "Cz", "Pt", "Sb", "Nd"];

  return (
    <div className="space-y-4">
      <div className="warm-card p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize">
            {monthName}
          </h3>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div
              key={d}
              className="text-center text-xs text-[var(--text-secondary)] py-2"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const stats = dailyStats[dateStr];
            const hasMeals = !!stats;
            const isSelected = selectedDate === dateStr;
            const isToday =
              dateStr === new Date().toISOString().substring(0, 10);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "relative flex flex-col items-center py-2 rounded-lg transition-all text-sm",
                  isSelected && "bg-[var(--accent)] text-white",
                  isToday && !isSelected && "ring-1 ring-[var(--accent)]",
                  !isSelected && "hover:bg-[var(--warm-border)]"
                )}
              >
                {day}
                {hasMeals && (
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{ backgroundColor: isSelected ? "white" : getDotColor(dateStr) }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="font-semibold">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            {selectedMeals.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-sm">Brak posilkow tego dnia</p>
            ) : (
              <div className="space-y-3">
                {/* Daily summary card */}
                {(() => {
                  const stats = dailyStats[selectedDate];
                  if (!stats) return null;
                  const avgScore = stats.scores.length > 0
                    ? Math.round((stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length) * 10) / 10
                    : null;
                  return (
                    <div className="warm-card p-3">
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div>
                          <p className="text-sm font-bold text-[var(--kcal)]">{stats.calories}</p>
                          <p className="text-[9px] text-[var(--text-secondary)]">kcal</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--protein)]">{Math.round(stats.protein)}g</p>
                          <p className="text-[9px] text-[var(--text-secondary)]">bialko</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--carbs)]">{Math.round(stats.carbs)}g</p>
                          <p className="text-[9px] text-[var(--text-secondary)]">wegle</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--fat)]">{Math.round(stats.fat)}g</p>
                          <p className="text-[9px] text-[var(--text-secondary)]">tluszcz</p>
                        </div>
                        {avgScore !== null && (
                          <div>
                            <p
                              className="text-sm font-bold"
                              style={{ color: avgScore >= 7 ? "var(--good)" : avgScore >= 5 ? "var(--mid)" : "var(--bad)" }}
                            >
                              {avgScore}
                            </p>
                            <p className="text-[9px] text-[var(--text-secondary)]">score</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {selectedMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} onDelete={onDelete} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
