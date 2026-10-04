/**
 * Venue suggestions, so a host picks their hall instead of spelling it out and
 * hoping the guest's map finds it.
 *
 * Deliberately a thin wrapper over one provider behind one function. The
 * suggestion list is a convenience: the venue field stays free text, because
 * half of what this product is used for happens at somebody's house, and no
 * places index in the world contains "B-204, Green Valley". Nothing here may
 * ever block a host from typing whatever they want.
 *
 * Provider is Ola Maps: built in India, five million calls a month free, and
 * no billing account to attach a card to. Everything provider-shaped is in
 * this file, so moving to Google later is one file and no UI change.
 */

export type PlaceSuggestion = {
  /** What goes in the venue field: "Hotel Rajmahal". */
  name: string;
  /** What goes in the address field: "Station Rd, Gaya, Bihar". */
  address: string;
  /** Where the Directions button should point, when the provider knew. */
  lat: number | null;
  lng: number | null;
};

const ENDPOINT = "https://api.olamaps.io/places/v1/autocomplete";

/** Below this, suggestions are noise and every keystroke is a wasted call. */
export const MIN_QUERY = 3;
const MAX_SUGGESTIONS = 6;
const TIMEOUT_MS = 3000;

/**
 * False when no key is configured, which is the switch that turns the whole
 * feature off: local development, CI and the tests all run without one and
 * the venue field behaves exactly as it did before any of this existed.
 */
export function placesEnabled(): boolean {
  return Boolean(process.env.OLA_MAPS_API_KEY);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The one provider-shaped function. Autocomplete responses in this family
 * follow Google's field names, but a provider is free to disagree, so every
 * field is read defensively and a prediction we cannot name is dropped rather
 * than shown as a blank row.
 */
export function toSuggestions(payload: unknown): PlaceSuggestion[] {
  const predictions = (payload as { predictions?: unknown })?.predictions;
  if (!Array.isArray(predictions)) return [];

  const out: PlaceSuggestion[] = [];
  for (const raw of predictions) {
    // A null or a bare string in the list is not worth a 500 on a page where
    // someone is halfway through typing a venue.
    if (raw === null || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const formatted = p.structured_formatting as Record<string, unknown> | undefined;
    const description = str(p.description);

    // The structured split is what lets the venue field hold the name alone
    // rather than the whole postal address. Without it, fall back to the
    // description so a usable suggestion is never thrown away.
    const name = str(formatted?.main_text) || description;
    if (!name) continue;

    const address = str(formatted?.secondary_text) || (description === name ? "" : description);

    const location = (p.geometry as { location?: Record<string, unknown> } | undefined)?.location;
    out.push({
      name,
      address,
      lat: num(location?.lat) ?? num(p.lat),
      lng: num(location?.lng) ?? num(p.lng),
    });
    if (out.length === MAX_SUGGESTIONS) break;
  }
  return out;
}

/**
 * Suggestions for what the host has typed so far, or an empty list.
 *
 * Never throws and never rejects. A provider that is down, slow, out of quota
 * or returning something unexpected must look exactly like a provider that
 * was never configured: no suggestions, and a venue field that still works.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const key = process.env.OLA_MAPS_API_KEY;
  const input = query.trim();
  if (!key || input.length < MIN_QUERY) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set("input", input);
  url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      // The status alone, never the body: the key is in the URL we just sent.
      console.error(`places lookup failed: HTTP ${res.status}`);
      return [];
    }
    return toSuggestions(await res.json());
  } catch (err) {
    console.error("places lookup failed", err instanceof Error ? err.message : err);
    return [];
  }
}
