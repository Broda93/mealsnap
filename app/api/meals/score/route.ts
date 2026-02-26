import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { scoreMeal } from "@/lib/gemini";
import { rateLimit, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    // Rate limit — 30 AI scorings per day
    const rl = rateLimit(user.id, "score", RATE_LIMITS.score);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Limit ocen AI wyczerpany. Sprobuj ponownie za ${rl.retryAfter}s.` },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { mealId } = await request.json();

    if (!mealId) {
      return NextResponse.json({ error: "Brak mealId" }, { status: 400 });
    }

    // Fetch the meal
    const { data: meal, error: mealError } = await supabase
      .from("meals")
      .select("*")
      .eq("id", mealId)
      .eq("profile_id", user.id)
      .single();

    if (mealError || !meal) {
      return NextResponse.json({ error: "Posilek nie znaleziony" }, { status: 404 });
    }

    // Fetch profile for daily goal
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_calorie_target, if_enabled")
      .eq("id", user.id)
      .single();

    const dailyKcalGoal = profile?.daily_calorie_target || 2000;

    // Fetch today's other meals for context
    const today = new Date().toISOString().substring(0, 10);
    const { data: todayMeals } = await supabase
      .from("meals")
      .select("calories, protein_g, carbs_g, fat_g")
      .eq("profile_id", user.id)
      .gte("eaten_at", today)
      .lte("eaten_at", today + "T23:59:59")
      .neq("id", mealId);

    const todayKcal = (todayMeals || []).reduce((s, m) => s + m.calories, 0);
    const todayProtein = (todayMeals || []).reduce((s, m) => s + m.protein_g, 0);
    const todayFat = (todayMeals || []).reduce((s, m) => s + m.fat_g, 0);
    const todayCarbs = (todayMeals || []).reduce((s, m) => s + m.carbs_g, 0);

    const mealTime = new Date(meal.eaten_at).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const result = await scoreMeal(
      {
        mealName: meal.name,
        kcal: meal.calories,
        protein: meal.protein_g,
        fat: meal.fat_g,
        carbs: meal.carbs_g,
        time: mealTime,
        inIfWindow: meal.in_if_window ?? true,
        dailyKcalGoal,
        todayKcal,
        todayProtein,
        todayFat,
        todayCarbs,
      },
      user.id,
      supabase
    );

    // Update the meal with score
    const { data: updated, error: updateError } = await supabase
      .from("meals")
      .update({ score: result.score, ai_comment: result.comment })
      .eq("id", mealId)
      .eq("profile_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Score update error:", updateError);
      return NextResponse.json({ error: "Blad zapisu score" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Score error:", message);

    if (message.startsWith("COST_LIMIT|")) {
      return NextResponse.json(
        { error: message.split("|")[1] },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "Blad scoringu" }, { status: 500 });
  }
}
