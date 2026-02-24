"use client";

import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getMacroTargets } from "@/lib/nutrition";
import type { Profile } from "@/lib/types";

interface SmartSuggestionProps {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  calorieTarget: number;
  profile: Profile;
  mealCount: number;
}

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  text: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

const FOOD_SUGGESTIONS = {
  protein: [
    "Kurczak z grilla, jajka lub twarog",
    "Jogurt grecki, tuczyk lub tofu",
    "Indyk, krewetki lub ser cottage",
  ],
  carbs: [
    "Ryz, makaron lub owsianka z owocami",
    "Chleb pelnoziarnisty, kasza lub bataty",
    "Platki owsiane, quinoa lub banany",
  ],
  fat: [
    "Orzechy, awokado lub oliwa z oliwek",
    "Losos, siemie lniane lub maslo orzechowe",
    "Pestki slonecznika, tahini lub olej kokosowy",
  ],
};

function pickRandom(arr: string[]): string {
  const h = new Date().getHours();
  return arr[h % arr.length];
}

function getSuggestion(props: SmartSuggestionProps): Suggestion | null {
  const { totalCalories, totalProtein, totalCarbs, totalFat, calorieTarget, profile, mealCount } = props;

  if (mealCount === 0) return null;

  const { proteinTarget, carbsTarget, fatTarget } = getMacroTargets(calorieTarget, profile.goal);

  const remainingKcal = calorieTarget - totalCalories;
  const remainingProtein = proteinTarget - totalProtein;
  const remainingCarbs = carbsTarget - totalCarbs;
  const remainingFat = fatTarget - totalFat;

  const kcalPct = totalCalories / calorieTarget;

  // Cel osiagniety (90-110%)
  if (kcalPct >= 0.9 && kcalPct <= 1.1) {
    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "Cel osiagniety!",
      text: `Swietnie! Zjadles ${totalCalories} z ${calorieTarget} kcal. Makro w normie.`,
      bgColor: "var(--good-bg)",
      borderColor: "var(--good)",
      iconColor: "var(--good)",
    };
  }

  // Nadwyzka (>110%)
  if (kcalPct > 1.1) {
    const excess = totalCalories - calorieTarget;
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "Nadwyzka kaloryczna",
      text: `Masz +${excess} kcal ponad cel. Lzejsza kolacja lub 30 min spaceru pomoze zbilansowac dzien.`,
      bgColor: "var(--bad-bg)",
      borderColor: "var(--bad)",
      iconColor: "var(--bad)",
    };
  }

  // Deficyt - sprawdz co brakuje najbardziej (procentowo)
  const deficits = [
    { macro: "protein" as const, remaining: remainingProtein, target: proteinTarget, pct: proteinTarget > 0 ? remainingProtein / proteinTarget : 0 },
    { macro: "carbs" as const, remaining: remainingCarbs, target: carbsTarget, pct: carbsTarget > 0 ? remainingCarbs / carbsTarget : 0 },
    { macro: "fat" as const, remaining: remainingFat, target: fatTarget, pct: fatTarget > 0 ? remainingFat / fatTarget : 0 },
  ].filter((d) => d.pct > 0.3); // >30% brakuje

  // Sortuj wg procentu deficytu (malejaco)
  deficits.sort((a, b) => b.pct - a.pct);

  const biggest = deficits[0];

  if (biggest) {
    const macroLabels = { protein: "bialka", carbs: "weglowodanow", fat: "tluszczu" };
    const macroUnits = { protein: `${Math.round(biggest.remaining)}g B`, carbs: `${Math.round(biggest.remaining)}g W`, fat: `${Math.round(biggest.remaining)}g T` };

    return {
      icon: <TrendingUp className="h-4 w-4" />,
      title: `Brakuje ${macroLabels[biggest.macro]}`,
      text: `Potrzebujesz jeszcze ${macroUnits[biggest.macro]} i ${remainingKcal} kcal. ${pickRandom(FOOD_SUGGESTIONS[biggest.macro])}.`,
      bgColor: "var(--mid-bg)",
      borderColor: "var(--mid)",
      iconColor: "var(--mid)",
    };
  }

  // Ogolny deficyt kaloryczny bez dominujacego makro
  if (remainingKcal > 200) {
    return {
      icon: <Lightbulb className="h-4 w-4" />,
      title: "Jedz dalej!",
      text: `Brakuje Ci jeszcze ${remainingKcal} kcal do celu. Dodaj kolejny posilek.`,
      bgColor: "var(--mid-bg)",
      borderColor: "var(--mid)",
      iconColor: "var(--mid)",
    };
  }

  return null;
}

export function SmartSuggestion(props: SmartSuggestionProps) {
  const suggestion = getSuggestion(props);

  if (!suggestion) return null;

  return (
    <div
      className="warm-card p-3 flex items-start gap-3"
      style={{
        backgroundColor: suggestion.bgColor,
        borderLeft: `3px solid ${suggestion.borderColor}`,
      }}
    >
      <div
        className="flex-shrink-0 mt-0.5"
        style={{ color: suggestion.iconColor }}
      >
        {suggestion.icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: suggestion.borderColor }}>
          {suggestion.title}
        </p>
        <p className="text-xs text-[var(--text)] mt-0.5 leading-relaxed">
          {suggestion.text}
        </p>
      </div>
    </div>
  );
}
