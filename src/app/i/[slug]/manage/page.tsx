import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteCard } from "@/components/InviteCard";
import { RememberInvite } from "@/components/MyInvites";
import { CopyButton, SaveImageButton, WhatsAppButton } from "@/components/ShareActions";
import { SiteHeader } from "@/components/SiteChrome";
import { findInvite, keyMatches, listRsvps, toInviteData } from "@/db/queries";
import { formatEventDate, siteUrl, todayInIST, whatsappShareText } from "@/lib/invite";

export const metadata: Metadata = {
  title: "Manage your invite",
  robots: { index: false, follow: false },
};

const STATUS_LABEL = { yes: "Coming", maybe: "Maybe", no: "Not coming" } as const;
const STATUS_STYLE = {
  yes: "bg-green-100 text-green-800",
  maybe: "bg-amber-100 text-amber-800",
  no: "bg-stone-100 text-stone-600",
} as const;

export default async function ManagePage({ params, searchParams }: PageProps<"/i/[slug]/manage">) {
  const { slug } = await params;
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : undefined;

  const row = await findInvite(slug);
  // Same 404 for "no such invite" and "wrong key" so links can't be probed.
  if (!row || !keyMatches(row, key)) notFound();

  const invite = toInviteData(row);
  const rsvps = await listRsvps(row.id);
  const inviteUrl = `${siteUrl()}/i/${slug}`;
  const manageUrl = `${siteUrl()}/i/${slug}/manage?key=${key}`;
  const ended = todayInIST() > invite.date;

  const totals = { yes: 0, maybe: 0, no: 0 };
  for (const r of rsvps) totals[r.status as keyof typeof totals] += r.status === "no" ? 1 : r.guests;

  const stat = "rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-stone-200";

  return (
    <>
      <SiteHeader />
      <RememberInvite slug={slug} editKey={key!} title={invite.title} date={invite.date} />
      <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[340px_1fr]">
        <div className="min-w-0 space-y-4">
          <div className="mx-auto max-w-[340px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
            <InviteCard invite={invite} id="invite-card" />
          </div>
          <div className="mx-auto flex max-w-[340px] gap-2">
            <Link
              href={`/i/${slug}`}
              className="flex-1 rounded-full border border-stone-300 bg-white py-2.5 text-center text-sm font-semibold"
            >
              👀 View
            </Link>
            <Link
              href={`/i/${slug}/edit?key=${key}`}
              className="flex-1 rounded-full border border-stone-300 bg-white py-2.5 text-center text-sm font-semibold"
            >
              ✏️ Edit
            </Link>
          </div>
        </div>

        {/* Grid items default to min-width:auto, so the non-wrapping link would
            widen the whole column past the screen; min-w-0 lets it truncate.
            On phones the share actions come first; the card follows. */}
        <div className="order-first min-w-0 space-y-6 lg:order-none">
          {sp.new === "1" && (
            <div className="rounded-3xl bg-green-50 p-5 ring-1 ring-green-200">
              <h1 className="text-2xl font-bold text-green-900">Your invite is live! 🎉</h1>
              <p className="mt-1 text-green-800">Now send it to your guests. Most people share it on WhatsApp.</p>
            </div>
          )}
          {sp.updated === "1" && (
            <div className="rounded-3xl bg-green-50 p-4 font-semibold text-green-900 ring-1 ring-green-200">
              Changes saved ✓ Guests will see the new version right away.
            </div>
          )}
          {!sp.new && (
            <h1 className="font-serif text-3xl font-bold text-brand-ink">
              <span className={ended ? "text-stone-400 line-through decoration-stone-300" : ""}>{invite.title}</span>
              {ended && (
                <span className="ml-3 inline-block rounded-full bg-stone-200 px-3 py-1 align-middle font-sans text-sm font-semibold text-stone-600">
                  Ended
                </span>
              )}
            </h1>
          )}
          {ended && (
            <div className="rounded-3xl bg-stone-100 p-4 text-sm text-stone-600 ring-1 ring-stone-200">
              This event took place on {formatEventDate(invite.date, "en")}. Guests can still open the invite, but
              RSVPs are closed. Your guest list is kept below.
            </div>
          )}

          {/* Nothing left to share once the event is over; the guest list is what matters. */}
          {!ended && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
              <h2 className="font-bold">Share with guests</h2>
              <WhatsAppButton
                text={whatsappShareText(invite, inviteUrl)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-4 text-lg font-bold text-white shadow-md transition hover:brightness-105"
              />
              <div className="mt-3 flex items-center gap-2 rounded-full bg-stone-100 p-1.5 pl-4">
                <span className="min-w-0 flex-1 truncate text-sm text-stone-600">{inviteUrl}</span>
                <CopyButton value={inviteUrl} label="Copy link" className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white" />
              </div>
              <SaveImageButton
                cardId="invite-card"
                fileName={slug}
                label="Download as image (for status / print)"
                busyLabel="Preparing image…"
                className="mt-3 w-full rounded-full border border-stone-300 py-3 text-sm font-semibold transition hover:bg-stone-50"
              />
            </section>
          )}

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold">Guest list</h2>
              <span className="text-sm text-stone-500">{row.viewCount} views</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className={stat}>
                <div className="text-3xl font-bold text-green-700">{totals.yes}</div>
                <div className="text-xs text-stone-500">coming</div>
              </div>
              <div className={stat}>
                <div className="text-3xl font-bold text-amber-600">{totals.maybe}</div>
                <div className="text-xs text-stone-500">maybe</div>
              </div>
              <div className={stat}>
                <div className="text-3xl font-bold text-stone-500">{totals.no}</div>
                <div className="text-xs text-stone-500">can&apos;t come</div>
              </div>
            </div>

            {rsvps.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-stone-50 p-6 text-center text-stone-500">
                No replies yet. Share the invite and RSVPs will show up here.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-stone-100">
                {rsvps.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        {r.name}
                        {r.status !== "no" && r.guests > 1 && (
                          <span className="ml-1 font-normal text-stone-500">+{r.guests - 1}</span>
                        )}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status as keyof typeof STATUS_STYLE]}`}
                      >
                        {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL]}
                      </span>
                    </div>
                    {r.note && <p className="mt-1 text-sm text-stone-600">&ldquo;{r.note}&rdquo;</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <h2 className="font-bold text-amber-900">🔒 Keep this page&apos;s link safe</h2>
            <p className="mt-1 text-sm text-amber-900/80">
              This private link is the only way to see RSVPs and edit your invite. This browser remembers it, but save
              it somewhere (e.g. WhatsApp it to yourself) in case you switch phones.
            </p>
            <CopyButton
              value={manageUrl}
              label="Copy my private link"
              className="mt-3 rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
            />
          </section>
        </div>
      </main>
    </>
  );
}
