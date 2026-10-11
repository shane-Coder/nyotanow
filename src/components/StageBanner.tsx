import { stage } from "@/lib/stage";

/**
 * A strip across the top of every page on anything that is not nyotanow.in.
 *
 * The two look identical otherwise, and that has already cost us: invites
 * made while testing went into the real numbers because there was nothing on
 * screen to say which site was open. One line of colour is cheap next to a
 * funnel that cannot be trusted.
 *
 * A server component with no JavaScript, so it cannot disagree with itself
 * between the server render and the browser. On production it renders
 * nothing at all.
 */
export function StageBanner() {
  const where = stage();
  if (where === "production") return null;

  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
      {where === "preview" ? "Test deployment" : "Running on localhost"} — not the real site.{" "}
      <a href="https://nyotanow.in" className="underline">
        nyotanow.in
      </a>{" "}
      is the one guests use.
    </div>
  );
}
