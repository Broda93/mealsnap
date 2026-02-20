import { describe, it, expect } from "vitest";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  getDailySummary,
  predictWeight,
  calculateFatMass,
  calculateLeanMass,
  getBodyFatCategory,
  predictBodyFatGoal,
  classifyDiet,
  getMacroPercentages,
  formatDate,
  getWeekDates,
} from "./nutrition";
import type { Profile, Meal } from "./types";

const maleProfile: Profile = {
  id: "1",
  name: "Test",
  weight_kg: 80,
  height_cm: 180,
  age: 30,
  gender: "male",
  activity_level: "moderate",
  goal: "maintain",
  daily_calorie_target: 2500,
  body_fat_percent: 20,
  created_at: "2026-01-01",
};

const femaleProfile: Profile = {
  ...maleProfile,
  id: "2",
  gender: "female",
  weight_kg: 65,
  height_cm: 165,
  age: 28,
};

describe("calculateBMR", () => {
  it("calculates BMR for male (Mifflin-St Jeor)", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR(maleProfile)).toBe(1780);
  });

  it("calculates BMR for female", () => {
    // 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
    expect(calculateBMR(femaleProfile)).toBe(1380.25);
  });
});

describe("calculateTDEE", () => {
  it("applies moderate activity multiplier (1.55)", () => {
    expect(calculateTDEE(maleProfile)).toBe(Math.round(1780 * 1.55));
  });

  it("applies sedentary multiplier (1.2)", () => {
    const sedentary = { ...maleProfile, activity_level: "sedentary" as const };
    expect(calculateTDEE(sedentary)).toBe(Math.round(1780 * 1.2));
  });
});

describe("calculateCalorieTarget", () => {
  it("returns TDEE for maintain", () => {
    expect(calculateCalorieTarget(maleProfile)).toBe(calculateTDEE(maleProfile));
  });

  it("subtracts 500 for lose", () => {
    const lose = { ...maleProfile, goal: "lose" as const };
    expect(calculateCalorieTarget(lose)).toBe(calculateTDEE(maleProfile) - 500);
  });

  it("adds 300 for gain", () => {
    const gain = { ...maleProfile, goal: "gain" as const };
    expect(calculateCalorieTarget(gain)).toBe(calculateTDEE(maleProfile) + 300);
  });
});

describe("getDailySummary", () => {
  const meals: Meal[] = [
    {
      id: "1", profile_id: "1", name: "Sniadanie", description: "",
      meal_type: "sniadanie", calories: 400, protein_g: 20, carbs_g: 50, fat_g: 15, fiber_g: 5,
      image_url: null, confidence: "high", eaten_at: "2026-01-15T08:00:00Z", created_at: "2026-01-15",
    },
    {
      id: "2", profile_id: "1", name: "Obiad", description: "",
      meal_type: "obiad", calories: 600, protein_g: 30, carbs_g: 70, fat_g: 20, fiber_g: 8,
      image_url: null, confidence: "medium", eaten_at: "2026-01-15T13:00:00Z", created_at: "2026-01-15",
    },
    {
      id: "3", profile_id: "1", name: "Inne", description: "",
      meal_type: "kolacja", calories: 300, protein_g: 10, carbs_g: 40, fat_g: 10, fiber_g: 3,
      image_url: null, confidence: "high", eaten_at: "2026-01-16T19:00:00Z", created_at: "2026-01-16",
    },
  ];

  it("sums only meals for given date", () => {
    const summary = getDailySummary(meals, "2026-01-15");
    expect(summary.totalCalories).toBe(1000);
    expect(summary.totalProtein).toBe(50);
    expect(summary.totalCarbs).toBe(120);
    expect(summary.totalFat).toBe(35);
    expect(summary.totalFiber).toBe(13);
    expect(summary.meals).toHaveLength(2);
  });

  it("returns zeros for date with no meals", () => {
    const summary = getDailySummary(meals, "2026-01-20");
    expect(summary.totalCalories).toBe(0);
    expect(summary.meals).toHaveLength(0);
  });
});

