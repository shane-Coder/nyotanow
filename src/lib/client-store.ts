"use client";

import { useSyncExternalStore } from "react";
import { timeNowInIST, todayInIST } from "./invite";

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

/* ------------------- date and time in India ------------------- */

export type IstNow = { date: string; time: string };

const istListeners = new Set<() => void>();
let istTimer: ReturnType<typeof setInterval> | undefined;
// Cached so getSnapshot returns a stable reference; a fresh object each call
// would make useSyncExternalStore re-render forever.
let istNow: IstNow | null = null;

function readIst(): IstNow {
  return { date: todayInIST(), time: timeNowInIST() };
}

// Polled rather than scheduled on the minute: cheap, and it survives a laptop
// waking from sleep, which a single timeout would not.
function subscribeIst(cb: () => void) {
  istListeners.add(cb);
  istTimer ??= setInterval(() => {
    const next = readIst();
    if (!istNow || next.date !== istNow.date || next.time !== istNow.time) {
      istNow = next;
      istListeners.forEach((l) => l());
    }
  }, 20_000);
  return () => {
    istListeners.delete(cb);
    if (!istListeners.size && istTimer) {
      clearInterval(istTimer);
      istTimer = undefined;
    }
  };
}

/**
 * Today's date and the current minute in India, or null during SSR.
 *
 * Null on the server matters: the create pages are prerendered at build time,
 * so anything baked into that HTML would be stale before anyone saw it.
 */
export function useIstNow(): IstNow | null {
  return useSyncExternalStore(
    subscribeIst,
    () => (istNow ??= readIst()),
    () => null,
  );
}
