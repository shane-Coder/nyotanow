"use client";

import { useState } from "react";

const EXPORT_WIDTH = 1080; // Instagram / WhatsApp status friendly.

async function renderCardPng(cardId: string): Promise<Blob> {
  const card = document.getElementById(cardId);
  const sized = card?.parentElement; // the @container wrapper
  if (!card || !sized) throw new Error("Card not found");
  const { toBlob } = await import("html-to-image");

  // Render a copy at full export width instead of upscaling the on-screen
  // card. The card is sized in container units, so it lays out identically,
  // text is rasterised at native size, and html-to-image's font-size rounding
  // (floor(px) - 0.1) matters much less than on the small card. Line breaks
  // stay stable because the card's text lines are full-width (see InviteCard).
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = `position:fixed;left:-${EXPORT_WIDTH * 2}px;top:0;width:${EXPORT_WIDTH}px;pointer-events:none`;
  const copy = sized.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  const target = copy.firstElementChild as HTMLElement;
  holder.appendChild(copy);
  document.body.appendChild(holder);

  try {
    await document.fonts.ready;
    const blob = await toBlob(target, { pixelRatio: 1, width: EXPORT_WIDTH });
    if (!blob) throw new Error("Could not render image");
    return blob;
  } finally {
    holder.remove();
  }
}

export function SaveImageButton({
  cardId,
  fileName,
  label,
  busyLabel,
  className,
}: {
  cardId: string;
  fileName: string;
  label: string;
  busyLabel: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const blob = await renderCardPng(cardId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error(e);
      alert("Sorry, the image could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={save} disabled={busy} className={className}>
      ⬇️ {busy ? busyLabel : label}
    </button>
  );
}

export function WhatsAppButton({ text, className, label = "Share on WhatsApp" }: { text: string; className?: string; label?: string }) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <WhatsAppIcon /> {label}
    </a>
  );
}

export function NativeShareButton({
  title,
  text,
  url,
  label,
  className,
}: {
  title: string;
  text: string;
  url: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User dismissed the share sheet; nothing to do.
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={share} className={className}>
      🔗 {copied ? "Link copied!" : label}
    </button>
  );
}

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 01-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.43 9.43 0 01-1.45-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.38 9.38 0 012.76 6.68c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0012.05.7C5.8.7.7 5.8.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.33 11.33 0 005.42 1.38h.01c6.25 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z" />
    </svg>
  );
}
