import type { MealAnalysis, Profile } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "./supabase";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-opus-4-6";
const API_COST_LIMIT = parseFloat(process.env.API_COST_LIMIT || "2.00");

// Opus pricing per token (OpenRouter)
const INPUT_COST_PER_TOKEN = 15 / 1_000_000;   // $15/M
const OUTPUT_COST_PER_TOKEN = 75 / 1_000_000;   // $75/M

const ANALYSIS_PROMPT = `Jestes ekspertem od zywienia. Przeanalizuj zdjecie posilku i zwroc dokladna analize w formacie JSON.

Odpowiedz WYLACZNIE poprawnym JSON (bez markdown, bez backtickow):
{
  "name": "Nazwa posilku po polsku",
  "description": "Krotki opis skladnikow po polsku (1-2 zdania)",
  "calories": <liczba calkowita - szacowane kcal>,
  "protein_g": <liczba - bialko w gramach>,
  "carbs_g": <liczba - weglowodany w gramach>,
  "fat_g": <liczba - tluszcz w gramach>,
  "fiber_g": <liczba - blonnik w gramach>,
  "confidence": "<low|medium|high> - pewnosc oszacowania"
}

Zasady:
- Szacuj porcje na podstawie rozmiaru talerza/naczynia
- Podawaj realistyczne wartosci odzywieniowe
- Confidence: high = typowy posilek latwy do rozpoznania, medium = trudniejszy, low = niejasne zdjecie
- Jesli nie mozesz rozpoznac jedzenia, zwroc confidence: "low" i najlepsze przyblizone wartosci`;

export async function checkCostLimit(profileId: string, sb?: SupabaseClient): Promise<{ allowed: boolean; used: number; limit: number }> {
  const client = sb || anonSupabase;
  const { data } = await client
    .from("profiles")
    .select("total_api_cost, api_cost_limit")
    .eq("id", profileId)
    .single();

  const used = data?.total_api_cost || 0;
  const limit = data?.api_cost_limit || API_COST_LIMIT;

  return { allowed: used < limit, used: parseFloat(used), limit: parseFloat(limit) };
}

async function addCost(profileId: string, cost: number, sb?: SupabaseClient) {
  const client = sb || anonSupabase;
  const { data } = await client
    .from("profiles")
    .select("total_api_cost")
    .eq("id", profileId)
    .single();

  const currentCost = parseFloat(data?.total_api_cost || "0");

  await client
    .from("profiles")
    .update({ total_api_cost: currentCost + cost })
    .eq("id", profileId);
}

export async function analyzeMealImage(
  base64Image: string,
  mimeType: string,
  profileId: string,
  sb?: SupabaseClient
): Promise<MealAnalysis> {
  // Check cost limit
  const { allowed, used, limit } = await checkCostLimit(profileId, sb);
  if (!allowed) {
    throw new Error(`COST_LIMIT|Przekroczono limit kosztow API ($${used.toFixed(2)} / $${limit.toFixed(2)})`);
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenRouter error:", err);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  // Calculate cost from usage
  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || 1500;
  const outputTokens = usage.completion_tokens || 200;
  const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);

  // Track cost
  await addCost(profileId, cost, sb);

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed: MealAnalysis = JSON.parse(cleaned);

  return {
    name: parsed.name,
    description: parsed.description,
    calories: Math.round(parsed.calories),
    protein_g: Math.round(parsed.protein_g * 10) / 10,
    carbs_g: Math.round(parsed.carbs_g * 10) / 10,
    fat_g: Math.round(parsed.fat_g * 10) / 10,
    fiber_g: Math.round(parsed.fiber_g * 10) / 10,
    confidence: parsed.confidence,
  };
}

interface ScoreMealInput {
  mealName: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  time: string;
  inIfWindow: boolean;
  dailyKcalGoal: number;
  todayKcal: number;
  todayProtein: number;
  todayFat: number;
  todayCarbs: number;
}

