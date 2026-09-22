import { boolean, date, index, integer, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  editKeyHash: text("edit_key_hash").notNull(),
  occasion: text("occasion").notNull(),
  template: text("template").notNull(),
  palette: text("palette").notNull(),
  lang: text("lang").notNull(),
  kicker: text("kicker").notNull(),
  title: text("title").notNull(),
  hostedBy: text("hosted_by").notNull(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  // "HH:MM" or "" when the host didn't pick a time.
  eventTime: text("event_time").notNull(),
  venue: text("venue").notNull(),
  address: text("address").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull().default(""),
  isPremium: boolean("is_premium").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rsvps = pgTable(
  "rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => invites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").notNull(),
    guests: smallint("guests").notNull().default(1),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rsvps_invite_id_idx").on(t.inviteId)],
);

export type InviteRow = typeof invites.$inferSelect;
export type RsvpRow = typeof rsvps.$inferSelect;
