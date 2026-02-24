import type { Profile, Meal, DailySummary, BodyFatCategory, DietType } from "./types";

// Mifflin-St Jeor BMR
export function calculateBMR(profile: Profile): number {
  const { weight_kg, height_cm, age, gender } = profile;
  if (gender === "male") {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  }
  return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS: Record<Profile["activity_level"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTDEE(profile: Profile): number {
  return Math.round(calculateBMR(profile) * ACTIVITY_MULTIPLIERS[profile.activity_level]);
}

export function calculateCalorieTarget(profile: Profile): number {
  const tdee = calculateTDEE(profile);
  switch (profile.goal) {
    case "lose":
      return Math.round(tdee - 500);
    case "gain":
      return Math.round(tdee + 300);
    default:
      return tdee;
  }
}

export function getDailySummary(meals: Meal[], date: string): DailySummary {
  const dayMeals = meals.filter(
    (m) => m.eaten_at.substring(0, 10) === date
  );
  return {
    date,
    meals: dayMeals,
    totalCalories: dayMeals.reduce((s, m) => s + m.calories, 0),
    totalProtein: dayMeals.reduce((s, m) => s + m.protein_g, 0),
    totalCarbs: dayMeals.reduce((s, m) => s + m.carbs_g, 0),
    totalFat: dayMeals.reduce((s, m) => s + m.fat_g, 0),
    totalFiber: dayMeals.reduce((s, m) => s + m.fiber_g, 0),
  };
}

// 1 kg fat ~ 7700 kcal
export function predictWeight(
  currentWeight: number,
  dailyTarget: number,
  avgDailyIntake: number,
  days: number = 30
): { predictedWeight: number; direction: "lose" | "gain" | "maintain" } {
  const dailyDiff = avgDailyIntake - dailyTarget;
  // For goal-based: if target is set to lose, TDEE is higher
  // So if eating at target, dailyDiff to TDEE matters
  const totalDiff = dailyDiff * days;
  const weightChange = totalDiff / 7700;
  const predictedWeight = Math.round((currentWeight + weightChange) * 10) / 10;

  let direction: "lose" | "gain" | "maintain";
  if (weightChange < -0.5) direction = "lose";
  else if (weightChange > 0.5) direction = "gain";
  else direction = "maintain";

  return { predictedWeight, direction };
}

export function formatDate(date: Date): string {
  return date.toISOString().substring(0, 10);
}

export function calculateFatMass(weightKg: number, bodyFatPercent: number): number {
  return Math.round((weightKg * bodyFatPercent) / 100 * 10) / 10;
}

export function calculateLeanMass(weightKg: number, bodyFatPercent: number): number {
  return Math.round(weightKg * (1 - bodyFatPercent / 100) * 10) / 10;
}

export function getBodyFatCategory(bodyFatPercent: number, gender: "male" | "female"): BodyFatCategory {
  const key = gender === "male" ? "maleRange" : "femaleRange";
  if (bodyFatPercent <= (gender === "male" ? 13 : 20)) return "athletic";
  if (bodyFatPercent <= (gender === "male" ? 17 : 24)) return "fit";
  if (bodyFatPercent <= (gender === "male" ? 24 : 31)) return "average";
  return "overweight";
}

// Predict days to reach target body fat % at current caloric deficit
// Assumes ~7700 kcal per kg of fat lost, and fat loss is proportional
export function predictBodyFatGoal(
  currentWeight: number,
  currentBf: number,
  targetBf: number,
  dailyDeficit: number // kcal/day (positive = deficit)
): number | null {
  if (dailyDeficit <= 0 || currentBf <= targetBf) return null;
  const currentFatKg = currentWeight * currentBf / 100;
  const targetFatKg = currentWeight * targetBf / 100; // simplified
  const fatToLose = currentFatKg - targetFatKg;
  const daysNeeded = Math.ceil((fatToLose * 7700) / dailyDeficit);
  return daysNeeded;
}

// Classify diet based on macro percentages of total calories
// protein: 4 kcal/g, carbs: 4 kcal/g, fat: 9 kcal/g
export function classifyDiet(proteinG: number, carbsG: number, fatG: number): DietType {
  const proteinKcal = proteinG * 4;
  const carbsKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const total = proteinKcal + carbsKcal + fatKcal;

  if (total === 0) return "balanced";

  const proteinPct = (proteinKcal / total) * 100;
  const carbsPct = (carbsKcal / total) * 100;
  const fatPct = (fatKcal / total) * 100;

  // Keto: fat > 65% AND carbs < 10%
  if (fatPct > 65 && carbsPct < 10) return "keto";
  // Low carb: carbs < 25%
  if (carbsPct < 25) return "low_carb";
  // High protein: protein > 30%
  if (proteinPct > 30) return "high_protein";
  // Low fat: fat < 20%
  if (fatPct < 20) return "low_fat";
  // High carb: carbs > 60%
  if (carbsPct > 60) return "high_carb";

  return "balanced";
}

export function getMacroPercentages(proteinG: number, carbsG: number, fatG: number) {
  const proteinKcal = proteinG * 4;
  const carbsKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const total = proteinKcal + carbsKcal + fatKcal;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((proteinKcal / total) * 100),
    carbs: Math.round((carbsKcal / total) * 100),
    fat: Math.round((fatKcal / total) * 100),
  };
}

// Macro targets based on calorie goal and diet goal
// lose: 30% protein, 40% carbs, 30% fat
// maintain: 25% protein, 45% carbs, 30% fat
// gain: 25% protein, 50% carbs, 25% fat
export function getMacroTargets(calorieTarget: number, goal: Profile["goal"]): {
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
} {
  const splits: Record<Profile["goal"], { p: number; c: number; f: number }> = {
    lose: { p: 0.30, c: 0.40, f: 0.30 },
    maintain: { p: 0.25, c: 0.45, f: 0.30 },
    gain: { p: 0.25, c: 0.50, f: 0.25 },
  };
  const s = splits[goal];
  return {
    proteinTarget: Math.round((calorieTarget * s.p) / 4),
    carbsTarget: Math.round((calorieTarget * s.c) / 4),
    fatTarget: Math.round((calorieTarget * s.f) / 9),
  };
}

export function getWeekDates(referenceDate: Date = new Date()): string[] {
  const dates: string[] = [];
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}