export async function scoreMeal(
  input: ScoreMealInput,
  profileId: string,
  sb?: SupabaseClient
): Promise<{ score: number; comment: string }> {
  const { allowed, used, limit } = await checkCostLimit(profileId, sb);
  if (!allowed) {
    throw new Error(`COST_LIMIT|Przekroczono limit kosztow API ($${used.toFixed(2)} / $${limit.toFixed(2)})`);
  }

  const prompt = `Jestes dietetykiem klinicznym z 10-letnim doswiadczeniem. Ocen posilek w skali 1-10.

KRYTERIA OCENY:
1. Jakosc skladnikow (35% wagi):
   - Wysoko: naturalne, nieprzetworzone produkty, warzywa, pelne ziarna, chude bialko
   - Nisko: ultra-przetworzona zywnosc, fast food, cukry proste, trans-tluszcze
   - Srednia wartosc odzywcza skladnikow (witaminy, mineraly, blonnik)

2. Balans makroskladnikow (30% wagi):
   - Optymalny rozklad: 25-35% bialko, 25-35% tluszcze, 35-50% weglowodany
   - Obecnosc bialka pelnowar. w kazdym posilku glownym
   - Stosunek nienasycone/nasycone tluszcze

3. Proporcja kaloryczna (25% wagi):
   - Czy porcja jest adekwatna do dziennego celu ${input.dailyKcalGoal} kcal
   - Posilek glowny: 25-35% celu, przekaska: 10-15% celu
   - Kontekst: dotychczasowe spozycie danego dnia

4. Timing i IF compliance (10% wagi):
   - Regularne odstepy miedzy posilkami
   - ${input.inIfWindow ? "Posilek w oknie IF (+)" : "Posilek POZA oknem IF (-)"}

DANE POSILKU:
- Nazwa: ${input.mealName}
- Kalorie: ${input.kcal} kcal
- Bialko: ${input.protein}g | Tluszcze: ${input.fat}g | Wegle: ${input.carbs}g
- Godzina: ${input.time}
- Dzienny cel: ${input.dailyKcalGoal} kcal
- Spozycie dzis dotychczas: ${input.todayKcal} kcal (B:${input.todayProtein}g T:${input.todayFat}g W:${input.todayCarbs}g)

ODPOWIEDZ WYLACZNIE w formacie JSON (bez markdown, bez backtickow):
{
  "score": <liczba 1-10, z dokladnoscia do 0.1>,
  "comment": "<1-2 zdania po polsku. Zacznij od konkretnego pozytywu, zakoncz jedna praktyczna sugestia. Bez ogolnikow.>"
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenRouter scoring error:", err);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || 500;
  const outputTokens = usage.completion_tokens || 100;
  const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);
  await addCost(profileId, cost, sb);

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    score: Math.round(parsed.score * 10) / 10,
    comment: parsed.comment,
  };
}

export interface WeeklyReportData {
  bestDay: { date: string; score: number; reason: string };
  worstDay: { date: string; score: number; reason: string };
  recommendations: string[];
  summary: string;
}

interface WeeklyReportInput {
  mealsJson: string;
  kcalGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  ifEnabled: boolean;
  ifProtocol: string;
  ifCompliance: number;
}

export async function generateWeeklyReport(
  input: WeeklyReportInput,
  profileId: string,
  sb?: SupabaseClient
): Promise<WeeklyReportData> {
  const { allowed, used, limit } = await checkCostLimit(profileId, sb);
  if (!allowed) {
    throw new Error(`COST_LIMIT|Przekroczono limit kosztow API ($${used.toFixed(2)} / $${limit.toFixed(2)})`);
  }

  const prompt = `Jestes dietetykiem klinicznym. Przygotuj tygodniowy raport zywieniowy na podstawie danych ponizej.

DANE POSILKOW (ostatnie 7 dni, JSON):
${input.mealsJson}

CELE UZYTKOWNIKA:
- Kalorie: ${input.kcalGoal} kcal/dzien
- Makro: bialko ~${input.proteinGoal}g, wegle ~${input.carbsGoal}g, tluszcz ~${input.fatGoal}g
${input.ifEnabled ? `- Post przerywany: ${input.ifProtocol}, zgodnosc ${input.ifCompliance}%` : "- Post przerywany: nieaktywny"}

INSTRUKCJE:
1. Przeanalizuj kazdy dzien: kalorie vs cel, rozklad makro, regularnosc posilkow, jakosc skladnikow
2. Wybierz najlepszy i najgorszy dzien z uzasadnieniem opartym na DANYCH (konkretne liczby)
3. Napisz 3 rekomendacje - kazda musi zawierac:
   - Konkretny problem z danymi (np. "W 5/7 dni bialko ponizej 60% celu")
   - Praktyczne rozwiazanie z przykladem posilku/produktu
   - Oczekiwany efekt zmiany
4. Podsumowanie: 2-3 zdania - ogolna ocena tygodnia i najwazniejszy priorytet na kolejny tydzien

STYL: rzeczowy, oparty na danych, bez ogolnikow. Pisz po polsku.

ODPOWIEDZ WYLACZNIE w formacie JSON (bez markdown, bez backtickow):
{
  "bestDay": { "date": "YYYY-MM-DD", "score": <sredni score dnia lub 0>, "reason": "<1-2 zdania z konkretnymi liczbami>" },
  "worstDay": { "date": "YYYY-MM-DD", "score": <sredni score dnia lub 0>, "reason": "<1-2 zdania z konkretnymi liczbami>" },
  "recommendations": ["<rekomendacja 1>", "<rekomendacja 2>", "<rekomendacja 3>"],
  "summary": "<2-3 zdania podsumowania>"
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenRouter report error:", err);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || 2000;
  const outputTokens = usage.completion_tokens || 400;
  const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);
  await addCost(profileId, cost, sb);

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as WeeklyReportData;
}
