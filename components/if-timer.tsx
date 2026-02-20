"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { Profile } from "@/lib/types";

interface IFTimerProps {
  profile: Profile;
}

function getIFStatus(windowStart: number, windowHours: number) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const windowEnd = (windowStart + windowHours) % 24;

  let isOpen: boolean;
  if (windowEnd > windowStart) {
    isOpen = currentHour >= windowStart && currentHour < windowEnd;
  } else {
    // Window crosses midnight
    isOpen = currentHour >= windowStart || currentHour < windowEnd;
  }

  let progress: number;
  let timeLeftHours: number;

  if (isOpen) {
    // Calculate progress within eating window
    let elapsed: number;
    if (windowEnd > windowStart) {
      elapsed = currentHour - windowStart;
    } else {
      elapsed = currentHour >= windowStart
        ? currentHour - windowStart
        : currentHour + (24 - windowStart);
    }
    progress = elapsed / windowHours;
    timeLeftHours = windowHours - elapsed;
  } else {
    // Calculate progress within fasting period
    const fastingHours = 24 - windowHours;
    let elapsed: number;
    if (windowEnd > windowStart) {
      // Fasting starts at windowEnd
      elapsed = currentHour >= windowEnd
        ? currentHour - windowEnd
        : currentHour + (24 - windowEnd);
    } else {
      // Window crosses midnight, fasting from windowEnd to windowStart
      elapsed = currentHour >= windowEnd && currentHour < windowStart
        ? currentHour - windowEnd
        : 0;
      if (currentHour >= windowStart) {
        // Shouldn't happen (should be isOpen), but safeguard
        elapsed = 0;
      }
    }
    progress = elapsed / fastingHours;
    timeLeftHours = fastingHours - elapsed;
  }

  // Clamp
  progress = Math.max(0, Math.min(1, progress));
  timeLeftHours = Math.max(0, timeLeftHours);

  return { isOpen, progress, timeLeftHours };
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

export function IFTimer({ profile }: IFTimerProps) {
  const [status, setStatus] = useState(() =>
    getIFStatus(profile.if_window_start, profile.if_window_hours)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getIFStatus(profile.if_window_start, profile.if_window_hours));
    }, 1000);
    return () => clearInterval(interval);
  }, [profile.if_window_start, profile.if_window_hours]);

  const { isOpen, progress, timeLeftHours } = status;
  const windowEnd = (profile.if_window_start + profile.if_window_hours) % 24;

  // SVG ring params
  const size = 148;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const ringColor = isOpen ? "var(--good)" : "var(--fast)";
  const ringBg = isOpen ? "var(--good-bg)" : "var(--fast-bg)";

  // Streak calculation would need DB data; placeholder for now
  const streak = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="warm-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="relative flex h-2.5 w-2.5"
          >
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: ringColor }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: ringColor }}
            />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {isOpen ? "Okno zywieniowe" : "Czas postu"}
          </span>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "var(--fast-bg)", color: "var(--fast)" }}
        >
          {profile.if_protocol}
        </span>
      </div>

      <div className="flex flex-col items-center">
        {/* Circular progress ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringBg}
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-extrabold leading-none">
              {formatTime(timeLeftHours)}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1">
              {isOpen ? "do zamkniecia" : "do otwarcia"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between mt-4 text-xs text-[var(--text-secondary)]">
        <span>
          Okno: {String(profile.if_window_start).padStart(2, "0")}:00 &ndash;{" "}
          {String(windowEnd).padStart(2, "0")}:00
        </span>
        {streak > 0 && (
          <span className="flex items-center gap-1" style={{ color: "var(--streak)" }}>
            <Flame className="h-3.5 w-3.5" />
            {streak} dni
          </span>
        )}
      </div>
    </motion.div>
  );
}
