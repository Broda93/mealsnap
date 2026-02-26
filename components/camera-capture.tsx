"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Camera, Upload, X, Loader2, Check, Edit3, Bookmark, ImageIcon, UtensilsCrossed, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import type { MealAnalysis, Meal } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { isInIFWindow, formatIFWindow } from "@/lib/if-utils";
import { IFWarningDialog } from "@/components/if-warning-dialog";

export function CameraCapture() {
  const { profile } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [mealType, setMealType] = useState<Meal["meal_type"]>("obiad");
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<MealAnalysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [ifWarningOpen, setIfWarningOpen] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [mealScore, setMealScore] = useState<{ score: number; comment: string } | null>(null);
  const [photoMode, setPhotoMode] = useState<"meal" | "products">("meal");
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1024;
        let { width, height } = img;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setMimeType("image/jpeg");
    setImage(compressed);
    setAnalysis(null);
    setSaved(false);
  }, [compressImage]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const compressed = await compressImage(file);
    setMimeType("image/jpeg");
    setImage(compressed);
    setAnalysis(null);
    setSaved(false);
  }, [compressImage]);

  const analyzeImage = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const base64 = image.split(",")[1];
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType, photoMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analiza nie powiodla sie");
      setAnalysis(data);
      setEditValues(data);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Blad analizy";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const doSaveMeal = async (inWindow: boolean) => {
    const data = editMode ? editValues : analysis;
    if (!data || !image) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          meal_type: mealType,
          calories: data.calories,
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          fiber_g: data.fiber_g,
          confidence: data.confidence,
          in_if_window: inWindow,
          image_base64: image.split(",")[1],
          image_mime: mimeType,
        }),
      });
      const savedMeal = await res.json();
      if (!res.ok) throw new Error(savedMeal.error || "Zapis nie powiodl sie");
      setSaved(true);
      toast.success("Posilek zapisany!");

      // Trigger async scoring
      setScoring(true);
      fetch("/api/meals/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: savedMeal.id }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((scored) => {
          if (scored?.score != null) {
            setMealScore({ score: scored.score, comment: scored.ai_comment });
            toast.success(`Ocena AI: ${scored.score}/10`);
          }
        })
        .catch(() => {})
        .finally(() => setScoring(false));
    } catch (err) {
      console.error(err);
      toast.error("Blad zapisu. Sprobuj ponownie.");
    } finally {
      setSaving(false);
    }
  };

  const saveMeal = async () => {
    if (profile?.if_enabled && !isInIFWindow(profile)) {
      setIfWarningOpen(true);
      return;
    }
    await doSaveMeal(true);
  };

  const saveAsTemplate = async () => {
    const data = editMode ? editValues : analysis;
    if (!data) return;
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          meal_type: mealType,
          calories: data.calories,
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          fiber_g: data.fiber_g,
        }),
      });
      if (!res.ok) throw new Error();
      setTemplateSaved(true);
      toast.success("Szablon zapisany!");
    } catch {
      toast.error("Blad zapisu szablonu");
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setEditValues(null);
    setEditMode(false);
    setSaved(false);
    setTemplateSaved(false);
    setScoring(false);
    setMealScore(null);
    setPhotoMode("meal");
    if (fileRef.current) fileRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const confidenceColor = {
    low: "bg-[var(--kcal-soft)] text-[var(--kcal)]",
    medium: "bg-[var(--fat-soft)] text-[var(--fat)]",
    high: "bg-[var(--protein-soft)] text-[var(--protein)]",
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!image ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Drag & drop zone */}
            <div
              className="rounded-2xl border-2 border-dashed transition-colors"
              style={{
                borderColor: dragActive ? "var(--accent)" : "var(--warm-border)",
                backgroundColor: dragActive ? "var(--protein-soft)" : "transparent",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center py-12 gap-4 rounded-2xl">
                <div
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">Dodaj zdjecie posilku</p>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    Zrob zdjecie lub wybierz z galerii
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => galleryRef.current?.click()}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl shadow-sm"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Galeria
                  </Button>
                  <Button
                    onClick={() => fileRef.current?.click()}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Aparat
                  </Button>
                </div>
                {/* Galeria - bez capture, otwiera picker plików/galerii */}
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {/* Aparat - z capture, otwiera kamerę na telefonie */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </motion.div>
        ) : !analysis ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="warm-card overflow-hidden">
              <div className="relative">
                <img
                  src={image}
                  alt="Zdjecie posilku"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl"
                  onClick={reset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                {/* Photo mode selector */}
                <div className="space-y-2">
                  <Label>Co jest na zdjeciu?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPhotoMode("meal")}
                      className="flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: photoMode === "meal" ? "var(--accent)" : "var(--warm-border)",
                        backgroundColor: photoMode === "meal" ? "var(--protein-soft)" : "transparent",
                      }}
                    >
                      <UtensilsCrossed className="h-4 w-4 flex-shrink-0" style={{ color: photoMode === "meal" ? "var(--accent)" : "var(--text-secondary)" }} />
                      <div>
                        <p className="text-sm font-medium">Gotowy posilek</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">Danie na talerzu</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setPhotoMode("products")}
                      className="flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: photoMode === "products" ? "var(--accent)" : "var(--warm-border)",
                        backgroundColor: photoMode === "products" ? "var(--protein-soft)" : "transparent",
                      }}
                    >
                      <ShoppingBasket className="h-4 w-4 flex-shrink-0" style={{ color: photoMode === "products" ? "var(--accent)" : "var(--text-secondary)" }} />
                      <div>
                        <p className="text-sm font-medium">Produkty</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">Surowe skladniki</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Typ posilku</Label>
                  <Select
                    value={mealType}
                    onValueChange={(v) => setMealType(v as Meal["meal_type"])}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEAL_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={analyzeImage}
                  disabled={analyzing}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl h-12"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analizuje...
                    </>
                  ) : (
                    <>Analizuj z AI</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="warm-card overflow-hidden">
              <div className="relative">
                <img
                  src={image}
                  alt={analysis.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3">
                  <Badge className={confidenceColor[analysis.confidence]}>
                    {analysis.confidence === "high"
                      ? "Wysoka pewnosc"
                      : analysis.confidence === "medium"
                      ? "Srednia pewnosc"
                      : "Niska pewnosc"}
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3">
                  <h3 className="text-xl font-bold text-white">{analysis.name}</h3>
                  <p className="text-white/60 text-sm">{analysis.description}</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {editMode && editValues ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Nazwa</Label>
                      <Input
                        value={editValues.name}
                        onChange={(e) =>
                          setEditValues({ ...editValues, name: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Opis</Label>
                      <Input
                        value={editValues.description}
                        onChange={(e) =>
                          setEditValues({ ...editValues, description: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Kalorie (kcal)</Label>
                        <Input
                          type="number"
                          value={editValues.calories}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              calories: Number(e.target.value),
                            })
                          }
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>Bialko (g)</Label>
                        <Input
                          type="number"
                          value={editValues.protein_g}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              protein_g: Number(e.target.value),
                            })
                          }
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>Weglowodany (g)</Label>
                        <Input
                          type="number"
                          value={editValues.carbs_g}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              carbs_g: Number(e.target.value),
                            })
                          }
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>Tluszcz (g)</Label>
                        <Input
                          type="number"
                          value={editValues.fat_g}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              fat_g: Number(e.target.value),
                            })
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--kcal-soft)" }}>
                      <p className="text-xl font-bold text-[var(--kcal)]">
                        {analysis.calories}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">kcal</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--protein-soft)" }}>
                      <p className="text-xl font-bold text-[var(--protein)]">
                        {analysis.protein_g}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">bialko</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--carbs-soft)" }}>
                      <p className="text-xl font-bold text-[var(--carbs)]">
                        {analysis.carbs_g}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">wegle</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--fat-soft)" }}>
                      <p className="text-xl font-bold text-[var(--fat)]">
                        {analysis.fat_g}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">tluszcz</p>
                    </div>
                  </div>
                )}

                {saved ? (
                  <div className="space-y-2">
                    {/* Score display */}
                    {scoring && (
                      <div className="flex items-center justify-center gap-2 py-3 rounded-xl" style={{ backgroundColor: "var(--fast-bg)" }}>
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--fast)" }} />
                        <span className="text-sm" style={{ color: "var(--fast)" }}>AI ocenia posilek...</span>
                      </div>
                    )}
                    {mealScore && (
                      <div
                        className="rounded-xl p-3"
                        style={{
                          backgroundColor: mealScore.score >= 7 ? "var(--good-bg)" : mealScore.score >= 5 ? "var(--mid-bg)" : "var(--bad-bg)",
                          borderLeft: `3px solid ${mealScore.score >= 7 ? "var(--good)" : mealScore.score >= 5 ? "var(--mid)" : "var(--bad)"}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-lg font-extrabold"
                            style={{ color: mealScore.score >= 7 ? "var(--good)" : mealScore.score >= 5 ? "var(--mid)" : "var(--bad)" }}
                          >
                            {mealScore.score}/10
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">Ocena AI</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                          {mealScore.comment}
                        </p>
                      </div>
                    )}

                    <Button disabled className="w-full bg-[var(--accent)] text-white rounded-xl">
                      <Check className="h-4 w-4 mr-2" />
                      Zapisano!
                    </Button>
                    {!templateSaved ? (
                      <Button
                        variant="outline"
                        onClick={saveAsTemplate}
                        className="w-full rounded-xl"
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        Zapisz jako szablon
                      </Button>
                    ) : (
                      <Button disabled variant="outline" className="w-full rounded-xl">
                        <Check className="h-4 w-4 mr-2" />
                        Szablon zapisany
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(!editMode)}
                      className="flex-1 rounded-xl"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {editMode ? "Podglad" : "Edytuj"}
                    </Button>
                    <Button
                      onClick={saveMeal}
                      disabled={saving}
                      className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Zapisz
                    </Button>
                  </div>
                )}

                <Button variant="ghost" onClick={reset} className="w-full rounded-xl">
                  Dodaj kolejny posilek
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {profile?.if_enabled && (
        <IFWarningDialog
          open={ifWarningOpen}
          windowText={formatIFWindow(profile)}
          onConfirm={() => {
            setIfWarningOpen(false);
            doSaveMeal(false);
          }}
          onCancel={() => setIfWarningOpen(false)}
        />
      )}
    </div>
  );
}
