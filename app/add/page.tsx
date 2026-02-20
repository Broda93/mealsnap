"use client";

import { motion } from "framer-motion";
import { CameraCapture } from "@/components/camera-capture";
import { QuickAdd } from "@/components/quick-add";
import { ManualAdd } from "@/components/manual-add";

export default function AddMealPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          Dodaj <span className="text-[var(--accent)]">posilek</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Zrob zdjecie lub wybierz z galerii - AI rozpozna posilek
        </p>
      </motion.div>

      <QuickAdd />
      <ManualAdd />
      <CameraCapture />
    </div>
  );
}
