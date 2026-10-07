import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

/**
 * The shell the privacy and terms pages share.
 *
 * Narrow measure and generous line height because these are the two pages on
 * the site someone might genuinely need to read rather than skim.
 */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-serif text-4xl font-bold text-brand-ink">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">Last updated {updated}</p>
        <div className="mt-8 space-y-7 text-stone-700 [&_a]:text-brand [&_a]:underline [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-brand-ink [&_li]:leading-relaxed [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
