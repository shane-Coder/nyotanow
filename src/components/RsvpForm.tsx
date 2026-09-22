"use client";

import { useActionState, useMemo, useState } from "react";
import { rsvpAction, type RsvpState } from "@/app/actions";
import { parseJson, useStoredValue, writeStored } from "@/lib/client-store";
import { GUEST_UI } from "@/lib/i18n";
import type { RsvpStatus } from "@/lib/invite";
import type { Lang } from "@/lib/themes";

type Saved = { id: string; name: string; status: RsvpStatus; guests?: number; note?: string };

export function RsvpForm({ slug, lang, accent }: { slug: string; lang: Lang; accent: string }) {
  const t = GUEST_UI[lang];
  const storageKey = `nyota:rsvp:${slug}`;
  const [status, setStatus] = useState<RsvpStatus>("yes");
  const [guests, setGuests] = useState(1);
  const [editing, setEditing] = useState(false);
  const raw = useStoredValue(storageKey);
  const saved = useMemo(() => parseJson<Saved | null>(raw, null), [raw]);

  const [state, formAction, pending] = useActionState<RsvpState, FormData>(async (prev, formData) => {
    const result = await rsvpAction(slug, prev, formData);
    if (result?.ok && result.name) {
      // Remembered so a returning guest sees their answer and can change it
      // (which updates their RSVP instead of adding a duplicate).
      const entry: Saved = {
        id: result.id,
        name: result.name,
        status: result.status,
        guests: Number(formData.get("guests")) || 1,
        note: String(formData.get("note") ?? ""),
      };
      writeStored(storageKey, JSON.stringify(entry));
      setEditing(false);
    }
    return result;
  }, undefined);

  if (saved && !editing) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">
          {t.thanksPrefix}, {saved.name}! {t.thanks[saved.status]}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus(saved.status);
            setGuests(saved.guests ?? 1);
            setEditing(true);
          }}
          className="mt-2 text-sm underline opacity-70"
        >
          {t.changeAnswer}
        </button>
      </div>
    );
  }

  const options: { value: RsvpStatus; label: string }[] = [
    { value: "yes", label: t.yes },
    { value: "maybe", label: t.maybe },
    { value: "no", label: t.no },
  ];

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-center text-xl font-bold">{t.willYouCome}</h2>

      <div className="grid grid-cols-3 gap-2" role="radiogroup">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={status === o.value}
            onClick={() => setStatus(o.value)}
            className="rounded-xl border-2 px-2 py-3 text-sm font-semibold transition"
            style={
              status === o.value
                ? { background: accent, borderColor: accent, color: "white" }
                : { borderColor: "#e7e5e4", background: "white" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="status" value={status} />
      {saved && <input type="hidden" name="replaces" value={saved.id} />}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">{t.yourName}</span>
        <input
          name="name"
          required
          defaultValue={saved?.name}
          maxLength={60}
          autoComplete="name"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-stone-500"
        />
      </label>

      {status !== "no" && (
        <div>
          <span className="mb-1 block text-sm font-medium text-stone-600">{t.guests}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Fewer"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              className="size-11 rounded-full border border-stone-300 bg-white text-xl"
            >
              −
            </button>
            <span className="w-8 text-center text-xl font-bold tabular-nums">{guests}</span>
            <button
              type="button"
              aria-label="More"
              onClick={() => setGuests((g) => Math.min(20, g + 1))}
              className="size-11 rounded-full border border-stone-300 bg-white text-xl"
            >
              +
            </button>
          </div>
        </div>
      )}
      <input type="hidden" name="guests" value={status === "no" ? 1 : guests} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">{t.note}</span>
        <textarea
          name="note"
          defaultValue={saved?.note}
          rows={2}
          maxLength={300}
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-stone-500"
        />
      </label>

      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />

      {state && !state.ok && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl py-3.5 text-base font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-60"
        style={{ background: accent }}
      >
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
