import type { MealAnalysis, Profile } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as anonSupabase } from "./supabase";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_MODEL = process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-001";
const API_COST_LIMIT = parseFloat(process.env.API_COST_LIMIT || "2.00");

// Gemini Flash pricing (OpenRouter)
const INPUT_COST_PER_TOKEN = 0.1 / 1_000_000;   // $0.10/M
const OUTPUT_COST_PER_TOKEN = 0.4 / 1_000_000;   // $0.40/M

const ANALYSIS_PROMPT_MEAL = `Jestes ekspertem dietetykiem z 15-letnim doswiadczeniem. Przeanalizuj zdjecie GOTOWEGO POSILKU i zwroc dokladna analize w formacie JSON.

Odpowiedz WYLACZNIE poprawnym JSON (bez markdown, bez backtickow):
{
  "name": "Nazwa posilku po polsku",
  "description": "Krotki opis skladnikow po polsku (1-2 zdania)",
  "calories": <liczba calkowita - szacowane kcal>,
  "protein_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "carbs_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "fat_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "fiber_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "confidence": "<low|medium|high>"
}

KRYTYCZNE zasady szacowania BIALKA:
- Piersi kurczaka: ~31g bialka / 100g (surowej), po obrobce ~100-120g gotowej = 31-37g bialka
- Jajko: 6-7g bialka / sztuke
- Ryz bialy gotowany: ~2.7g bialka / 100g
- Twarog pollusty: ~18g bialka / 100g
- Losos: ~20g bialka / 100g
- Chleb: ~8g bialka / 100g
- Jogurt grecki: ~10g bialka / 100g
- Tofu: ~8g bialka / 100g
- ZAWSZE szacuj wage kazdego skladnika osobno, potem sumuj bialko

Pozostale zasady:
- Szacuj porcje na podstawie rozmiaru talerza/naczynia (standard 26cm)
- Podawaj realistyczne wartosci - lepiej niedoszacowac niz przeszacowac
- Confidence: high = typowy posilek latwy do rozpoznania, medium = trudniejszy, low = niejasne zdjecie
- Jesli nie mozesz rozpoznac jedzenia, zwroc confidence: "low"`;

const ANALYSIS_PROMPT_PRODUCTS = `Jestes ekspertem dietetykiem z 15-letnim doswiadczeniem. Na zdjeciu widac SUROWE PRODUKTY / SKLADNIKI (nie gotowy posilek). Oszacuj wartosci odzywcze posilku ktory z nich powstanie.

Odpowiedz WYLACZNIE poprawnym JSON (bez markdown, bez backtickow):
{
  "name": "Nazwa posilku ktory powstanie z tych produktow, po polsku",
  "description": "Lista rozpoznanych produktow z szacowanymi wagami (np. piersi kurczaka ~200g, ryz ~80g suchego)",
  "calories": <liczba calkowita - szacowane kcal GOTOWEGO posilku>,
  "protein_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "carbs_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "fat_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "fiber_g": <liczba z dokladnoscia do 1 miejsca po przecinku>,
  "confidence": "<low|medium|high>"
}

KRYTYCZNE zasady:
- Rozpoznaj kazdy produkt osobno i oszacuj jego wage
- Podaj wartosci dla GOTOWEGO posilku (po obrobce termicznej)
- Ryz/makaron suchy: x2.5-3 wagi po ugotowaniu
- Mieso traci ~25% wagi po obrobce
- Bialko szacuj na podstawie wagi KAZDEGO produktu osobno:
  * Piersi kurczaka surowe: ~23g bialka / 100g
  * Jajko: 6-7g / szt
  * Ryz suchy: ~7g / 100g
  * Chleb: ~8g / 100g
- ZAWSZE wymien produkty i ich wagi w opisie
- Confidence: high = produkty dobrze widoczne, medium = czesciowo widoczne, low = trudne do rozpoznania`;

// Keep backward compatibility
const ANALYSIS_PROMPT = ANALYSIS_PROMPT_MEAL;

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

export type PhotoMode = "meal" | "products";

export async function analyzeMealImage(
  base64Image: string,
  mimeType: string,
  profileId: string,
  sb?: SupabaseClient,
  photoMode: PhotoMode = "meal"
): Promise<MealAnalysis> {
  // Check cost limit
  const { allowed, used, limit } = await checkCostLimit(profileId, sb);
  if (!allowed) {
    throw new Error(`COST_LIMIT|Przekroczono limit kosztow API ($${used.toFixed(2)} / $${limit.toFixed(2)})`);
  }

  const prompt = photoMode === "products" ? ANALYSIS_PROMPT_PRODUCTS : ANALYSIS_PROMPT_MEAL;

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
            { type: "text", text: prompt },
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
    console.error("OpenRouter vision error:", response.status, err);
    throw new Error(`Blad API analizy obrazu (${response.status})`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    console.error("OpenRouter empty response:", JSON.stringify(data));
    throw new Error("Model nie zwrocil odpowiedzi");
  }

  const text = data.choices[0].message.content;

  // Calculate cost from usage (Gemini Flash pricing)
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
    console.error("OpenRouter scoring error:", response.status, err);
    throw new Error(`Blad API scoringu (${response.status})`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    console.error("OpenRouter scoring empty response:", JSON.stringify(data));
    throw new Error("Model nie zwrocil odpowiedzi dla scoringu");
  }

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
1. Wybierz najlepszy i najgorszy dzien (krotkie uzasadnienie z liczbami)
2. Napisz 3 krotkie rekomendacje (1 zdanie kazda)
3. Podsumowanie: 1-2 zdania

STYL: zwiezly, po polsku. ODPOWIEDZ WYLACZNIE JSON (bez markdown):
{"bestDay":{"date":"YYYY-MM-DD","score":0,"reason":"..."},"worstDay":{"date":"YYYY-MM-DD","score":0,"reason":"..."},"recommendations":["...","...","..."],"summary":"..."}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenRouter report error:", response.status, err);
    throw new Error(`Blad API raportu (${response.status})`);
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    console.error("OpenRouter report empty response:", JSON.stringify(data));
    throw new Error("Model nie zwrocil odpowiedzi dla raportu");
  }

  const text = data.choices[0].message.content;

  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || 2000;
  const outputTokens = usage.completion_tokens || 400;
  const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);
  await addCost(profileId, cost, sb);

  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // Fix truncated JSON - try to repair if needed
  try {
    return JSON.parse(cleaned) as WeeklyReportData;
  } catch {
    // Try to fix common truncation issues
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;

    // Close unclosed strings, arrays, objects
    if (!cleaned.endsWith("}")) {
      // Find last complete value and truncate there
      const lastQuote = cleaned.lastIndexOf('"');
      if (lastQuote > 0 && cleaned[lastQuote - 1] !== '\\') {
        cleaned = cleaned.substring(0, lastQuote + 1);
      }
      cleaned += "]".repeat(Math.max(0, openBrackets - closeBrackets));
      cleaned += "}".repeat(Math.max(0, openBraces - closeBraces));
    }

    try {
      return JSON.parse(cleaned) as WeeklyReportData;
    } catch (e2) {
      console.error("JSON repair failed:", cleaned.substring(0, 500));
      throw new Error("Model zwrocil nieprawidlowy JSON");
    }
  }
}
