import { createHash, timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStats, type Stats } from "@/db/queries";
import { getOccasion } from "@/lib/occasions";

export const metadata: Metadata = { title: "Stats", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function keyOk(given: string | undefined): boolean {
  const expected = process.env.STATS_KEY;
  // No key configured means the page stays closed, not open to everyone.
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const { key } = await searchParams;
  if (!keyOk(typeof key === "string" ? key : undefined)) notFound();

  const s = await getStats();
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const trend = s.prev7 === 0 ? (s.last7 > 0 ? "new" : "flat") : `${s.last7 >= s.prev7 ? "+" : ""}${pct(s.last7 - s.prev7, s.prev7)}%`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-bold text-brand-ink">NyotaNow stats</h1>
      <p className="mt-1 text-sm text-stone-500">
        Live from the database. Private page: anyone with this link can see it, so don&apos;t share it.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Invites created" value={s.invites} hint={`${s.last7} in last 7 days (${trend})`} />
        <Stat
          label="From an invite"
          value={s.invitesFromInvites}
          hint={`${pct(s.invitesFromInvites, s.invites)}% of all invites`}
          highlight
        />
        <Stat label="RSVPs" value={s.rsvps} hint={`${s.guestsComing} guests coming`} />
        <Stat label="Invite page views" value={s.views} />
      </section>

      <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">
        <strong>The number that matters:</strong> &ldquo;From an invite&rdquo; counts hosts who landed here through
        someone else&apos;s invite footer and then made their own. If that share keeps climbing, the loop is working
        and you don&apos;t need ads.
      </p>

      <Panel title="Last 14 days">
        <Chart daily={s.daily} />
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Occasions">
          <Bars
            rows={s.byOccasion.map((o) => ({
              label: `${getOccasion(o.occasion)?.emoji ?? ""} ${getOccasion(o.occasion)?.name.en ?? o.occasion}`,
              value: o.count,
            }))}
          />
        </Panel>
        <Panel title="Language & replies">
          <Bars
            rows={[
              ...s.byLang.map((l) => ({ label: l.lang === "hi" ? "हिंदी cards" : "English cards", value: l.count })),
              ...s.byStatus.map((b) => ({
                label: b.status === "yes" ? "RSVP: coming" : b.status === "no" ? "RSVP: can't come" : "RSVP: maybe",
                value: b.count,
              })),
            ]}
          />
          <p className="mt-4 text-sm text-stone-600">
            {s.invitesWithRsvps} of {s.invites} invites got at least one reply ({pct(s.invitesWithRsvps, s.invites)}%).
          </p>
        </Panel>
      </div>

      <Panel title="Latest invites">
        {s.recent.length === 0 ? (
          <p className="text-stone-500">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-stone-500 uppercase">
                <tr>
                  <th className="pb-2">Invite</th>
                  <th className="pb-2">Made</th>
                  <th className="pb-2 text-right">Views</th>
                  <th className="pb-2 text-right">RSVPs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {s.recent.map((i) => (
                  <tr key={i.slug}>
                    <td className="max-w-[220px] truncate py-2 pr-3">
                      <a href={`/i/${i.slug}`} className="font-medium hover:underline">
                        {i.title}
                      </a>
                      {i.source === "invite" && (
                        <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                          from invite
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-stone-500">{dateFmt.format(i.createdAt)}</td>
                    <td className="py-2 text-right tabular-nums">{i.views}</td>
                    <td className="py-2 text-right tabular-nums">{i.rsvps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: number; hint?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${highlight ? "bg-orange-50 ring-orange-200" : "bg-white ring-stone-200"}`}>
      <div className="text-3xl font-bold tabular-nums text-stone-900">{value}</div>
      <div className="text-sm font-medium text-stone-600">{label}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

function Chart({ daily }: { daily: Stats["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.invites, d.rsvps)));
  return (
    <>
      <div className="flex items-end gap-1.5" style={{ height: 140 }}>
        {daily.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-[110px] w-full items-end justify-center gap-0.5">
              <span
                title={`${d.invites} invites`}
                className="w-1/2 rounded-t bg-[var(--brand)]"
                style={{ height: `${(d.invites / max) * 100}%`, minHeight: d.invites ? 3 : 0 }}
              />
              <span
                title={`${d.rsvps} RSVPs`}
                className="w-1/2 rounded-t bg-stone-300"
                style={{ height: `${(d.rsvps / max) * 100}%`, minHeight: d.rsvps ? 3 : 0 }}
              />
            </div>
            <span className="text-[10px] text-stone-400">{d.day.slice(8)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-[var(--brand)]" /> invites created
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded bg-stone-300" /> RSVPs
        </span>
      </div>
    </>
  );
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-stone-500">Nothing yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-stone-600">{r.label}</span>
          <span className="h-2.5 flex-1 rounded-full bg-stone-100">
            <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="w-8 text-right tabular-nums text-stone-700">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
