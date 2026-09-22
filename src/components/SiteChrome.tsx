import Link from "next/link";
import { OCCASIONS } from "@/lib/occasions";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-serif text-2xl font-bold tracking-tight text-brand-ink ${className}`}>
      Nyota
      <span className="ml-0.5 rounded-md bg-brand px-1.5 py-0.5 font-sans text-sm font-bold text-white">Now</span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <Link href="/" aria-label="NyotaNow home">
        <Logo />
      </Link>
      <Link
        href="/create/birthday"
        className="rounded-full bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:px-5"
      >
        Create invite
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-stone-500">
            न्योता भेजिए, स्टाइल में। Beautiful invites you can share on WhatsApp in a minute.
          </p>
        </div>
        <nav aria-label="Occasions" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {OCCASIONS.map((o) => (
            <Link key={o.id} href={`/create/${o.id}`} className="text-stone-600 hover:text-stone-900">
              {o.name.en} invitation
            </Link>
          ))}
        </nav>
      </div>
      <p className="pb-6 text-center text-xs text-stone-400">© {new Date().getFullYear()} NyotaNow · Made in India 🇮🇳</p>
    </footer>
  );
}
