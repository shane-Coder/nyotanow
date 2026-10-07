import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What NyotaNow does with your information, in plain English. There are no accounts and nothing is sold.",
};

const MAIL = "hello@nyotanow.in";

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="7 October 2026">
      <p>
        NyotaNow is run by one person in India. This page says plainly what the site does with information. It is short
        because the site does very little.
      </p>

      <h2>There are no accounts</h2>
      <p>
        You do not sign up, there is no password, and there is nothing to log in to. The link that lets you edit an
        invitation is simply a secret address — keeping it private is what keeps the invitation yours.
      </p>

      <h2>What you type into an invitation</h2>
      <p>
        When you make an invitation we store what you entered: the event name, the date and time, the venue and address,
        who is hosting, your message, and the design and language you chose. If you picked a venue from the suggestions,
        we also store that place&apos;s coordinates so guests get a map pin rather than a search.
      </p>
      <p>This is stored so that the invitation page can exist. Anyone who opens the link can see it.</p>

      <h2>What a guest gives</h2>
      <p>
        When a guest replies we store the name they typed, their answer, how many people they are bringing, and their
        note if they wrote one.
      </p>
      <p>
        The invitation page itself shows only <em>how many</em> people are coming. Names, notes and the full guest list
        are visible only to the host, through the secret link they keep.
      </p>

      <h2>Your IP address</h2>
      <p>
        Used for one thing: stopping a single device from flooding the site. It is counted against a time window, and
        those rows are deleted as the window expires. It is not stored alongside your invitation, and it is not used to
        work out who you are.
      </p>

      <h2>What stays in your own browser</h2>
      <p>None of this leaves your device or reaches the server:</p>
      <ul>
        <li>the list of invitations you have made, so you can find them again</li>
        <li>your own reply to an invitation, so you can change your answer later</li>
        <li>whether you arrived here from somebody else&apos;s invitation</li>
      </ul>

      <h2>Who else is involved</h2>
      <ul>
        <li>
          <strong>Vercel</strong> hosts the site, so every request reaches them — as with any web host.
        </li>
        <li>
          <strong>Neon</strong> stores the database the invitations live in.
        </li>
        <li>
          <strong>Sentry</strong> receives errors from the server so they can be fixed. It does not run in your browser.
        </li>
        <li>
          <strong>Vercel Web Analytics</strong> counts page views. It sets no cookies and does not identify anyone.
        </li>
        <li>
          <strong>Ola Maps</strong> receives what you type into the venue box, as you type it, in order to suggest
          places. It receives nothing else.
        </li>
        <li>
          <strong>Google</strong> receives nothing from us. If a guest taps Directions or Add to calendar, that is their
          browser visiting Google, exactly as any link would be.
        </li>
      </ul>
      <p>Nothing is sold. There is no advertising, and nothing here follows you to other sites.</p>

      <h2>Invitations often name children</h2>
      <p>
        A first birthday, a naming ceremony, a mundan. Put in only what you would be comfortable sending to a WhatsApp
        group, because an invitation link can be forwarded by anyone who has it.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Invitations and replies are kept until you ask for them to go. There is no delete button yet — email{" "}
        <a href={`mailto:${MAIL}`}>{MAIL}</a> with the invitation link and it will be removed, normally within a few
        days.
      </p>

      <h2>Asking about your information</h2>
      <p>
        Write to <a href={`mailto:${MAIL}`}>{MAIL}</a>. You can ask what is stored, ask for it to be corrected, or ask
        for it to be deleted.
      </p>

      <h2>If this changes</h2>
      <p>The date at the top of this page changes with it.</p>
    </LegalPage>
  );
}
