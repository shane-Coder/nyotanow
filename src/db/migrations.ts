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
];
