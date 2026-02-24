"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Utensils, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MealCard } from "@/components/meal-card";
import { DailySummary } from "@/components/daily-summary";
import { MacroRing } from "@/components/macro-ring";
import { BodyFatCard } from "@/components/body-fat-card";
import { DietTypeCard } from "@/components/diet-type-card";
import { IFTimer } from "@/components/if-timer";
import { SmartSuggestion } from "@/components/smart-suggestion";
import { DashboardSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/auth-context";
import type { Meal } from "@/lib/types";

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6) return { text: "Dobrej nocy", emoji: "🌙" };
  if (h < 12) return { text: "Dzien dobry", emoji: "☀️" };
  if (h < 18) return { text: "Dobre popoludnie", emoji: "🌤️" };
  return { text: "Dobry wieczor", emoji: "🌆" };
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function Dashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().substring(0, 10);

  const fetchData = useCallback(async () => {
    try {
      const mealsRes = await fetch(`/api/meals?from=${today}&to=${today}`);
      if (mealsRes.ok) {
        setMeals(await mealsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/meals?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success("Posilek usuniety");
    } else {
      toast.error("Nie udalo sie usunac posilku");
    }
  };

  const handleUpdate = (updated: Meal) => {
    setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein_g, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs_g, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat_g, 0);
  const calorieTarget = profile?.daily_calorie_target || 2000;
  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>{greeting.emoji}</span>
            <span>{greeting.text},</span>
            <span className="text-[var(--accent)]">{profile?.name || "..."}</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {new Date().toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Link href="/add">
          <Button className="bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj
          </Button>
        </Link>
      </motion.div>

      {loading || authLoading ? (
        <DashboardSkeleton />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* IF Timer */}
          {profile?.if_enabled && (
            <motion.div variants={fadeUp}>
              <IFTimer profile={profile} />
            </motion.div>
          )}

          {/* Bento grid - hero row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp} className="md:row-span-1">
              <DailySummary totalCalories={totalCalories} calorieTarget={calorieTarget} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MacroRing protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
            </motion.div>
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp}>
              <DietTypeCard proteinG={totalProtein} carbsG={totalCarbs} fatG={totalFat} />
            </motion.div>
            {profile?.body_fat_percent && (
              <motion.div variants={fadeUp}>
                <BodyFatCard bodyFatPercent={profile.body_fat_percent} gender={profile.gender} />
              </motion.div>
            )}
          </div>

          {/* Smart suggestion */}
          {meals.length > 0 && profile && (
            <motion.div variants={fadeUp}>
              <SmartSuggestion
                totalCalories={totalCalories}
                totalProtein={totalProtein}
                totalCarbs={totalCarbs}
                totalFat={totalFat}
                calorieTarget={calorieTarget}
                profile={profile}
                mealCount={meals.length}
              />
            </motion.div>
          )}

          {/* Meals section */}
          <motion.div variants={fadeUp} className="space-y-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Dzisiejsze posilki</h2>
              <span className="text-[var(--text-secondary)] text-sm">({meals.length})</span>
            </div>
            {meals.length === 0 ? (
              <div className="warm-card text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: "var(--accent)", opacity: 0.1 }}>
                  <Sparkles className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <p className="text-[var(--text-secondary)]">Brak posilkow dzisiaj</p>
                <Link href="/add">
                  <Button variant="link" className="text-[var(--accent)] mt-2">
                    Dodaj pierwszy posilek
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} onDelete={handleDelete} onUpdate={handleUpdate} />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
