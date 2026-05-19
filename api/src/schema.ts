import { pgTable, serial, integer, text, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core';

export const feedings = pgTable(
  'feedings',
  {
    id: serial('id').primaryKey(),
    // The local calendar day this feeding belongs to (YYYY-MM-DD).
    day: date('day', { mode: 'string' }).notNull(),
    // The full local timestamp when feeding happened.
    fedAt: timestamp('fed_at', { mode: 'string', withTimezone: true }).notNull(),
    amountMl: integer('amount_ml').notNull(),
    // Optional — how long it took (minutes). Useful as a signal: slow feed
    // often means baby is full-but-tired or had reflux; fast feed = very hungry.
    // Doesn't drive the forecast, just shows up in the day's history.
    durationMin: integer('duration_min'),
    note: text('note'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dayIdx: uniqueIndex('feedings_day_fed_at_idx').on(t.day, t.fedAt, t.id),
  }),
);

export const dayNotes = pgTable('day_notes', {
  day: date('day', { mode: 'string' }).primaryKey(),
  note: text('note').notNull().default(''),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Single-row configuration for the user's actual feeding plan.
// id is hardcoded to 1; we just upsert.
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  targetFeedsPerDay: integer('target_feeds_per_day'),
  targetPerFeedMl: integer('target_per_feed_ml'),
  intervalHours: integer('interval_hours'),
  // 'HH:MM' (local time). Wake = first feed of the day. Bedtime = last feed
  // before sleep (slight bump). LastFeed = the actual mid-night dream feed
  // (interpreted as next day if earlier than wakeTime); biggest bump.
  wakeTime: text('wake_time'),
  bedtimeFeedTime: text('bedtime_feed_time'),
  lastFeedTime: text('last_feed_time'),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Each row = one diaper event. Wet and dirty are tracked separately so the
// daily counts are just COUNT(*) per kind. If a single diaper had both,
// log it as two events.
export const diapers = pgTable(
  'diapers',
  {
    id: serial('id').primaryKey(),
    day: date('day', { mode: 'string' }).notNull(),
    loggedAt: timestamp('logged_at', { mode: 'string', withTimezone: true }).notNull(),
    // 'wet' or 'dirty'
    kind: text('kind').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dayKindIdx: uniqueIndex('diapers_day_logged_at_idx').on(t.day, t.loggedAt, t.id),
  }),
);

// Sleep tracking is session based: one row starts when baby falls asleep and
// gets an end_at when baby wakes up. `day` is the local calendar day the sleep
// session started, which keeps the daily diary easy to understand on mobile.
export const sleepSessions = pgTable(
  'sleep_sessions',
  {
    id: serial('id').primaryKey(),
    day: date('day', { mode: 'string' }).notNull(),
    startAt: timestamp('start_at', { mode: 'string', withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { mode: 'string', withTimezone: true }),
    note: text('note'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dayStartIdx: uniqueIndex('sleep_sessions_day_start_idx').on(t.day, t.startAt, t.id),
  }),
);

export type Feeding = typeof feedings.$inferSelect;
export type NewFeeding = typeof feedings.$inferInsert;
export type DayNote = typeof dayNotes.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Diaper = typeof diapers.$inferSelect;
export type NewDiaper = typeof diapers.$inferInsert;
export type SleepSession = typeof sleepSessions.$inferSelect;
export type NewSleepSession = typeof sleepSessions.$inferInsert;
