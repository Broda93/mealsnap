"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PenLine, Loader2, Check } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import type { Meal } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { isInIFWindow, formatIFWindow } from "@/lib/if-utils";
import { IFWarningDialog } from "@/components/if-warning-dialog";

export function ManualAdd() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ifWarningOpen, setIfWarningOpen] = useState(false);

  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<Meal["meal_type"]>("obiad");
  const [calories, setCalories] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");

  const canSave = name.trim() && calories;

  const reset = () => {
    setName("");
    setMealType("obiad");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const doSave = async (inWindow: boolean) => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: `Dodano recznie`,
          meal_type: mealType,
          calories: Number(calories),
          protein_g: Number(protein) || 0,
          carbs_g: Number(carbs) || 0,
          fat_g: Number(fat) || 0,
          fiber_g: 0,
          confidence: "manual",
          in_if_window: inWindow,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      toast.success(`${name} dodany!`);
      setTimeout(() => {
        reset();
        setSaved(false);
        setOpen(false);
      }, 1500);
    } catch {
      toast.error("Blad dodawania posilku");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (profile?.if_enabled && !isInIFWindow(profile)) {
      setIfWarningOpen(true);
      return;
    }
    doSave(true);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full warm-card p-4 text-left transition-all hover:shadow-md"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <PenLine className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Dodaj recznie</p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            Wpisz nazwe, kalorie i makroskładniki
          </p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="warm-card p-4 space-y-4">
              <div>
                <Label>Nazwa posilku</Label>
                <Input
                  placeholder="np. Kurczak z ryzem"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label>Typ posilku</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as Meal["meal_type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kalorie (kcal) *</Label>
                <Input
                  type="number"
                  placeholder="np. 450"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : "")}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Bialko (g)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
                <div>
                  <Label className="text-xs">Wegle (g)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tluszcz (g)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={fat}
                    onChange={(e) => setFat(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!canSave || saving || saved}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Dodano!
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Zapisuje...
                  </>
                ) : (
                  "Zapisz posilek"
                )}
              </Button>
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
            doSave(false);
          }}
          onCancel={() => setIfWarningOpen(false)}
        />
      )}
    </div>
  );
}
