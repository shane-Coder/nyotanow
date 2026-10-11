/**
 * How long a guest list is kept, and why it is measured from the event.
 *
 * Measured from the event date rather than from when the invitation was made.
 * A wedding card created in January for a December wedding would otherwise
 * have its guest list deleted before anyone walked in.
 *
 * Three months leaves a host time to come back for the headcount, the
 * thank-you list, who actually turned up — and it stops guests' names sitting
 * in a database for years after the only reason for having them has gone.
 *
 * The invitation itself is not touched. The names, notes and headcounts are
 * the personal data; the card is the host's own work, and a host who opens
 * their link two years later should still find their invitation there. That
 * is the whole shape of this: forget the guests, keep the card.
 *
 * This number is the single source of truth. The privacy page reads it, the
 * job that does the deleting reads it, and the host-facing copy reads it, so
 * the promise and the behaviour cannot drift apart.
 */
export const RETENTION_MONTHS = 3;

/** "three months", for prose that should not read like configuration. */
export const RETENTION_LABEL = "three months";
