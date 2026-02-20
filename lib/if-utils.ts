import type { Profile } from "./types";

export function isInIFWindow(profile: Profile): boolean {
  if (!profile.if_enabled) return true;

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const windowStart = profile.if_window_start;
  const windowEnd = (windowStart + profile.if_window_hours) % 24;

  if (windowEnd > windowStart) {
    return currentHour >= windowStart && currentHour < windowEnd;
  }
  // Window crosses midnight
  return currentHour >= windowStart || currentHour < windowEnd;
}

export function formatIFWindow(profile: Profile): string {
  const start = String(profile.if_window_start).padStart(2, "0");
  const end = String((profile.if_window_start + profile.if_window_hours) % 24).padStart(2, "0");
  return `${start}:00\u2013${end}:00`;
}

/**
 * Returns fasting info: hours/minutes on fast, and whether currently fasting.
 * If in eating window, returns time since window opened.
 */
export function getFastingInfo(profile: Profile): {
  isFasting: boolean;
  hours: number;
  minutes: number;
} {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const windowStartMin = profile.if_window_start * 60;
  const windowEndMin = ((profile.if_window_start + profile.if_window_hours) % 24) * 60;

  const inWindow = isInIFWindow(profile);

  if (inWindow) {
    // Currently in eating window - show how long since window opened
    let elapsed = currentMinutes - windowStartMin;
    if (elapsed < 0) elapsed += 24 * 60;
    return {
      isFasting: false,
      hours: Math.floor(elapsed / 60),
      minutes: elapsed % 60,
    };
  }

  // Currently fasting - calculate hours since eating window closed
  let elapsed = currentMinutes - windowEndMin;
  if (elapsed < 0) elapsed += 24 * 60;
  return {
    isFasting: true,
    hours: Math.floor(elapsed / 60),
    minutes: elapsed % 60,
  };
}
