import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using NyotaNow: free, made by one person, no guarantees.",
};

const MAIL = "hello@nyotanow.in";

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="7 October 2026">
      <p>
        The short version: this is a free tool made by one person. Use it for real invitations, do not use it to harm
        anyone, and understand that it comes with no guarantees.
      </p>

      <h2>What it is</h2>
      <p>
        NyotaNow lets you make an invitation page and share its link. It is free, there is no account, and there is
        nothing to pay for.
      </p>

      <h2>Your links are secrets, not locks</h2>
      <p>
        Anyone holding the invitation link can open it. Anyone holding your manage link can edit the invitation. Treat
        them the way you would treat the invitation itself: send them to the people you mean to, and expect that those
        people can forward them.
      </p>

      <h2>What you put in</h2>
      <p>What you write is yours, and it is your responsibility. Please do not use NyotaNow to:</p>
      <ul>
        <li>pretend to be somebody else, or to be an organisation you are not</li>
        <li>post anything unlawful, abusive, or deliberately misleading</li>
        <li>collect anyone&apos;s information under false pretences</li>
        <li>send bulk messages to people who did not ask for them</li>
      </ul>
      <p>An invitation doing any of that can be removed without notice.</p>

      <h2>What you keep</h2>
      <p>
        Your invitation stays yours. Making one gives permission to store it and show it to anyone who opens the link,
        because that is the whole of what the service does — nothing more than that.
      </p>

      <h2>No guarantees</h2>
      <p>
        This is free and built by one person in their own time. It may be slow, it may go down, it may lose data, and it
        may change without warning. Please do not rely on it for anything where failure would really matter, and keep
        your own record of who said they were coming.
      </p>
      <p>
        So far as the law allows, it is offered as it is, with no warranty, and I am not liable for losses that follow
        from using it.
      </p>

      <h2>Changes, and stopping</h2>
      <p>
        Features may change or disappear. If I ever stop running NyotaNow I will say so on the site, with as much notice
        as I reasonably can.
      </p>

      <h2>Which law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${MAIL}`}>{MAIL}</a>
      </p>
    </LegalPage>
  );
}
