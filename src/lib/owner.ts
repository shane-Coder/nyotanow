import { cookies } from "next/headers";
import { OWNER_COOKIE, cookieOk } from "./stats-auth";

/**
 * Whether this request came from one of the operator's own devices.
 *
 * Used to keep his own invites, views and taps out of the product numbers.
 * Every reading of the funnel so far has had to guess which rows were his
 * from their titles, and got it wrong more than once in both directions.
 *
 * Deliberately never throws and never blocks anything: being wrong here means
 * a number is slightly off, and that is not worth failing a guest's page load
 * over. Unknown means "not mine", which errs towards counting a row rather
 * than quietly dropping it.
 */
export async function viewerIsOwner(): Promise<boolean> {
  try {
    return cookieOk((await cookies()).get(OWNER_COOKIE)?.value);
  } catch {
    return false;
  }
}
