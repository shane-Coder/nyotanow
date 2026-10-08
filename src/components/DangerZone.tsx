"use client";

import { useState, useTransition } from "react";
import { deleteInviteAction } from "@/app/actions";

/**
 * Deleting an invite.
 *
 * Two steps on purpose. This removes the invitation and every reply to it with
 * no way back, and the host is one tap from it on a page they visit to check
 * their guest list. Typing the word is slower than a confirm dialog and far
 * harder to do by accident on a phone.
 */
export function DangerZone({ slug, editKey, title }: { slug: string; editKey: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const armed = typed.trim().toUpperCase() === "DELETE";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-stone-400 underline underline-offset-2 hover:text-red-600"
      >
        Delete this invite
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
      <p className="text-sm font-semibold text-red-900">Delete &ldquo;{title}&rdquo;?</p>
      <p className="mt-1 text-sm text-red-900/80">
        The invitation and every reply to it are removed for good. Guests who open the link will see nothing. This
        cannot be undone.
      </p>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-red-900/80">Type DELETE to confirm</span>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1 w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-base outline-none focus:border-red-500"
        />
      </label>
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!armed || pending}
          onClick={() =>
            start(async () => {
              setError(null);
              // Only returns on failure; success redirects away from here.
              const result = await deleteInviteAction(slug, editKey);
              if (result?.error) setError(result.error);
            })
          }
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete for good"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
