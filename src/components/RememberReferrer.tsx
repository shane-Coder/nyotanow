"use client";

import { useEffect } from "react";
import { writeStored } from "@/lib/client-store";

export const REFERRER_KEY = "nyota:ref";

/**
 * Invite footers link to "/?ref=invite". The host usually browses a bit before
 * creating their own, so the label is remembered here and attached to whatever
 * invite they create later. That is what makes the growth loop measurable.
 */
export function RememberReferrer() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("ref") === "invite") {
      writeStored(REFERRER_KEY, "invite");
    }
  }, []);
  return null;
}
