"use server";

import { redirect } from "next/navigation";
import { saveRsvp, findInvite, insertInvite, keyMatches, updateInvite } from "@/db/queries";
import { inviteSchema, isPastDate, rsvpSchema, type RsvpStatus } from "@/lib/invite";
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
  if (isPastDate(parsed.data.date)) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { date: ["That date has already passed. Pick today or a later date."] },
    };
  }

  // Checked only once the invite is known to be valid, so a flood of junk
  // submissions can't spend a real host's allowance.
  const limited = await rateLimited("create");
  if (limited) return { error: limited };

  // Only a fixed label, never arbitrary text from the form.
  const source = formData.get("source") === "invite" ? "invite" : "";

  let created: { slug: string; key: string };
  try {
    created = await insertInvite(parsed.data, source);
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

  const replaces = formData.get("replaces");
  let id: string;
  try {
    id = await saveRsvp(invite.id, parsed.data, typeof replaces === "string" ? replaces : undefined);
  } catch (err) {
    console.error("rsvp failed", err);
    return { ok: false, error: "Sorry, your reply didn't go through. Please try again." };
  }
  return { ok: true, id, name: parsed.data.name, status: parsed.data.status };
}
