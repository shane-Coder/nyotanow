# Premium: what a paid side of NyotaNow would actually be

Status: **thinking out loud, nothing committed.** Written down so the reasoning
survives, not because any of it is scheduled.

Three ideas on the table:

1. An invitation built around a **photograph**.
2. A **video invite** you can put on WhatsApp status.
3. **Personalised wedding cards** — make one, upload the guest list, get a card
   per guest.

They are not equally good, they do not cost the same to build, and two of them
cannot be sold at all until something else is fixed first. That is most of what
this page is about.

---

## The thing that blocks all three

Today there are no accounts. The only way back to an invitation is the secret
manage link, remembered by the browser that made it.

That is defensible while the product is free. The moment money changes hands it
stops being defensible: you cannot take ₹299 from someone for their daughter's
wedding and then tell them the only copy of their purchase was in a browser
they have since cleared. The first support message of the paid era will be *"I
paid and I can't find my card"*, and there will be no honest answer.

So recovery comes first, whatever else happens. Two shapes:

| | What it costs | What it gives |
|---|---|---|
| **Email the link at creation** | nothing beyond a sending service already in hand (Brevo) | recovery, a receipt, a way to reach the host later. No login, no new surface. |
| **Phone OTP accounts** | ~₹0.15–0.25 per SMS (MSG91, Fast2SMS) plus the whole login surface | what Indian users expect, a real identity, invitations that follow a person across phones |

Email-the-link is far cheaper and solves the actual problem. Phone OTP is the
Indian default and solves more, including the "I changed my phone" case that
email does not. Either way it is also a DPDP question — storing a contact
detail is a bigger commitment than storing a card — which is the reading
already in progress.

**Nothing paid should ship before this does.**

---

## 1. Photo invitation

A host uploads one photograph and the card is built around it: the couple, the
baby, the new house.

**Why it is the right first paid feature.** It is the smallest change that is
obviously worth paying for, it reuses almost everything that exists, and the
value is visible in the preview before anyone pays.

**What it needs.**

- Object storage. Cloudflare R2 is the one to use: 10 GB and no egress charge
  on the free tier, and egress is exactly what an invitation link generates.
  Vercel Blob is easier to wire up and more expensive at the point where it
  starts mattering.
- A crop step. Not optional. Phone photos are portrait, templates are not, and
  an uncropped photo in a beautiful template ruins the template. The crop is
  more of the work than the upload.
- EXIF stripping on the way in. A photo taken at home carries GPS coordinates,
  and an invitation link gets forwarded to a WhatsApp group of two hundred
  people.
- A size cap and a format whitelist, enforced server-side.
- A template designed around a photograph rather than one with a photograph
  pasted into it.

**What it costs.** Storage is free for a long time at this scale. The real cost
is moderation: the day uploads exist is the day something is uploaded that must
not be served from nyotanow.in. A report link and a fast delete is the minimum.

**Price.** ₹49–99 one-off, per invitation.

---

## 2. Personalised cards from a guest list — the strongest idea

Make the invitation once, upload or paste the guest list, and get one card per
guest with that guest's name on it.

This is the real Indian wedding workflow. Names are written by hand on each
card today, in pen, by somebody's uncle. Nobody has done it properly online.
And it is priced per wedding rather than per card, which is the right shape:
₹299–999 for a list, not ₹5 a name.

**There are two versions, and the second is much better.**

*Images.* Generate a PNG per guest, hand back a ZIP. Familiar, easy to explain,
and it ends at the download — once the images are out, nothing is known about
who opened what.

*Links.* Generate one secret link per guest. "Dear Sharma ji" on the card, and
the RSVP already knows who is replying. That removes the single most annoying
thing about the current flow — a guest typing their own name, with the merging
and the "who is +2?" that follows — and it tells the host who opened their
invitation and who did not, three days before the wedding, which is a thing
people actually want to know.

The links version is a better product *and* better for the loop: every
personalised link carries the same footer, so one wedding is two hundred
footers instead of one.

**What it needs.**

- A `guests` table: invite id, name, a token. Small.
- A CSV/paste importer. The export already guards against spreadsheet formula
  injection; an importer needs the same care in reverse plus a cap on list
  length and sane handling of Devanagari names, which this codebase has already
  been bitten by once.
- Per-guest rendering, if images are offered — the existing OG image route
  already renders Devanagari through Satori, so most of that is solved.
- More retention thought than anything else here. A full guest list of two
  hundred names, uploaded before any of those people have done anything, is the
  largest pile of other people's data this product would ever hold. The
  three-month rule covers it, but it should be said out loud on the upload
  screen.

**Price.** ₹299 for a list up to ~100, ₹999 unlimited. A wedding budget does
not notice either.

---

## 3. Video invite — last, and maybe never

A short animated card with music, saved as an MP4 for WhatsApp status.

**Why it is last.** It is the most expensive to build, the most expensive to
run, and the least distinctive — a dozen apps already sell video invites, and
most of them are templates with a watermark.

**Two ways to make one, both unpleasant.**

*Server-side rendering* (Remotion, ffmpeg). Correct output, consistent
everywhere, and it does not fit on Vercel: a function times out long before a
15-second render finishes. It means a queue and a worker somewhere else, and a
per-render cost that has to be priced in.

*Browser-side* (CSS/canvas animation captured with MediaRecorder). Free, and
unreliable in exactly the way that matters — codec support varies by phone, and
WhatsApp is fussy about what it will play inline.

**The trap.** Music. A Bollywood track in a video that gets forwarded to
thousands of people is infringement being distributed at scale, from a domain
with a name on it. Licensed library audio only, and that is a subscription.

If it ever happens, it should come after the other two have shown that people
will pay for anything here at all.

---

## What every paid feature needs underneath

**Payments.** Razorpay or Cashfree, UPI first — that is how India pays. Around
2% plus GST. It needs a business identity: PAN, a current account, and GST once
turnover crosses the threshold. Refunds need a real policy before the first
sale, not after the first complaint, because the thing being refunded is
somebody's wedding.

**The free tier has to stay excellent.** The footer is the entire growth engine
and it only spreads because the free product is good enough to forward.
Anything that makes the free card worse to make room for a paid one trades the
loop for a few hundred rupees. Paid should add — a photo, a guest list, a video
— never remove.

**Abuse handling.** Uploads, bulk lists and paid accounts each widen the
surface. A report path and a fast delete, before launch rather than after.

---

## Suggested order

1. **Recovery** (email the link at creation). Free, unblocks everything.
2. **Photo invitation.** Smallest paid thing worth charging for.
3. **Personalised links.** The actual product. Needs 1 and benefits from 2.
4. **Bulk card images.** A download button on top of 3.
5. **Video.** Only if 2 and 3 have proven people will pay.

## Deliberately not on this list

- Multi-event wedding pages (haldi, mehendi, sangeet) — good, but free-tier
  good, not paid-tier good.
- WhatsApp Business API reminders. Approved templates, ₹0.1–0.8 a message, and
  a business verification process. Genuinely useful at a wedding; an entirely
  separate project.
- Gift registry. A different product with different regulation.
- QR check-in at the venue. Fun, and it would be used once.
