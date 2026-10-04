"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MIN_QUERY, type PlaceSuggestion } from "@/lib/places";

/**
 * The venue box, with suggestions.
 *
 * The rule this is built around: the host can always type anything. The list
 * is an accelerator for "Hotel Rajmahal", not a gate. Griha pravesh and house
 * parties are a large share of what gets made here and they happen at "B-204,
 * Green Valley", which is in no places index anywhere. A picker that demanded
 * a selection would break the most common invite on the site.
 *
 * So: no suggestions is a normal state, not an error. Nothing is ever shown
 * to the host about the lookup failing, because from where they sit there is
 * nothing to fix — they just keep typing, exactly as before.
 */

const DEBOUNCE_MS = 300;

type Props = {
  value: string;
  onChange: (venue: string) => void;
  /** A suggestion was chosen: fills the address and pins the location too. */
  onPick: (place: PlaceSuggestion) => void;
  placeholder: string;
  className: string;
  id?: string;
};

export function VenueField({ value, onChange, onPick, placeholder, className, id }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  // What the host last chose. Typing past it means they are no longer
  // describing that place, so the pinned location has to go with it.
  const chosen = useRef<string | null>(null);
  // Set while a suggestion is being applied, so the resulting value change
  // does not immediately re-open the list we just closed.
  const applying = useRef(false);

  useEffect(() => {
    if (applying.current) {
      applying.current = false;
      return;
    }
    const q = value.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      // Checked in here rather than in the effect body: clearing state as a
      // direct effect of rendering is both a lint error and a second render
      // nobody needed. The list is hidden by the guard below meanwhile.
      if (q.length < MIN_QUERY) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const found: PlaceSuggestion[] = await res.json();
        setSuggestions(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        // Aborted, offline, or the server decided not to answer. The field is
        // a plain text box in every one of those cases, which is fine.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const choose = (place: PlaceSuggestion) => {
    applying.current = true;
    chosen.current = place.name;
    onPick(place);
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
  };

  const handleChange = (next: string) => {
    // Edited away from the suggestion they picked, so the coordinates now
    // point somewhere they did not choose. Dropping them sends the guest back
    // to a text search, which is honest; keeping them would point the
    // Directions button at the wrong building.
    if (chosen.current !== null && next !== chosen.current) {
      chosen.current = null;
      onPick({ name: next, address: "", lat: null, lng: null });
      return;
    }
    onChange(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      // Only swallowed when a suggestion is highlighted, so Enter still
      // submits the form the rest of the time.
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        name="venue"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        // The browser's own history dropdown would cover ours.
        autoComplete="off"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        // A click on a suggestion has to land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(suggestions.length > 0)}
        placeholder={placeholder}
        maxLength={120}
        required
        className={className}
      />

      {/* The length check keeps a stale list off screen in the moment between
          the host deleting back to two characters and the debounce firing. */}
      {open && value.trim().length >= MIN_QUERY && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.name}-${s.lat ?? i}-${s.lng ?? i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                // mousedown, not click: blur would close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-4 py-2.5 text-left transition ${i === active ? "bg-stone-100" : ""}`}
              >
                <span className="block text-sm font-semibold text-stone-800">{s.name}</span>
                {s.address && <span className="block truncate text-xs text-stone-500">{s.address}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
