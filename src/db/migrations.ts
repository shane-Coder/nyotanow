// Append-only. Never edit a migration that has shipped; add a new one instead.
// Kept as strings (not .sql files) so they bundle into serverless functions
// without any file-tracing config.
export const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "0001_init",
    sql: `
      CREATE TABLE invites (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug           text NOT NULL UNIQUE,
        edit_key_hash  text NOT NULL,
        occasion       text NOT NULL,
        template       text NOT NULL,
        palette        text NOT NULL,
        lang           text NOT NULL,
        kicker         text NOT NULL,
        title          text NOT NULL,
        hosted_by      text NOT NULL,
        event_date     date NOT NULL,
        event_time     text NOT NULL,
        venue          text NOT NULL,
        address        text NOT NULL,
        message        text NOT NULL,
        is_premium     boolean NOT NULL DEFAULT false,
        view_count     integer NOT NULL DEFAULT 0,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE rsvps (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invite_id   uuid NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
        name        text NOT NULL,
        status      text NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
        guests      smallint NOT NULL DEFAULT 1 CHECK (guests BETWEEN 1 AND 20),
        note        text NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX rsvps_invite_id_idx ON rsvps (invite_id);
    `,
  },
  {
    name: "0002_invite_source",
    sql: `
      -- Where the host came from: '' (direct) or 'invite' (clicked the footer
      -- of someone else's invite). This is what measures the growth loop.
      ALTER TABLE invites ADD COLUMN source text NOT NULL DEFAULT '';
    `,
  },
  {
    name: "0003_rate_limits",
    sql: `
      -- One row per (action, caller, time window). Postgres is the only state
      -- serverless instances share, so the counter has to live here.
      CREATE TABLE rate_limits (
        bucket       text NOT NULL,
        subject      text NOT NULL,
        window_start timestamptz NOT NULL,
        hits         integer NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket, subject, window_start)
      );

      -- Only used by the periodic cleanup of expired windows.
      CREATE INDEX rate_limits_window_start_idx ON rate_limits (window_start);
    `,
  },
  {
    name: "0004_footer_clicks",
    sql: `
      -- One row per guest who tapped "create your own" on an invite footer.
      -- Counted on the server because the localStorage label cannot survive a
      -- guest tapping in WhatsApp's browser and finishing in Chrome days later,
      -- which is the likeliest journey there is.
      CREATE TABLE footer_clicks (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug       text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX footer_clicks_created_at_idx ON footer_clicks (created_at);
    `,
  },
  {
    name: "0005_invite_views",
    sql: `
      -- One row per opened invite. The counter on invites answers "how many
      -- views has this invite had", which is all the host needs, but it cannot
      -- answer "how many views this week" — and without that the loop funnel
      -- was dividing a fortnight of views into a day of taps.
      CREATE TABLE invite_views (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invite_id  uuid REFERENCES invites(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX invite_views_created_at_idx ON invite_views (created_at);
    `,
  },
  {
    name: "0006_footer_click_placement",
    sql: `
      -- Where on the invite page the tap came from. The quiet strip at the
      -- bottom and the moment just after a guest replies are very different
      -- offers, and with one number for both there is no way to learn which
      -- one guests actually respond to.
      --
      -- Existing rows keep '' rather than being guessed into a bucket: every
      -- tap recorded before this migration came from the old single footer,
      -- and labelling them as such would overstate how well it did.
      ALTER TABLE footer_clicks ADD COLUMN placement text NOT NULL DEFAULT '';
    `,
  },
  {
    name: "0007_invite_place",
    sql: `
      -- Where the venue actually is, when the host picked it from the
      -- suggestions rather than typing it out. Only then: a guest tapping
      -- Directions for "Rose Garden Hall" can otherwise land in the wrong
      -- city, because that is a search, not a place.
      --
      -- Nullable with no default, and that is the point. Most invites are at
      -- somebody's house and will never have coordinates, so "no location" has
      -- to be an ordinary state rather than a gap to be filled. The venue and
      -- address text stay the record of truth either way.
      ALTER TABLE invites ADD COLUMN place_lat double precision;
      ALTER TABLE invites ADD COLUMN place_lng double precision;
    `,
  },
  {
    name: "0008_mine",
    sql: `
      -- Rows made by the person who runs this, rather than by a real host or
      -- guest. Every reading of the funnel so far has had to guess which was
      -- which from the titles, and got it wrong repeatedly: a tap counted as
      -- a stranger's was his own, an invite "from an invite" was a test.
      --
      -- All three legs need the flag or the percentages still lie. Excluding
      -- his invites while still counting his views would quietly make the
      -- conversion rate worse rather than more honest.
      --
      -- Defaults to false, so everything already in the table reads as
      -- somebody else's. That is wrong for the handful he made before today
      -- and cannot be fixed by guessing; it is corrected by hand or not at all.
      ALTER TABLE invites       ADD COLUMN mine boolean NOT NULL DEFAULT false;
      ALTER TABLE footer_clicks ADD COLUMN mine boolean NOT NULL DEFAULT false;
      ALTER TABLE invite_views  ADD COLUMN mine boolean NOT NULL DEFAULT false;
    `,
  },
];
