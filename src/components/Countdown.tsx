"use client";

import { useNow } from "@/lib/client-store";
import { eventStart, todayInIST } from "@/lib/invite";

type Labels = { units: readonly string[]; today: string; over: string };

export function Countdown({ date, time, labels }: { date: string; time: string; labels: Labels }) {
  // Null until hydrated: the server's clock and the guest's clock would
  // otherwise disagree and cause a hydration mismatch.
  const now = useNow();

  if (now === null) return <div className="h-[76px]" aria-hidden />;

  const today = todayInIST(new Date(now));
  if (today > date) return <p className="py-6 text-center text-sm opacity-80">{labels.over}</p>;

  const diff = eventStart(date, time).getTime() - now;
  if (diff <= 0 || (!time && today === date)) {
    return <p className="py-5 text-center text-xl font-bold">{labels.today}</p>;
  }

  const parts = [
    Math.floor(diff / 86_400_000),
    Math.floor(diff / 3_600_000) % 24,
    Math.floor(diff / 60_000) % 60,
    Math.floor(diff / 1000) % 60,
  ];

  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-live="off">
      {parts.map((value, i) => (
        <div key={i} className="rounded-2xl bg-white/80 py-3 text-center text-stone-900 shadow-sm">
          <div className="text-2xl font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
          <div className="text-xs text-stone-500">{labels.units[i]}</div>
        </div>
      ))}
    </div>
  );
}
