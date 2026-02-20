"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Calculator, Plus, Timer, Clock, Flame, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ProfileSkeleton } from "@/components/skeletons";
import type { Profile } from "@/lib/types";
import { ACTIVITY_LABELS, GOAL_LABELS, BODY_FAT_CATEGORIES, IF_PROTOCOLS, type BodyFatCategory } from "@/lib/types";
import { getFastingInfo } from "@/lib/if-utils";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateFatMass,
  calculateLeanMass,
  getBodyFatCategory,
} from "@/lib/nutrition";

export default function ProfilePage() {
  const { loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [measDate, setMeasDate] = useState(new Date().toISOString().substring(0, 10));
  const [measWeight, setMeasWeight] = useState<number | "">("");
  const [measBf, setMeasBf] = useState<number | "">("");
  const [now, setNow] = useState(new Date());

  // Live clock for fasting timer
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const fastingInfo = profile?.if_enabled ? getFastingInfo(profile) : null;
  // suppress unused var warning - now drives re-render
  void now;

  useEffect(() => {
    if (authLoading) return;
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) setProfile(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [authLoading]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const target = calculateCalorieTarget(profile);
      const updated = { ...profile, daily_calorie_target: target };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        toast.success("Profil zapisany!");
      } else {
        toast.error("Blad zapisu profilu");
      }
    } catch {
      toast.error("Blad zapisu profilu");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeasurement = async () => {
    if (!profile) return;
    const weightToSave = measWeight || profile.weight_kg;
    if (!weightToSave) return;
    setSavingMeasurement(true);
    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: measDate,
          weight_kg: weightToSave,
          body_fat_percent: measBf || profile.body_fat_percent || null,
        }),
      });

      if (res.ok) {
        toast.success("Pomiar zapisany!");
        setMeasWeight("");
        setMeasBf("");
      } else {
        toast.error("Blad zapisu pomiaru");
      }
    } catch {
      toast.error("Blad zapisu pomiaru");
    } finally {
      setSavingMeasurement(false);
    }
  };

  const update = (key: keyof Profile, value: string | number | boolean | null) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  };

  const bmr = profile ? Math.round(calculateBMR(profile)) : 0;
  const tdee = profile ? calculateTDEE(profile) : 0;
  const suggestedTarget = profile ? calculateCalorieTarget(profile) : 0;

  const bodyFatPercent = profile?.body_fat_percent ?? null;
  const fatMass = profile && bodyFatPercent ? calculateFatMass(profile.weight_kg, bodyFatPercent) : null;
  const leanMass = profile && bodyFatPercent ? calculateLeanMass(profile.weight_kg, bodyFatPercent) : null;
  const bfCategory = profile && bodyFatPercent ? getBodyFatCategory(bodyFatPercent, profile.gender) : null;
  const bfInfo = bfCategory ? BODY_FAT_CATEGORIES[bfCategory] : null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          <span className="text-[var(--accent)]">Profil</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Twoje dane i cel kaloryczny
        </p>
      </motion.div>

      {loading || authLoading || !profile ? (
        <ProfileSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="warm-card p-4 space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Dane osobowe</h3>
            <div>
              <Label>Imie</Label>
              <Input
                value={profile.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Waga (kg)</Label>
                <Input
                  type="number"
                  value={profile.weight_kg}
                  onChange={(e) => update("weight_kg", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Wzrost (cm)</Label>
                <Input
                  type="number"
                  value={profile.height_cm}
                  onChange={(e) => update("height_cm", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Wiek</Label>
                <Input
                  type="number"
                  value={profile.age}
                  onChange={(e) => update("age", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Plec</Label>
                <Select
                  value={profile.gender}
                  onValueChange={(v) => update("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Mezczyzna</SelectItem>
                    <SelectItem value="female">Kobieta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="warm-card p-4 space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Aktywnosc i cel</h3>
            <div>
              <Label>Poziom aktywnosci</Label>
              <Select
                value={profile.activity_level}
                onValueChange={(v) => update("activity_level", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cel</Label>
              <Select
                value={profile.goal}
                onValueChange={(v) => update("goal", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Body Fat Section */}
          <div className="warm-card p-4 space-y-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Tkanka tluszczowa</h3>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>% tkanki tluszczowej</Label>
                {bodyFatPercent !== null && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: bfInfo?.color }}
                  >
                    {bfInfo?.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={0.5}
                  value={bodyFatPercent ?? 20}
                  onChange={(e) => update("body_fat_percent", Number(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: "var(--accent)" }}
                />
                <span className="text-lg font-bold w-16 text-right">
                  {bodyFatPercent ?? "\u2014"}%
                </span>
              </div>
              {/* Color scale bar */}
              <div className="mt-2 relative h-2 rounded-full overflow-hidden flex">
                {(Object.keys(BODY_FAT_CATEGORIES) as BodyFatCategory[]).map((key) => (
                  <div
                    key={key}
                    className="flex-1 h-full"
                    style={{ backgroundColor: BODY_FAT_CATEGORIES[key].color, opacity: 0.4 }}
                  />
                ))}
                {bodyFatPercent !== null && (
                  <div
                    className="absolute top-0 h-full w-1.5 rounded-full shadow-lg transition-all"
                    style={{
                      left: `${Math.min(Math.max(((bodyFatPercent - 5) / 45) * 100, 0), 100)}%`,
                      backgroundColor: "var(--text)",
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[var(--text-secondary)]">5%</span>
                <span className="text-[9px] text-[var(--text-secondary)]">50%</span>
              </div>
            </div>

            {/* Calculated masses */}
            {bodyFatPercent !== null && fatMass !== null && leanMass !== null && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--kcal-soft)" }}>
                  <p className="text-xl font-bold text-[var(--kcal)]">{fatMass} kg</p>
                  <p className="text-xs text-[var(--text-secondary)]">Masa tluszczowa</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--protein-soft)" }}>
                  <p className="text-xl font-bold text-[var(--protein)]">{leanMass} kg</p>
                  <p className="text-xs text-[var(--text-secondary)]">Masa beztluszczowa</p>
                </div>
              </div>
            )}

            {/* Add measurement form */}
            <div className="border-t pt-4 mt-2 space-y-3" style={{ borderColor: "var(--warm-border)" }}>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Dodaj pomiar</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={measDate}
                    onChange={(e) => setMeasDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Waga (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={String(profile.weight_kg)}
                    value={measWeight}
                    onChange={(e) => setMeasWeight(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
                <div>
                  <Label className="text-xs">BF% (opcja)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder={bodyFatPercent ? String(bodyFatPercent) : "\u2014"}
                    value={measBf}
                    onChange={(e) => setMeasBf(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveMeasurement}
                disabled={savingMeasurement}
                variant="outline"
                className="w-full"
              >
                {savingMeasurement ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Zapisz pomiar
              </Button>
            </div>
          </div>

          {/* Intermittent Fasting */}
          <div className="warm-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2 text-[var(--text-secondary)]">
                <Timer className="h-4 w-4 text-[var(--fast)]" />
                Intermittent Fasting
              </h3>
              <button
                onClick={() => update("if_enabled", !profile.if_enabled)}
                className="relative w-12 h-6 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: profile.if_enabled ? "var(--fast)" : "var(--warm-border)",
                }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
                  style={{
                    transform: profile.if_enabled ? "translateX(24px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            {profile.if_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div>
                  <Label>Protokol</Label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {(Object.keys(IF_PROTOCOLS) as Array<keyof typeof IF_PROTOCOLS>).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          const proto = IF_PROTOCOLS[key];
                          const updates: Partial<typeof profile> = { if_protocol: key };
                          if (key !== "custom") {
                            updates.if_window_hours = proto.eatHours;
                          }
                          setProfile({ ...profile, ...updates });
                        }}
                        className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{
                          backgroundColor: profile.if_protocol === key ? "var(--fast)" : "var(--fast-bg)",
                          color: profile.if_protocol === key ? "white" : "var(--fast)",
                        }}
                      >
                        {IF_PROTOCOLS[key].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Start okna
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={profile.if_window_start}
                      onChange={(e) => update("if_window_start", Number(e.target.value))}
                    />
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Godzina otwarcia (0-23)
                    </p>
                  </div>
                  <div>
                    <Label>Okno (godziny)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={profile.if_window_hours}
                      onChange={(e) => update("if_window_hours", Number(e.target.value))}
                      disabled={profile.if_protocol !== "custom"}
                    />
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {profile.if_protocol !== "custom"
                        ? `Ustalony przez protokol ${profile.if_protocol}`
                        : "Dlugosc okna (1-12h)"}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 text-center text-sm"
                  style={{ backgroundColor: "var(--fast-bg)" }}
                >
                  <span className="text-[var(--fast)] font-medium">
                    Okno: {String(profile.if_window_start).padStart(2, "0")}:00 &ndash;{" "}
                    {String((profile.if_window_start + profile.if_window_hours) % 24).padStart(2, "0")}:00
                  </span>
                  <span className="text-[var(--text-secondary)] ml-2">
                    ({24 - profile.if_window_hours}h postu / {profile.if_window_hours}h jedzenia)
                  </span>
                </div>

                {/* Live fasting status */}
                {fastingInfo && (
                  <div
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{
                      backgroundColor: fastingInfo.isFasting ? "var(--fast-bg)" : "var(--good-bg)",
                      border: `1px solid ${fastingInfo.isFasting ? "var(--fast)" : "var(--good)"}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: fastingInfo.isFasting ? "var(--fast)" : "var(--good)",
                      }}
                    >
                      {fastingInfo.isFasting ? (
                        <Flame className="h-5 w-5 text-white" />
                      ) : (
                        <Utensils className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: fastingInfo.isFasting ? "var(--fast)" : "var(--good)" }}>
                        {fastingInfo.isFasting ? "Trwa post" : "Okno zywieniowe otwarte"}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {fastingInfo.isFasting
                          ? `Poscisz juz ${fastingInfo.hours}h ${fastingInfo.minutes}min`
                          : `Okno otwarte od ${fastingInfo.hours}h ${fastingInfo.minutes}min`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: fastingInfo.isFasting ? "var(--fast)" : "var(--good)" }}
                      >
                        {fastingInfo.hours}:{String(fastingInfo.minutes).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="warm-card p-4">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-[var(--text-secondary)]">
              <Calculator className="h-4 w-4" />
              Kalkulacje
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-[var(--carbs)]">{bmr}</p>
                <p className="text-xs text-[var(--text-secondary)]">BMR (kcal)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--kcal)]">{tdee}</p>
                <p className="text-xs text-[var(--text-secondary)]">TDEE (kcal)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--accent)]">{suggestedTarget}</p>
                <p className="text-xs text-[var(--text-secondary)]">Cel (kcal)</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Zapisz profil
          </Button>
        </motion.div>
      )}
    </div>
  );
}
