"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Edit3, Save, X, MessageSquare, AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { Meal } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
  onUpdate?: (updated: Meal) => void;
}

const mealTypeColors: Record<Meal["meal_type"], string> = {
  sniadanie: "bg-[var(--kcal-soft)] text-[var(--kcal)]",
  obiad: "bg-[var(--carbs-soft)] text-[var(--carbs)]",
  kolacja: "bg-[var(--protein-soft)] text-[var(--protein)]",
  przekaska: "bg-[var(--fat-soft)] text-[var(--fat)]",
};

function getScoreStyle(score: number) {
  if (score >= 7) return { bg: "var(--good-bg)", color: "var(--good)" };
  if (score >= 5) return { bg: "var(--mid-bg)", color: "var(--mid)" };
  return { bg: "var(--bad-bg)", color: "var(--bad)" };
}

export function MealCard({ meal, onDelete, onUpdate }: MealCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: meal.name,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    note: meal.note || "",
  });

  const time = new Date(meal.eaten_at).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: meal.id,
          name: editData.name,
          calories: editData.calories,
          protein_g: editData.protein_g,
          carbs_g: editData.carbs_g,
          fat_g: editData.fat_g,
          note: editData.note || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdate?.(updated);
      setEditing(false);
      toast.success("Posilek zaktualizowany");
    } catch {
      toast.error("Blad aktualizacji");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    setEditData({
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      note: meal.note || "",
    });
    setEditing(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div
        className="warm-card overflow-hidden"
        style={
          meal.in_if_window === false
            ? { borderLeft: "3px solid var(--bad)" }
            : undefined
        }
      >
        {/* IF warning badge */}
        {meal.in_if_window === false && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: "var(--bad-bg)", color: "var(--bad)" }}
          >
            <AlertTriangle className="h-3 w-3" />
            Poza oknem IF
          </div>
        )}

        {meal.image_url ? (
          <div className="relative">
            <div className="relative w-full h-36">
              <Image
                src={meal.image_url}
                alt={meal.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-sm">{meal.name}</h4>
                    <Badge className={mealTypeColors[meal.meal_type]} variant="secondary">
                      {MEAL_TYPE_LABELS[meal.meal_type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">{time}</p>
                </div>
                <div className="flex gap-1">
                  {!editing && !confirming && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                      onClick={startEdit}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && !confirming && !editing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-white/10"
                      onClick={() => setConfirming(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{meal.name}</h4>
                  <Badge className={mealTypeColors[meal.meal_type]} variant="secondary">
                    {MEAL_TYPE_LABELS[meal.meal_type]}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{time}</p>
              </div>
              <div className="flex gap-1">
                {!editing && !confirming && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                    onClick={startEdit}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && !confirming && !editing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[var(--text-secondary)] hover:text-destructive"
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Note display */}
        {meal.note && !editing && !confirming && (
          <div className="px-3 pb-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <MessageSquare className="h-3 w-3" />
              <span className="italic">{meal.note}</span>
            </div>
          </div>
        )}

        <div className="px-3 pb-3">
          <AnimatePresence mode="wait">
            {confirming && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mb-2"
              >
                <span className="text-xs text-destructive font-medium">Usunac?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    onDelete?.(meal.id);
                    setConfirming(false);
                  }}
                >
                  Tak
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setConfirming(false)}
                >
                  Nie
                </Button>
              </motion.div>
            )}

            {editing && (
              <motion.div
                key="edit"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 mb-2"
              >
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Nazwa"
                  className="h-8 text-sm rounded-lg"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  <Input
                    type="number"
                    value={editData.calories}
                    onChange={(e) => setEditData({ ...editData, calories: Number(e.target.value) })}
                    placeholder="kcal"
                    className="h-8 text-xs rounded-lg"
                  />
                  <Input
                    type="number"
                    value={editData.protein_g}
                    onChange={(e) => setEditData({ ...editData, protein_g: Number(e.target.value) })}
                    placeholder="B (g)"
                    className="h-8 text-xs rounded-lg"
                  />
                  <Input
                    type="number"
                    value={editData.carbs_g}
                    onChange={(e) => setEditData({ ...editData, carbs_g: Number(e.target.value) })}
                    placeholder="W (g)"
                    className="h-8 text-xs rounded-lg"
                  />
                  <Input
                    type="number"
                    value={editData.fat_g}
                    onChange={(e) => setEditData({ ...editData, fat_g: Number(e.target.value) })}
                    placeholder="T (g)"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <Input
                  value={editData.note}
                  onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                  placeholder="Notatka (np. po treningu)"
                  className="h-8 text-sm rounded-lg"
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-lg"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saving ? "..." : "Zapisz"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs rounded-lg"
                    onClick={() => setEditing(false)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Anuluj
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!confirming && !editing && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="rounded-lg px-2.5 py-1.5 text-center flex-1" style={{ backgroundColor: "var(--kcal-soft)" }}>
                  <p className="text-xs font-bold text-[var(--kcal)]">{meal.calories}</p>
                  <p className="text-[9px] text-[var(--text-secondary)]">kcal</p>
                </div>
                <div className="rounded-lg px-2.5 py-1.5 text-center flex-1" style={{ backgroundColor: "var(--protein-soft)" }}>
                  <p className="text-xs font-bold text-[var(--protein)]">{meal.protein_g}g</p>
                  <p className="text-[9px] text-[var(--text-secondary)]">bialko</p>
                </div>
                <div className="rounded-lg px-2.5 py-1.5 text-center flex-1" style={{ backgroundColor: "var(--carbs-soft)" }}>
                  <p className="text-xs font-bold text-[var(--carbs)]">{meal.carbs_g}g</p>
                  <p className="text-[9px] text-[var(--text-secondary)]">wegle</p>
                </div>
                <div className="rounded-lg px-2.5 py-1.5 text-center flex-1" style={{ backgroundColor: "var(--fat-soft)" }}>
                  <p className="text-xs font-bold text-[var(--fat)]">{meal.fat_g}g</p>
                  <p className="text-[9px] text-[var(--text-secondary)]">tluszcz</p>
                </div>

                {/* Score badge */}
                {meal.score != null && (
                  <button
                    onClick={() => meal.ai_comment && setCommentOpen(!commentOpen)}
                    className="rounded-lg px-2.5 py-1.5 text-center flex-shrink-0 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: getScoreStyle(meal.score).bg,
                      cursor: meal.ai_comment ? "pointer" : "default",
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: getScoreStyle(meal.score).color }}>
                      {meal.score}
                    </p>
                    <p className="text-[9px] text-[var(--text-secondary)]">
                      {meal.ai_comment ? (commentOpen ? "zwiń" : "AI") : "score"}
                    </p>
                  </button>
                )}
              </div>

              {/* Expandable AI comment */}
              <AnimatePresence>
                {commentOpen && meal.ai_comment && meal.score != null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-lg p-2.5 text-[13px] leading-relaxed"
                      style={{
                        backgroundColor: getScoreStyle(meal.score).bg,
                        borderLeft: `3px solid ${getScoreStyle(meal.score).color}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="h-3 w-3" style={{ color: getScoreStyle(meal.score).color }} />
                        <span className="text-[11px] font-semibold" style={{ color: getScoreStyle(meal.score).color }}>
                          Komentarz AI
                        </span>
                      </div>
                      <p style={{ color: "var(--text)" }}>{meal.ai_comment}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
