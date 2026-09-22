import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createInviteAction } from "@/app/actions";
import { CreateForm } from "@/components/CreateForm";
import { SiteHeader } from "@/components/SiteChrome";
import type { InviteData } from "@/lib/invite";
import { OCCASIONS, getOccasion } from "@/lib/occasions";

export function generateStaticParams() {
  return OCCASIONS.map((o) => ({ occasion: o.id }));
}

export async function generateMetadata({ params }: PageProps<"/create/[occasion]">): Promise<Metadata> {
  const occasion = getOccasion((await params).occasion);
  if (!occasion) return {};
  return {
    title: `Free ${occasion.name.en} Invitation Maker (${occasion.name.hi}): Share on WhatsApp`,
    description: `Create a beautiful ${occasion.name.en.toLowerCase()} invitation card online in Hindi or English. Share one link on WhatsApp, collect RSVPs, or download it as an image. Free, no sign-up.`,
    alternates: { canonical: `/create/${occasion.id}` },
  };
}

export default async function CreatePage({ params }: PageProps<"/create/[occasion]">) {
  const requested = (await params).occasion;
  // Hand-typed URLs like /create/Birthday shouldn't dead-end on a 404.
  if (requested !== requested.toLowerCase() && getOccasion(requested.toLowerCase())) {
    redirect(`/create/${requested.toLowerCase()}`);
  }
  const occasion = getOccasion(requested);
  if (!occasion) notFound();

  const initial: InviteData = {
    occasion: occasion.id as InviteData["occasion"],
    template: occasion.template,
    palette: occasion.palette,
    lang: "en",
    kicker: occasion.kicker.en,
    title: "",
    hostedBy: "",
    date: "",
    time: "",
    venue: "",
    address: "",
    message: occasion.message.en,
  };

  return (
    <>
      <SiteHeader />
      <main className="pt-2 pb-6">
        <h1 className="mx-auto mb-6 max-w-6xl px-4 text-center font-serif text-3xl font-bold text-brand-ink sm:px-6 lg:text-left">
          {occasion.emoji} Create your {occasion.name.en.toLowerCase()} invite
        </h1>
        <CreateForm initial={initial} action={createInviteAction} mode="create" />
      </main>
    </>
  );
}
