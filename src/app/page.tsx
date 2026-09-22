import Link from "next/link";
import { InviteCard } from "@/components/InviteCard";
import { MyInvites } from "@/components/MyInvites";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import type { InviteData } from "@/lib/invite";
import { OCCASIONS } from "@/lib/occasions";

const SAMPLES: InviteData[] = [
  {
    occasion: "griha-pravesh",
    template: "shubh",
    palette: "maroon",
    lang: "hi",
    kicker: "ईश्वर की कृपा से",
    title: "हमारे नए घर का गृह प्रवेश",
    hostedBy: "वर्मा परिवार",
    date: "2026-11-08",
    time: "10:30",
    venue: "B-204, Green Valley",
    address: "Sector 62, Noida",
    message: "कृपया पधारकर हमें आशीर्वाद दें।",
  },
  {
    occasion: "birthday",
    template: "confetti",
    palette: "rose",
    lang: "en",
    kicker: "You're invited to",
    title: "Aarav's 5th Birthday",
    hostedBy: "Neha & Rohit",
    date: "2026-10-25",
    time: "17:00",
    venue: "Funcity Play Zone",
    address: "DLF Mall, Noida",
    message: "Join us for cake, games and lots of fun!",
  },
  {
    occasion: "anniversary",
    template: "classic",
    palette: "royal",
    lang: "en",
    kicker: "Please join us to celebrate",
    title: "Sharma Ji's 25th Anniversary",
    hostedBy: "The Sharma Family",
    date: "2026-12-12",
    time: "19:30",
    venue: "Hotel Rajmahal",
    address: "Civil Lines, Jaipur",
    message: "25 years of love, laughter and togetherness.",
  },
];

const STEPS = [
  { n: "1", title: "Fill 4 details", body: "Event name, date, venue, and a message if you like. Hindi or English." },
  { n: "2", title: "Pick a look", body: "Choose a design and colours. The preview updates as you type." },
  { n: "3", title: "Share one link", body: "Send it on WhatsApp. Guests RSVP in one tap and you see who's coming." },
];

const FEATURES = [
  { icon: "✅", title: "Know who's coming", body: "Guests tap Yes / Maybe / No and add how many people. No more chasing replies." },
  { icon: "📍", title: "Directions in one tap", body: "A Google Maps button, so nobody calls you to ask for the address." },
  { icon: "⏳", title: "Live countdown", body: "Your invite counts down to the big day, building excitement." },
  { icon: "🖼️", title: "Save as image too", body: "Download a crisp image for WhatsApp status, Instagram or printing." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="text-center lg:text-left">
            <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">
              न्योता भेजिए, स्टाइल में ✨
            </p>
            <h1 className="mt-5 font-serif text-4xl leading-[1.1] font-bold text-brand-ink sm:text-5xl lg:text-6xl">
              Beautiful invites in 60 seconds.
              <span className="block text-brand">Share on WhatsApp.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-stone-600 lg:mx-0">
              Birthdays, griha pravesh, anniversaries, pooja and parties, in Hindi or English. Guests RSVP with one tap,
              and you see exactly who&apos;s coming.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/create/birthday"
                className="w-full rounded-full bg-brand px-8 py-4 text-center text-lg font-bold text-white shadow-lg shadow-orange-600/25 transition hover:brightness-110 sm:w-auto"
              >
                Create free invite
              </Link>
              <a href="#occasions" className="px-4 py-3 font-semibold text-stone-700 hover:text-stone-900">
                See occasions ↓
              </a>
            </div>
            <p className="mt-4 text-sm text-stone-500">Free · No sign-up · Works on any phone</p>
          </div>

          <div className="relative mx-auto h-[420px] w-full max-w-[460px] sm:h-[500px]" aria-hidden>
            <div className="absolute top-8 left-0 w-[58%] -rotate-6 overflow-hidden rounded-2xl shadow-2xl">
              <InviteCard invite={SAMPLES[0]} />
            </div>
            <div className="absolute top-12 right-0 w-[58%] rotate-6 overflow-hidden rounded-2xl shadow-2xl">
              <InviteCard invite={SAMPLES[2]} />
            </div>
            <div className="absolute top-0 left-1/2 w-[62%] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white">
              <InviteCard invite={SAMPLES[1]} />
            </div>
          </div>
        </section>

        <MyInvites />

        <section id="occasions" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
          <h2 className="text-center font-serif text-3xl font-bold text-brand-ink sm:text-4xl">What are you celebrating?</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {OCCASIONS.map((o) => (
              <Link
                key={o.id}
                href={`/create/${o.id}`}
                className="group rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md sm:p-6"
              >
                <span className="text-4xl sm:text-5xl">{o.emoji}</span>
                <h3 className="mt-3 text-lg font-bold text-stone-900">{o.name.en}</h3>
                <p className="text-sm font-medium text-brand">{o.name.hi}</p>
                <p className="mt-2 hidden text-sm text-stone-500 sm:block">{o.blurb}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-stone-900 group-hover:text-brand">
                  Create →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-brand-ink py-16 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center font-serif text-3xl font-bold sm:text-4xl">Easier than typing a WhatsApp message</h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand text-lg font-bold">{s.n}</span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-white/70">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center font-serif text-3xl font-bold text-brand-ink sm:text-4xl">More than a picture</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-stone-600">
            Your NyotaNow invite is a little web page. It does things a forwarded JPG never can.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 font-bold text-stone-900">{f.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/create/birthday"
              className="inline-block rounded-full bg-brand px-8 py-4 text-lg font-bold text-white shadow-lg shadow-orange-600/25 transition hover:brightness-110"
            >
              Make my invite now
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
