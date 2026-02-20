"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MealCalendar } from "@/components/meal-calendar";
import { CalendarSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/auth-context";
import type { Meal } from "@/lib/types";

export default function CalendarPage() {
  const { profile, loading: authLoading } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const mealsRes = await fetch("/api/meals");
        if (mealsRes.ok) setMeals(await mealsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [authLoading]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/meals?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success("Posilek usuniety");
    } else {
      toast.error("Nie udalo sie usunac posilku");
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          <span className="text-[var(--accent)]">Kalendarz</span> posilkow
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Przegladaj swoje posilki wg dni
        </p>
      </motion.div>

      {loading || authLoading ? (
        <CalendarSkeleton />
      ) : (
        <MealCalendar
          meals={meals}
          calorieTarget={profile?.daily_calorie_target || 2000}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
