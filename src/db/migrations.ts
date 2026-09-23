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
];
