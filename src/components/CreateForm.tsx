"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useStoredValue, useTodayInIST } from "@/lib/client-store";
import { REFERRER_KEY } from "./RememberReferrer";
import type { FormState } from "@/app/actions";
import { isPastDate, type InviteData } from "@/lib/invite";
import { OCCASIONS, getOccasion } from "@/lib/occasions";
import { PALETTES, TEMPLATES, templatesFor, type Lang } from "@/lib/themes";
import { InviteCard } from "./InviteCard";

type Props = {
  initial: InviteData;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
};

export function CreateForm({ initial, action, mode }: Props) {
  const [data, setData] = useState<InviteData>(initial);
  const [state, formAction, pending] = useActionState(action, undefined);
  const occasion = getOccasion(data.occasion) ?? OCCASIONS[0];
  // Set when this host arrived from another invite's footer.
  const referrer = useStoredValue(REFERRER_KEY) === "invite" ? "invite" : "";
  const errors = state?.fieldErrors ?? {};
  // Same designs for every occasion, just ordered so the fitting ones lead.
  const designs = templatesFor(data.occasion)
    .map((id) => TEMPLATES.find((t) => t.id === id)!)
    .filter(Boolean);
  // Null until mounted, so the prerendered HTML carries no date of its own.
  const today = useTodayInIST();
  // A backstop: the picker below already refuses past dates, but min= is only
  // as good as the browser honouring it.
  const datePassed = today !== null && isPastDate(data.date, today);
  const dateError =
    errors.date ??
    (datePassed
      ? [mode === "create" ? "This date has already passed" : "This date has passed, so guests will see the event as ended"]
      : undefined);

  const set = <K extends keyof InviteData>(key: K, value: InviteData[K]) => setData((d) => ({ ...d, [key]: value }));

  // Switching language swaps the default wording, but never text the host typed.
  function switchLang(lang: Lang) {
    setData((d) => {
      const from = d.lang;
      return {
        ...d,
        lang,
        kicker: d.kicker === occasion.kicker[from] ? occasion.kicker[lang] : d.kicker,
        message: d.message === occasion.message[from] ? occasion.message[lang] : d.message,
      };
    });
  }

  // Swaps in the new occasion's defaults while keeping everything the host typed.
  function switchOccasion(id: string) {
    const next = getOccasion(id);
    if (!next || next.id === data.occasion) return;
    setData((d) => ({
      ...d,
      occasion: next.id as InviteData["occasion"],
      kicker: d.kicker === occasion.kicker[d.lang] ? next.kicker[d.lang] : d.kicker,
      message: d.message === occasion.message[d.lang] ? next.message[d.lang] : d.message,
      template: d.template === occasion.template ? next.template : d.template,
      palette: d.palette === occasion.palette ? next.palette : d.palette,
    }));
    window.history.replaceState(null, "", `/create/${next.id}`);
  }

  const placeholders = {
    title: occasion.titlePlaceholder[data.lang],
    hostedBy: occasion.hostPlaceholder[data.lang],
    venue: data.lang === "hi" ? "स्थान का नाम" : "Venue name",
  };

  const publishLabel = mode === "create" ? "Create my invite ✨" : "Save changes";

  return (
    <form action={formAction} className="mx-auto grid max-w-6xl gap-8 px-4 pb-32 sm:px-6 lg:grid-cols-[1fr_minmax(0,440px)] lg:pb-16">
      {(["occasion", "template", "palette", "lang"] as const).map((k) => (
        <input key={k} type="hidden" name={k} value={data[k]} />
      ))}
      {mode === "create" && <input type="hidden" name="source" value={referrer} />}
      {/* Honeypot: off-screen and skipped by tab order, so only bots fill it. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />

      {/* Preview: first on mobile so people see the result straight away. */}
      <div className="lg:order-2">
        <div className="lg:sticky lg:top-6">
          <p className="mb-3 text-center text-xs font-semibold tracking-widest text-stone-500 uppercase">Live preview</p>
          <div className="mx-auto max-w-[320px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 sm:max-w-[400px]">
            <InviteCard invite={data} placeholders={placeholders} />
          </div>
        </div>
      </div>

      <div className="space-y-6 lg:order-1">
        <Section title="Occasion">
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.filter((o) => mode === "create" || o.id === data.occasion).map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={mode === "edit"}
                onClick={() => switchOccasion(o.id)}
                className={chip(o.id === data.occasion)}
                aria-pressed={o.id === data.occasion}
              >
                {o.emoji} {o.name.en}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Language on the card">
          <div className="inline-flex rounded-full bg-stone-100 p-1">
            {(
              [
                ["en", "English"],
                ["hi", "हिंदी"],
              ] as const
            ).map(([l, label]) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLang(l)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  data.lang === l ? "bg-white shadow text-stone-900" : "text-stone-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Event details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event name" required error={errors.title} className="sm:col-span-2">
              <input
                name="title"
                autoComplete="off"
                value={data.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={placeholders.title}
                maxLength={80}
                required
                className={input}
              />
            </Field>
            <Field label="Date" required error={dateError}>
              <input
                type="date"
                name="date"
                value={data.date}
                onChange={(e) => set("date", e.target.value)}
                // Opens the calendar on today and greys out everything before
                // it. Only while creating: editing an event that has already
                // happened is allowed, it just warns.
                min={mode === "create" ? (today ?? undefined) : undefined}
                required
                className={input}
              />
            </Field>
            <Field label="Time" error={errors.time}>
              <input type="time" name="time" value={data.time} onChange={(e) => set("time", e.target.value)} className={input} />
            </Field>
            <Field label="Venue" required error={errors.venue}>
              <input
                name="venue"
                autoComplete="off"
                value={data.venue}
                onChange={(e) => set("venue", e.target.value)}
                placeholder={data.lang === "hi" ? "जैसे: होटल राजमहल" : "e.g. Hotel Rajmahal"}
                maxLength={120}
                required
                className={input}
              />
            </Field>
            <Field label="Address" hint="Guests get a Google Maps button" error={errors.address}>
              <input
                name="address"
                autoComplete="off"
                value={data.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Sector 18, Noida"
                maxLength={240}
                className={input}
              />
            </Field>
            <Field label="Hosted by" error={errors.hostedBy} className="sm:col-span-2">
              <input
                name="hostedBy"
                autoComplete="off"
                value={data.hostedBy}
                onChange={(e) => set("hostedBy", e.target.value)}
                placeholder={placeholders.hostedBy}
                maxLength={80}
                className={input}
              />
            </Field>
            <Field label="Message" error={errors.message} className="sm:col-span-2">
              <textarea
                name="message"
                autoComplete="off"
                value={data.message}
                onChange={(e) => set("message", e.target.value)}
                rows={3}
                maxLength={400}
                className={input}
              />
            </Field>
            <Field label="Top line" hint="The small line above the event name" error={errors.kicker} className="sm:col-span-2">
              <input name="kicker"
                autoComplete="off" value={data.kicker} onChange={(e) => set("kicker", e.target.value)} maxLength={60} className={input} />
            </Field>
          </div>
        </Section>

        <Section title="Design">
          <p className="mb-2 text-sm text-stone-500">
            {TEMPLATES.length} designs, shown in your colours. Tap one to try it.
          </p>
          {/* Ordered for the chosen occasion, so the most fitting designs come first. */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {designs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set("template", t.id)}
                className={`overflow-hidden rounded-xl text-left ring-offset-2 transition ${
                  data.template === t.id ? "ring-3 ring-stone-900" : "ring-1 ring-stone-200 hover:ring-stone-400"
                }`}
                aria-pressed={data.template === t.id}
              >
                <div className="pointer-events-none">
                  <InviteCard invite={{ ...data, template: t.id }} placeholders={placeholders} />
                </div>
                <span className="block bg-white px-2 py-1.5 text-center text-xs font-semibold">{t.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 mb-2 text-sm font-medium text-stone-600">Colours</p>
          <div className="flex flex-wrap gap-3">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("palette", p.id)}
                title={p.name}
                aria-label={p.name}
                aria-pressed={data.palette === p.id}
                className={`size-11 rounded-full ring-offset-2 transition ${
                  data.palette === p.id ? "ring-3 ring-stone-900" : "ring-1 ring-stone-300"
                }`}
                style={{ background: `linear-gradient(135deg, ${p.bg2} 0 50%, ${p.accent} 50% 100%)` }}
              />
            ))}
          </div>
        </Section>

        {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}

        {/* Sticky on mobile so the main action is always one tap away. */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="submit"
            disabled={pending}
            className="mx-auto block w-full max-w-md rounded-full bg-[var(--brand)] py-4 text-base font-bold text-white shadow-lg shadow-orange-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 lg:mx-0"
          >
            {pending ? "Creating…" : publishLabel}
          </button>
          {mode === "create" && (
            <p className="mt-2 text-center text-xs text-stone-500 lg:text-left">Free. No sign-up needed.</p>
          )}
        </div>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-600 focus:ring-2 focus:ring-stone-200";

function chip(active: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition ${
    active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
  }`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-base font-bold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string[];
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-stone-700">
        {label} {required && <span className="text-[var(--brand)]">*</span>}
      </span>
      {children}
      {/* Below the input, so a long hint can't push one input lower than its neighbour. */}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
      {error?.[0] && <span className="mt-1 block text-sm text-red-600">{error[0]}</span>}
    </label>
  );
}
