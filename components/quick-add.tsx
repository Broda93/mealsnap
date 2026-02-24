"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Zap, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { MealTemplate, Meal } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { isInIFWindow, formatIFWindow } from "@/lib/if-utils";
import { IFWarningDialog } from "@/components/if-warning-dialog";

const mealTypeColors: Record<Meal["meal_type"], string> = {
  sniadanie: "bg-[var(--kcal-soft)] text-[var(--kcal)]",
  obiad: "bg-[var(--carbs-soft)] text-[var(--carbs)]",
  kolacja: "bg-[var(--protein-soft)] text-[var(--protein)]",
  przekaska: "bg-[var(--fat-soft)] text-[var(--fat)]",
};

export function QuickAdd() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [ifWarningOpen, setIfWarningOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<MealTemplate | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doAddFromTemplate = async (template: MealTemplate, inWindow: boolean) => {
    setAdding(template.id);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          meal_type: template.meal_type,
          calories: template.calories,
          protein_g: template.protein_g,
          carbs_g: template.carbs_g,
          fat_g: template.fat_g,
          fiber_g: template.fiber_g,
          confidence: "high",
          in_if_window: inWindow,
        }),
      });
      if (!res.ok) throw new Error();
      const savedMeal = await res.json();
      toast.success(`${template.name} dodany!`);

      // Auto-score w tle
      fetch("/api/meals/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: savedMeal.id }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((scored) => {
          if (scored?.score != null) {
            toast.success(`Ocena AI: ${scored.score}/10`, { icon: "✨" });
          }
        })
        .catch(() => {});
    } catch {
      toast.error("Blad dodawania posilku");
    } finally {
      setAdding(null);
    }
  };

  const addFromTemplate = async (template: MealTemplate) => {
    if (profile?.if_enabled && !isInIFWindow(profile)) {
      setPendingTemplate(template);
      setIfWarningOpen(true);
      return;
    }
    await doAddFromTemplate(template, true);
  };

  const deleteTemplate = async (id: string) => {
    const res = await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Szablon usuniety");
    } else {
      toast.error("Blad usuwania szablonu");
    }
  };

  if (loading) return null;
  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-[var(--fat)]" />
        <h2 className="font-semibold text-sm">Szybkie dodanie</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence>
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
              className="flex-shrink-0"
            >
              <div className="warm-card p-3 w-48">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm truncate flex-1">{template.name}</span>
                  <Badge className={`${mealTypeColors[template.meal_type]} text-[10px] px-1.5`} variant="secondary">
                    {MEAL_TYPE_LABELS[template.meal_type]}
                  </Badge>
                </div>
                <div className="flex gap-2 text-[10px] mb-3">
                  <span className="font-bold text-[var(--kcal)]">{template.calories} kcal</span>
                  <span className="text-[var(--protein)]">B:{template.protein_g}g</span>
                  <span className="text-[var(--carbs)]">W:{template.carbs_g}g</span>
                  <span className="text-[var(--fat)]">T:{template.fat_g}g</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs flex-1 bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-lg"
                    disabled={adding === template.id}
                    onClick={() => addFromTemplate(template)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {adding === template.id ? "..." : "Dodaj"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[var(--text-secondary)] hover:text-destructive"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {profile?.if_enabled && (
        <IFWarningDialog
          open={ifWarningOpen}
          windowText={formatIFWindow(profile)}
          onConfirm={() => {
            setIfWarningOpen(false);
            if (pendingTemplate) {
              doAddFromTemplate(pendingTemplate, false);
              setPendingTemplate(null);
            }
          }}
          onCancel={() => {
            setIfWarningOpen(false);
            setPendingTemplate(null);
          }}
        />
      )}
    </div>
  );
}
