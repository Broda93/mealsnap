# MealSnap Changelog

## 2026-02-19 — Body Fat Tracking + Diet Classification + Security Hardening

### Nowe funkcje

#### Body Fat % Tracking
- **SQL migration** (`supabase-bodyfat.sql`): kolumna `profiles.body_fat_percent`, tabela `body_measurements` z wyliczanymi `lean_mass_kg`/`fat_mass_kg`, RLS policies
- **Profil**: slider BF% (5-50%), wizualna skala kolorow wg kategorii (atletyczny/fit/przecietny/nadwaga), wyliczone masy tluszczowa/beztluszczowa
- **Formularz pomiarow**: wybor daty, wagi, opcjonalnie BF% — zapis do historii `body_measurements`
- **Dashboard**: widget BF% z kategoria i paskiem pozycji
- **Statystyki**: wykres BF% w czasie (liniowy), wykres skladu ciala (waga/lean/fat mass), prognoza dni do celu BF%

#### Klasyfikacja diety
- **Automatyczna ocena typu diety** na podstawie proporcji makro (% kcal):
  - Keto (tluszcz >65%, wegle <10%)
  - Low Carb (wegle <25%)
  - Wysokobialkowa (bialko >30%)
  - Low Fat (tluszcz <20%)
  - Wysokoweglowodanowa (wegle >60%)
  - Zrownowazona (rownomiernie)
- Widoczna na **Dashboard** (dzisiejsze makro) i **Statystyki** (srednia z ostatnich dni)
- Kolorowy pasek proporcji B/W/T z procentami

### Nowe pliki
- `supabase-bodyfat.sql` — migracja SQL
- `app/api/measurements/route.ts` — CRUD API dla pomiarow ciala
- `components/body-fat-card.tsx` — mini widget BF%
- `components/body-composition-chart.tsx` — wykresy recharts (BF% + sklad ciala)
- `components/diet-type-card.tsx` — karta typu diety z paskiem makro

### Zmodyfikowane pliki
- `lib/types.ts` — `body_fat_percent` w Profile, interfejsy BodyMeasurement, DietType, BODY_FAT_CATEGORIES, DIET_TYPE_INFO
- `lib/nutrition.ts` — `calculateFatMass()`, `calculateLeanMass()`, `getBodyFatCategory()`, `predictBodyFatGoal()`, `classifyDiet()`, `getMacroPercentages()`
- `app/profile/page.tsx` — sekcja BF% z sliderem, masami, formularzem pomiarow
- `app/stats/page.tsx` — wykresy body composition, prognoza BF%, karta typu diety
- `app/page.tsx` — widget BF% i karta diety na dashboardzie

---

## 2026-02-19 — Security Hardening (pre-Vercel deploy)

### Poprawki bezpieczenstwa

#### API Input Validation
- **`/api/meals`**: walidacja formatu dat `from`/`to` (ISO 8601: YYYY-MM-DD)
- **`/api/meals` POST**: walidacja rozmiaru obrazka (max 5 MB) i typu MIME (jpeg/png/webp)
- **`/api/measurements`**: walidacja `limit` (zakres 1-500, default 90), walidacja daty, walidacja wagi (20-500 kg), walidacja BF% (2-60%), obciecie notatki do 500 znakow
- **`/api/profile` PUT**: whitelist dozwolonych pol (mass assignment protection) — akceptuje tylko: name, weight_kg, height_cm, age, gender, activity_level, goal, daily_calorie_target, body_fat_percent

#### Generic Error Messages
- Wszystkie API routes zwracaja generyczne komunikaty bledow zamiast surowych wiadomosci z Supabase
- Eliminuje wyciek nazw tabel/kolumn do klienta

#### Profile API — usuniety parametr `id`
- GET `/api/profile` zawsze pobiera profil zalogowanego usera (`user.id`)
- Wczesniej akceptowal `?id=...` co pozwalalo na probe enumeracji (RLS blokowal, ale wyciekal fakt istnienia)
- `auth-context.tsx` zaktualizowany — nie przekazuje juz `id` w URL

#### Security Headers (`next.config.ts`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

### Zmodyfikowane pliki
- `app/api/meals/route.ts` — walidacja dat, obrazkow, generyczne bledy
- `app/api/measurements/route.ts` — walidacja limit/date/weight/bf%, generyczne bledy
- `app/api/profile/route.ts` — usuniety param `id`, whitelist pol, generyczne bledy
- `lib/auth-context.tsx` — fetch profilu bez `?id=`
- `next.config.ts` — security headers
