"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteInvite, saveRsvp, findInvite, insertInvite, keyMatches, updateInvite } from "@/db/queries";
import { MAX_YEARS_AHEAD, inviteSchema, isPastEvent, isTooFarAhead, rsvpSchema, todayInIST, type RsvpStatus } from "@/lib/invite";
import { viewerIsOwner } from "@/lib/owner";
import { rateLimited } from "@/lib/rate-limit";

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

function parseInvite(formData: FormData) {
  return inviteSchema.safeParse({
    occasion: formData.get("occasion"),
    template: formData.get("template"),
    palette: formData.get("palette"),
    lang: formData.get("lang"),
    kicker: formData.get("kicker") ?? "",
    title: formData.get("title") ?? "",
    hostedBy: formData.get("hostedBy") ?? "",
    date: formData.get("date") ?? "",
    time: formData.get("time") ?? "",
    venue: formData.get("venue") ?? "",
    address: formData.get("address") ?? "",
    // Empty rather than absent when the host typed the venue instead of
    // picking it, which is the ordinary case and must not read as 0,0.
    placeLat: formData.get("placeLat") || null,
    placeLng: formData.get("placeLng") || null,
    message: formData.get("message") ?? "",
  });
}

function invalid(error: import("zod").ZodError): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

export async function createInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Honeypot: real people never see or fill this field. Pretend it worked so a
  // bot gets no signal, but send it to the homepage instead of creating a row.
  if (formData.get("website")) redirect("/");

  const parsed = parseInvite(formData);
  if (!parsed.success) return invalid(parsed.error);
  if (isPastEvent(parsed.data.date, parsed.data.time)) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { date: ["That moment has already passed. Pick a time still to come."] },
    };
  }
  // The other direction, which we missed until an invite went out for 8978.
  if (isTooFarAhead(parsed.data.date, todayInIST())) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { date: [`That is too far ahead. Pick a date within ${MAX_YEARS_AHEAD} years.`] },
    };
  }

  // Checked only once the invite is known to be valid, so a flood of junk
  // submissions can't spend a real host's allowance.
  const limited = await rateLimited("create");
  if (limited) return { error: limited };

  // Only a fixed label, never arbitrary text from the form.
  const source = formData.get("source") === "invite" ? "invite" : "";
  // Kept out of the product numbers rather than guessed at from the title later.
  const mine = await viewerIsOwner();

  let created: { slug: string; key: string };
  try {
    created = await insertInvite(parsed.data, source, mine);
  } catch (err) {
    console.error("createInvite failed", err);
    return { error: "Sorry, we couldn't save your invite. Please try again in a moment." };
  }
  redirect(`/i/${created.slug}/manage?key=${created.key}&new=1`);
}

export async function updateInviteAction(
  slug: string,
  key: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const invite = await findInvite(slug);
  if (!invite || !keyMatches(invite, key)) return { error: "This edit link is not valid anymore." };

  const parsed = parseInvite(formData);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await updateInvite(invite.id, parsed.data);
  } catch (err) {
    console.error("updateInvite failed", err);
    return { error: "Sorry, we couldn't save your changes. Please try again in a moment." };
  }
  redirect(`/i/${slug}/manage?key=${key}&updated=1`);
}

/**
 * Removes an invite for good, along with every reply to it.
 *
 * A real delete rather than a hidden flag: the privacy page promises erasure,
 * and a row still sitting in the table with deleted = true is not erasure. The
 * replies go with it by cascade.
 */
export async function deleteInviteAction(slug: string, key: string): Promise<FormState> {
  const invite = await findInvite(slug);
  // Same answer whether the invite is gone or the key is wrong, as everywhere.
  if (!invite || !keyMatches(invite, key)) return { error: "This link is not valid anymore." };

  try {
    await deleteInvite(invite.id);
  } catch (err) {
    console.error("deleteInvite failed", err);
    return { error: "Sorry, we couldn't delete this invite. Please try again in a moment." };
  }
  redirect("/?deleted=1");
}

/**
 * Deleting an invite from the private stats page.
 *
 * Separate from the host's own delete because the operator holds no edit key
 * for other people's invites. Authorised by the /stats cookie instead, which
 * makes this the only path that can remove something its creator made — worth
 * keeping visibly distinct rather than loosening the key check to allow it.
 */
export async function deleteInviteFromStatsAction(slug: string): Promise<void> {
  if (!(await viewerIsOwner())) return;

  const invite = await findInvite(slug);
  if (!invite) return;

  try {
    await deleteInvite(invite.id);
  } catch (err) {
    console.error("deleteInviteFromStats failed", err);
    return;
  }
  revalidatePath("/stats");
}

export type RsvpState =
  | { ok: true; id: string; name: string; status: RsvpStatus }
  | { ok: false; error: string }
  | undefined;

export async function rsvpAction(slug: string, _prev: RsvpState, formData: FormData): Promise<RsvpState> {
  // Honeypot: real people never see or fill this field.
  if (formData.get("website")) return { ok: true, id: "", name: "", status: "yes" };

  const parsed = rsvpSchema.safeParse({
    name: formData.get("name") ?? "",
    status: formData.get("status"),
    guests: formData.get("guests") ?? 1,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your answer." };

  const invite = await findInvite(slug);
  if (!invite) return { ok: false, error: "This invite no longer exists." };

  const limited = await rateLimited("rsvp");
  if (limited) return { ok: false, error: limited };

  let id: string;
  try {
    // No id from the form any more: the server matches the guest by the name
    // they typed. See saveRsvp for why.
    id = await saveRsvp(invite.id, parsed.data);
  } catch (err) {
    console.error("rsvp failed", err);
    return { ok: false, error: "Sorry, your reply didn't go through. Please try again." };
  }
  return { ok: true, id, name: parsed.data.name, status: parsed.data.status };
}
