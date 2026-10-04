import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rate-limit";
import { OWNER_COOKIE, STATS_COOKIE, cookieValue, keyOk } from "@/lib/stats-auth";

// Trades ?key= for a cookie, so the secret stops travelling in the URL.
// Always redirects to a clean /stats: a wrong key simply arrives without a
// cookie and gets the same 404 as anyone else, so this route reveals nothing.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clean = new URL("/stats", request.url);
  const key = new URL(request.url).searchParams.get("key");

  // The only place a guess can be made, so it is the only place worth slowing.
  if (await rateLimited("stats")) return NextResponse.redirect(clean);

  const value = cookieValue();
  if (!keyOk(key) || !value) return NextResponse.redirect(clean);

  const res = NextResponse.redirect(clean);
  const shared = {
    httpOnly: true,
    // Not on http://localhost, where a Secure cookie would never be stored.
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  } as const;

  res.cookies.set(STATS_COOKIE, value, { ...shared, sameSite: "strict", path: "/stats" });

  // The same proof, scoped to the whole site, so invites and taps made from
  // this device can be told apart from a stranger's. Lax rather than strict:
  // this one has to survive arriving at a create page from an outside link,
  // which is exactly how the operator opens his own site.
  res.cookies.set(OWNER_COOKIE, value, { ...shared, sameSite: "lax", path: "/" });
  return res;
}
