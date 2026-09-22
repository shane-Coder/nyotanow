import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="text-6xl">💌</span>
        <h1 className="mt-4 font-serif text-3xl font-bold text-brand-ink">We couldn&apos;t find that invite</h1>
        <p className="mt-2 text-stone-600">
          The link may be mistyped, or the invite was removed. Ask the host to send it again.
        </p>
        <Link href="/" className="mt-8 rounded-full bg-brand px-6 py-3 font-bold text-white">
          Make your own invite
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
