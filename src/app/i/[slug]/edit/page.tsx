import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateInviteAction } from "@/app/actions";
import { CreateForm } from "@/components/CreateForm";
import { SiteHeader } from "@/components/SiteChrome";
import { findInvite, keyMatches, toInviteData } from "@/db/queries";

export const metadata: Metadata = {
  title: "Edit your invite",
  robots: { index: false, follow: false },
};

export default async function EditPage({ params, searchParams }: PageProps<"/i/[slug]/edit">) {
  const { slug } = await params;
  const { key } = await searchParams;
  const row = await findInvite(slug);
  if (!row || typeof key !== "string" || !keyMatches(row, key)) notFound();

  return (
    <>
      <SiteHeader />
      <main className="pt-2 pb-6">
        <h1 className="mx-auto mb-6 max-w-6xl px-4 text-center font-serif text-3xl font-bold text-brand-ink sm:px-6 lg:text-left">
          ✏️ Edit your invite
        </h1>
        <CreateForm initial={toInviteData(row)} action={updateInviteAction.bind(null, slug, key)} mode="edit" />
      </main>
    </>
  );
}
