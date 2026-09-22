import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { Countdown } from "@/components/Countdown";
import { InviteCard } from "@/components/InviteCard";
import { RsvpForm } from "@/components/RsvpForm";
import { NativeShareButton, SaveImageButton } from "@/components/ShareActions";
import { Logo } from "@/components/SiteChrome";
import { comingCount, findInvite, recordView, toInviteData } from "@/db/queries";
import { GUEST_UI } from "@/lib/i18n";
import { formatEventDate, formatEventTime, googleCalendarUrl, mapsUrl, shareMessage, siteUrl, todayInIST } from "@/lib/invite";
import { getPalette } from "@/lib/themes";

const loadInvite = cache(findInvite);
// Reads live data (edits, RSVP counts) from the DB, so never serve a cached copy.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/i/[slug]">): Promise<Metadata> {
  const row = await loadInvite((await params).slug);
  if (!row) return { title: "Invite not found" };
  const invite = toInviteData(row);
  const when = [formatEventDate(invite.date, invite.lang), formatEventTime(invite.date, invite.time, invite.lang)]
    .filter(Boolean)
    .join(", ");
  const hi = invite.lang === "hi";
  const title = `${invite.title} · ${hi ? "आपको न्योता है" : "You're invited"} 💌`;
  const description = `${when} · ${invite.venue}. ${hi ? "जवाब देने के लिए टैप करें।" : "Tap to RSVP."}`;
  return {
    title: { absolute: title },
    description,
    // Invites are personal; keep them out of search results.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function InvitePage({ params }: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const row = await loadInvite(slug);
  if (!row) notFound();

  const invite = toInviteData(row);
  const palette = getPalette(invite.palette);
  const t = GUEST_UI[invite.lang];
  const url = `${siteUrl()}/i/${slug}`;
  const coming = await comingCount(row.id);
  const ended = todayInIST() > invite.date;
  // Dark palettes look great on the card but too heavy for buttons and page chrome.
  const actionColor = palette.dark ? palette.bg2 : palette.accent;
  const pageTint = palette.dark ? `${palette.accent}40` : palette.bg2;

  after(() => recordView(row.id));

  const btn =
    "flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3.5 text-sm font-semibold text-stone-800 shadow-sm ring-1 ring-black/5 transition hover:bg-stone-50";

  return (
    <div
      lang={invite.lang}
      className="min-h-full flex-1"
      style={{ background: `linear-gradient(180deg, ${pageTint} 0%, #fffaf3 55%)` }}
    >
      <main className="mx-auto max-w-md px-4 pt-6 pb-10">
        <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
          <InviteCard invite={invite} id="invite-card" />
        </div>

        <div className="mt-6 text-stone-800">
          <Countdown date={invite.date} time={invite.time} labels={{ units: t.units, today: t.today, over: t.over }} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={mapsUrl(invite.venue, invite.address)} target="_blank" rel="noopener noreferrer" className={btn}>
            📍 {t.directions}
          </a>
          {!ended && (
            <a href={googleCalendarUrl(invite, url)} target="_blank" rel="noopener noreferrer" className={btn}>
              📅 {t.calendar}
            </a>
          )}
          <SaveImageButton cardId="invite-card" fileName={slug} label={t.saveImage} busyLabel={t.saving} className={btn} />
          <NativeShareButton
            title={invite.title}
            text={shareMessage(invite)}
            url={url}
            label={t.share}
            className={ended ? `${btn} col-span-2` : btn}
          />
        </div>

        {!ended && (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-lg ring-1 ring-black/5 sm:p-6">
            {coming > 0 && (
              <p className="mb-4 text-center text-sm font-semibold" style={{ color: actionColor }}>
                🎉 {t.coming(coming)}
              </p>
            )}
            <RsvpForm slug={slug} lang={invite.lang} accent={actionColor} />
          </section>
        )}

        <Link
          href="/?ref=invite"
          className="mt-8 flex flex-col items-center gap-1 rounded-3xl bg-white/70 px-4 py-5 text-center ring-1 ring-black/5 transition hover:bg-white"
        >
          <span className="flex items-center gap-2 text-xs text-stone-500">
            {t.madeWith} <Logo className="text-lg" />
          </span>
          <span className="text-sm font-semibold text-brand">{t.createOwn}</span>
        </Link>
      </main>
    </div>
  );
}
