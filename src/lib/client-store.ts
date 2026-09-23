"use client";

import { useSyncExternalStore } from "react";
import { todayInIST } from "./invite";

/* ---------------- localStorage, readable during render ---------------- */

const LOCAL_EVENT = "nyota:storage";

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(LOCAL_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(LOCAL_EVENT, cb);
  };
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Raw string from localStorage; null on the server and on first hydration pass. */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(subscribeStorage, () => readStorage(key), () => null);
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / storage full: the app still works, it just won't remember.
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

export function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------- shared 1s clock ------------------------- */

const tickListeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = 0;

function subscribeClock(cb: () => void) {
  tickListeners.add(cb);
  timer ??= setInterval(() => {
    now = Date.now();
    tickListeners.forEach((l) => l());
  }, 1000);
  return () => {
    tickListeners.delete(cb);
    if (!tickListeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time, ticking every second. Null during SSR so server and client HTML agree. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => (now ||= Date.now()),
    () => null,
  );
}

/* ---------------------- today's date in India ---------------------- */

const dayListeners = new Set<() => void>();
let dayTimer: ReturnType<typeof setInterval> | undefined;
let today = "";

// Checked once a minute rather than with a midnight timer: a tab left open
// overnight should not keep offering yesterday as a valid date.
function subscribeDay(cb: () => void) {
  dayListeners.add(cb);
  dayTimer ??= setInterval(() => {
    const next = todayInIST();
    if (next !== today) {
      today = next;
      dayListeners.forEach((l) => l());
    }
  }, 60_000);
  return () => {
    dayListeners.delete(cb);
    if (!dayListeners.size && dayTimer) {
      clearInterval(dayTimer);
      dayTimer = undefined;
    }
  };
}

/**
 * Today in India as YYYY-MM-DD, or null during SSR.
 *
 * Null on the server matters: the create pages are prerendered at build time,
 * so a date baked into the HTML would be stale by the next day.
 */
export function useTodayInIST(): string | null {
  return useSyncExternalStore(
    subscribeDay,
    () => (today ||= todayInIST()),
    () => null,
  );
}
