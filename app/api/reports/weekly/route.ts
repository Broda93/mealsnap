import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generateWeeklyReport } from "@/lib/gemini";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Brak profilu" }, { status: 404 });
    }

    // Get last 7 days of meals
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const from = sevenDaysAgo.toISOString().substring(0, 10);

    const { data: meals } = await supabase
      .from("meals")
      .select("*")
      .eq("profile_id", user.id)
      .gte("eaten_at", from)
      .order("eaten_at", { ascending: true });

    if (!meals || meals.length === 0) {
      return NextResponse.json(
        { error: "Brak posilkow z ostatnich 7 dni" },
        { status: 400 }
      );
    }

    // Calculate IF compliance
    let ifCompliance = 0;
    if (profile.if_enabled) {
      const mealsByDay: Record<string, typeof meals> = {};
      meals.forEach((m) => {
        const date = m.eaten_at.substring(0, 10);
        if (!mealsByDay[date]) mealsByDay[date] = [];
        mealsByDay[date].push(m);
      });
      const totalDays = Object.keys(mealsByDay).length;
      const compliantDays = Object.values(mealsByDay).filter(
        (dayMeals) => dayMeals.every((m) => m.in_if_window !== false)
      ).length;
      ifCompliance = totalDays > 0 ? Math.round((compliantDays / totalDays) * 100) : 0;
    }

    // Simplified meals JSON for prompt (reduce token usage)
    const mealsSimplified = meals.map((m) => ({
      date: m.eaten_at.substring(0, 10),
      time: m.eaten_at.substring(11, 16),
      name: m.name,
      kcal: m.calories,
      protein: m.protein_g,
      carbs: m.carbs_g,
      fat: m.fat_g,
      score: m.score,
      inIF: m.in_if_window,
    }));

    // Estimate macro goals from calorie target
    const kcalGoal = profile.daily_calorie_target || 2000;
    const proteinGoal = Math.round(kcalGoal * 0.3 / 4);
    const carbsGoal = Math.round(kcalGoal * 0.4 / 4);
    const fatGoal = Math.round(kcalGoal * 0.3 / 9);

    const report = await generateWeeklyReport(
      {
        mealsJson: JSON.stringify(mealsSimplified),
        kcalGoal,
        proteinGoal,
        carbsGoal,
        fatGoal,
        ifEnabled: profile.if_enabled || false,
        ifProtocol: profile.if_protocol || "16:8",
        ifCompliance,
      },
      user.id,
      supabase
    );

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Weekly report error:", message);

    if (message.startsWith("COST_LIMIT|")) {
      return NextResponse.json(
        { error: message.split("|")[1] },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "Blad generowania raportu" }, { status: 500 });
  }
}