describe("predictWeight", () => {
  it("predicts weight loss with deficit", () => {
    const result = predictWeight(80, 2500, 2000, 30);
    // deficit 500/day * 30 = 15000 kcal / 7700 = ~1.95 kg loss
    expect(result.predictedWeight).toBeLessThan(80);
    expect(result.direction).toBe("lose");
  });

  it("predicts weight gain with surplus", () => {
    const result = predictWeight(80, 2500, 3000, 30);
    expect(result.predictedWeight).toBeGreaterThan(80);
    expect(result.direction).toBe("gain");
  });

  it("maintains weight when intake equals target", () => {
    const result = predictWeight(80, 2500, 2500, 30);
    expect(result.predictedWeight).toBe(80);
    expect(result.direction).toBe("maintain");
  });
});

describe("body composition", () => {
  it("calculateFatMass", () => {
    expect(calculateFatMass(80, 20)).toBe(16);
  });

  it("calculateLeanMass", () => {
    expect(calculateLeanMass(80, 20)).toBe(64);
  });

  it("getBodyFatCategory male", () => {
    expect(getBodyFatCategory(10, "male")).toBe("athletic");
    expect(getBodyFatCategory(15, "male")).toBe("fit");
    expect(getBodyFatCategory(20, "male")).toBe("average");
    expect(getBodyFatCategory(30, "male")).toBe("overweight");
  });

  it("getBodyFatCategory female", () => {
    expect(getBodyFatCategory(18, "female")).toBe("athletic");
    expect(getBodyFatCategory(22, "female")).toBe("fit");
    expect(getBodyFatCategory(28, "female")).toBe("average");
    expect(getBodyFatCategory(35, "female")).toBe("overweight");
  });
});

describe("predictBodyFatGoal", () => {
  it("returns days to reach target BF%", () => {
    const days = predictBodyFatGoal(80, 25, 15, 500);
    expect(days).toBeGreaterThan(0);
    // 80*25/100 - 80*15/100 = 20 - 12 = 8 kg fat to lose
    // 8 * 7700 / 500 = 123.2 -> 124 days
    expect(days).toBe(124);
  });

  it("returns null if no deficit", () => {
    expect(predictBodyFatGoal(80, 25, 15, 0)).toBeNull();
    expect(predictBodyFatGoal(80, 25, 15, -100)).toBeNull();
  });

  it("returns null if already at target", () => {
    expect(predictBodyFatGoal(80, 15, 15, 500)).toBeNull();
    expect(predictBodyFatGoal(80, 10, 15, 500)).toBeNull();
  });
});

describe("classifyDiet", () => {
  it("keto: high fat, very low carbs", () => {
    // 70% fat, 25% protein, 5% carbs
    expect(classifyDiet(50, 10, 60)).toBe("keto");
  });

  it("low carb", () => {
    // carbs < 25%
    expect(classifyDiet(40, 20, 40)).toBe("low_carb");
  });

  it("high protein", () => {
    // protein > 30%
    expect(classifyDiet(80, 60, 20)).toBe("high_protein");
  });

  it("balanced", () => {
    expect(classifyDiet(50, 100, 40)).toBe("balanced");
  });

  it("returns balanced for zero input", () => {
    expect(classifyDiet(0, 0, 0)).toBe("balanced");
  });
});

describe("getMacroPercentages", () => {
  it("calculates correct percentages", () => {
    // 50g protein = 200kcal, 100g carbs = 400kcal, 44g fat = 396kcal -> total ~996
    const result = getMacroPercentages(50, 100, 44);
    expect(result.protein).toBeGreaterThan(0);
    expect(result.carbs).toBeGreaterThan(0);
    expect(result.fat).toBeGreaterThan(0);
    expect(result.protein + result.carbs + result.fat).toBeCloseTo(100, -1);
  });

  it("returns zeros for no input", () => {
    expect(getMacroPercentages(0, 0, 0)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe("formatDate", () => {
  it("formats date as YYYY-MM-DD", () => {
    const d = new Date("2026-02-15T12:00:00Z");
    expect(formatDate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getWeekDates", () => {
  it("returns 7 dates starting from Monday", () => {
    const dates = getWeekDates(new Date("2026-02-18")); // Wednesday
    expect(dates).toHaveLength(7);
    // Monday should be 2026-02-16
    expect(dates[0]).toBe("2026-02-16");
    expect(dates[6]).toBe("2026-02-22");
  });
});
