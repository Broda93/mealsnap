export interface Profile {
  id: string;
  name: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: "male" | "female";
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
  daily_calorie_target: number;
  body_fat_percent: number | null;
  if_enabled: boolean;
  if_protocol: "16:8" | "18:6" | "20:4" | "custom";
  if_window_start: number;
  if_window_hours: number;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  profile_id: string;
  date: string;
  weight_kg: number;
  body_fat_percent: number | null;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  notes: string | null;
  created_at: string;
}

export type BodyFatCategory = "athletic" | "fit" | "average" | "overweight";

export const BODY_FAT_CATEGORIES: Record<
  BodyFatCategory,
  { label: string; color: string; maleRange: [number, number]; femaleRange: [number, number] }
> = {
  athletic: { label: "Atletyczny", color: "#22c55e", maleRange: [6, 13], femaleRange: [14, 20] },
  fit: { label: "Fit", color: "#3b82f6", maleRange: [14, 17], femaleRange: [21, 24] },
  average: { label: "Przecietny", color: "#eab308", maleRange: [18, 24], femaleRange: [25, 31] },
  overweight: { label: "Nadwaga", color: "#ef4444", maleRange: [25, 50], femaleRange: [32, 50] },
};

export interface Meal {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  meal_type: "sniadanie" | "obiad" | "kolacja" | "przekaska";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  image_url: string | null;
  confidence: "low" | "medium" | "high";
  note: string | null;
  score: number | null;
  ai_comment: string | null;
  in_if_window: boolean;
  eaten_at: string;
  created_at: string;
}

export interface MealAnalysis {
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: "low" | "medium" | "high";
}

export interface MealTemplate {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  meal_type: "sniadanie" | "obiad" | "kolacja" | "przekaska";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  created_at: string;
}

export interface DailySummary {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
}

export type DietType =
  | "keto"
  | "low_carb"
  | "high_protein"
  | "low_fat"
  | "high_carb"
  | "balanced";

export const DIET_TYPE_INFO: Record<
  DietType,
  { label: string; description: string; color: string; emoji: string }
> = {
  keto: {
    label: "Keto",
    description: "Bardzo niskie weglowodany, wysoki tluszcz",
    color: "#f97316",
    emoji: "🥑",
  },
  low_carb: {
    label: "Low Carb",
    description: "Ograniczone weglowodany",
    color: "#eab308",
    emoji: "🥩",
  },
  high_protein: {
    label: "Wysokobialkowa",
    description: "Bialko stanowi ponad 30% kalorii",
    color: "#3b82f6",
    emoji: "💪",
  },
  low_fat: {
    label: "Low Fat",
    description: "Ograniczony tluszcz",
    color: "#22c55e",
    emoji: "🥗",
  },
  high_carb: {
    label: "Wysokoweglowodanowa",
    description: "Weglowodany stanowia ponad 60% kalorii",
    color: "#a855f7",
    emoji: "🍝",
  },
  balanced: {
    label: "Zrownowazona",
    description: "Rownomierne proporcje makroskladnikow",
    color: "#8b5cf6",
    emoji: "⚖️",
  },
};

export const MEAL_TYPE_LABELS: Record<Meal["meal_type"], string> = {
  sniadanie: "Sniadanie",
  obiad: "Obiad",
  kolacja: "Kolacja",
  przekaska: "Przekaska",
};

export const IF_PROTOCOLS: Record<Profile["if_protocol"], { label: string; fastHours: number; eatHours: number }> = {
  "16:8": { label: "16:8", fastHours: 16, eatHours: 8 },
  "18:6": { label: "18:6", fastHours: 18, eatHours: 6 },
  "20:4": { label: "20:4", fastHours: 20, eatHours: 4 },
  custom: { label: "Własny", fastHours: 0, eatHours: 0 },
};

export const ACTIVITY_LABELS: Record<Profile["activity_level"], string> = {
  sedentary: "Siedzacy (brak cwiczen)",
  light: "Lekka aktywnosc (1-3 dni/tyg)",
  moderate: "Umiarkowana (3-5 dni/tyg)",
  active: "Aktywny (6-7 dni/tyg)",
  very_active: "Bardzo aktywny (2x dziennie)",
};

export const GOAL_LABELS: Record<Profile["goal"], string> = {
  lose: "Schudnac",
  maintain: "Utrzymac wage",
  gain: "Przytyc",
};
