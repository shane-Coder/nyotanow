"use client";

import { useState, useTransition } from "react";
import { deleteInviteFromStatsAction } from "@/app/actions";

/**
 * Removing an invite from the stats table.
 *
 * The operator has no edit key for other people's invites, so this goes
 * through its own action that checks the /stats cookie instead. That is a
 * deliberately different door, and the only one that can delete something the
 * person did not create.
 *
 * Still asks. The rows sit close together in a table, this is reachable on a
 * phone, and the row it removes is somebody's wedding.
 */
export function StatsDeleteButton({ slug, title }: { slug: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${title}`}
        title={`Delete ${title}`}
        className="rounded px-1.5 py-0.5 text-stone-300 transition hover:bg-red-50 hover:text-red-600"
      >
        ✕
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => void deleteInviteFromStatsAction(slug))}
        className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="px-1 text-xs text-stone-500">
        no
      </button>
    </span>
  );
}
