import './env.ts';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from './db.ts';
import { feedings, dayNotes, settings, diapers, sleepSessions } from './schema.ts';
import { getRecommendation } from './recommendations.ts';
import { buildForecast } from './forecast.ts';

const app = new Hono();
app.use('*', cors({ origin: '*' }));

const BABY_BIRTH_DATE = process.env.BABY_BIRTH_DATE ?? '2026-01-30';
const BABY_NAME = process.env.BABY_NAME ?? 'Бебе';
const AUTH_USER = process.env.AUTH_USER ?? 'veli';
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? process.env.SESSION_SECRET ?? '';

async function ensureAuthTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS auth_users (
      username text PRIMARY KEY,
      password_hash text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

const authReady = ensureAuthTable();

function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, key] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const key = scryptSync(password, salt, 64).toString('base64url');
  return `scrypt$${salt}$${key}`;
}

app.post('/api/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');

  if (!AUTH_TOKEN) {
    return c.json({ error: 'auth is not configured' }, 500);
  }

  await authReady;
  const rows = await db.execute<{ password_hash: string }>(sql`
    SELECT password_hash FROM auth_users WHERE username = ${username} LIMIT 1
  `);
  const user = rows[0];

  if (username === AUTH_USER && user?.password_hash && verifyPassword(password, user.password_hash)) {
    return c.json({ token: AUTH_TOKEN, user: AUTH_USER });
  }

  return c.json({ error: 'invalid credentials' }, 401);
});

app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const auth = c.req.header('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!AUTH_TOKEN || token !== AUTH_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  return next();
});

app.get('/api/baby', (c) =>
  c.json({ name: BABY_NAME, birthDate: BABY_BIRTH_DATE }),
);

// GET /api/feedings?day=YYYY-MM-DD
app.get('/api/feedings', async (c) => {
  const day = c.req.query('day');
  if (!day) return c.json({ error: 'day query required' }, 400);
  const rows = await db
    .select()
    .from(feedings)
    .where(eq(feedings.day, day))
    .orderBy(asc(feedings.fedAt));
  return c.json(rows);
});

// GET /api/feedings/recent-days?limit=14 — returns days with totals (for calendar dots)
app.get('/api/feedings/recent-days', async (c) => {
  const limit = Number(c.req.query('limit') ?? 60);
  const rows = await db.execute<{ day: string; total_ml: number; count: number }>(sql`
    SELECT day::text AS day, COALESCE(SUM(amount_ml), 0)::int AS total_ml, COUNT(*)::int AS count
    FROM feedings
    GROUP BY day
    ORDER BY day DESC
    LIMIT ${limit}
  `);
  return c.json(rows);
});

// POST /api/feedings { day, fedAt (ISO), amountMl, durationMin?, note? }
app.post('/api/feedings', async (c) => {
  const body = await c.req.json();
  const day = String(body.day ?? '').slice(0, 10);
  const fedAt = String(body.fedAt ?? '');
  const amountMl = Number(body.amountMl);
  const note = typeof body.note === 'string' ? body.note : null;
  const durationMin = normDuration(body.durationMin);
  if (!day || !fedAt || !Number.isFinite(amountMl) || amountMl <= 0) {
    return c.json({ error: 'invalid input' }, 400);
  }
  const [row] = await db
    .insert(feedings)
    .values({ day, fedAt, amountMl, durationMin, note })
    .returning();
  return c.json(row, 201);
});

// PATCH /api/feedings/:id { amountMl?, fedAt?, durationMin?, note? }
app.patch('/api/feedings/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const update: Record<string, unknown> = {};
  if (body.amountMl !== undefined) update.amountMl = Number(body.amountMl);
  if (body.fedAt !== undefined) update.fedAt = String(body.fedAt);
  if (body.day !== undefined) update.day = String(body.day).slice(0, 10);
  if (body.note !== undefined) update.note = body.note;
  if (body.durationMin !== undefined) update.durationMin = normDuration(body.durationMin);
  const [row] = await db.update(feedings).set(update).where(eq(feedings.id, id)).returning();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});

function normDuration(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 240 ? Math.round(n) : null;
}

// DELETE /api/feedings/:id
app.delete('/api/feedings/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db.delete(feedings).where(eq(feedings.id, id)).returning();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

// GET /api/diapers?day=YYYY-MM-DD — returns events for that day, oldest first
app.get('/api/diapers', async (c) => {
  const day = c.req.query('day');
  if (!day) return c.json({ error: 'day query required' }, 400);
  const rows = await db
    .select()
    .from(diapers)
    .where(eq(diapers.day, day))
    .orderBy(asc(diapers.loggedAt));
  return c.json(rows);
});

// POST /api/diapers { day, loggedAt?, kind } — kind = 'wet' | 'dirty'
app.post('/api/diapers', async (c) => {
  const body = await c.req.json();
  const day = String(body.day ?? '').slice(0, 10);
  const kind = String(body.kind ?? '');
  if (!day || (kind !== 'wet' && kind !== 'dirty')) {
    return c.json({ error: 'invalid input' }, 400);
  }
  const loggedAt = body.loggedAt ? String(body.loggedAt) : new Date().toISOString();
  const note = typeof body.note === 'string' ? body.note : null;
  const [row] = await db.insert(diapers).values({ day, loggedAt, kind, note }).returning();
  return c.json(row, 201);
});

// PATCH /api/diapers/:id { loggedAt?, kind?, note? }
app.patch('/api/diapers/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const update: Record<string, unknown> = {};
  if (body.loggedAt !== undefined) update.loggedAt = String(body.loggedAt);
  if (body.day !== undefined) update.day = String(body.day).slice(0, 10);
  if (body.kind !== undefined) {
    const k = String(body.kind);
    if (k !== 'wet' && k !== 'dirty') return c.json({ error: 'invalid kind' }, 400);
    update.kind = k;
  }
  if (body.note !== undefined) update.note = body.note;
  const [row] = await db.update(diapers).set(update).where(eq(diapers.id, id)).returning();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});

// DELETE /api/diapers/:id
app.delete('/api/diapers/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db.delete(diapers).where(eq(diapers.id, id)).returning();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});


// GET /api/sleeps?day=YYYY-MM-DD — returns sleep sessions for the selected day.
app.get('/api/sleeps', async (c) => {
  const day = c.req.query('day');
  if (!day) return c.json({ error: 'day query required' }, 400);
  const rows = await db
    .select()
    .from(sleepSessions)
    .where(eq(sleepSessions.day, day))
    .orderBy(asc(sleepSessions.startAt));
  return c.json(rows);
});

// POST /api/sleeps { day, startAt, endAt, note? } — creates one completed sleep entry.
app.post('/api/sleeps', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const day = String(body.day ?? '').slice(0, 10);
  const startAt = String(body.startAt ?? '');
  const endAt = String(body.endAt ?? '');
  if (!day || !startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return c.json({ error: 'invalid input' }, 400);
  }

  const note = typeof body.note === 'string' ? body.note : null;
  const [row] = await db.insert(sleepSessions).values({ day, startAt, endAt, note }).returning();
  return c.json(row, 201);
});

// PATCH /api/sleeps/:id { day?, startAt?, endAt?, note? }
app.patch('/api/sleeps/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const update: Record<string, unknown> = {};
  if (body.day !== undefined) update.day = String(body.day).slice(0, 10);
  if (body.startAt !== undefined) update.startAt = String(body.startAt);
  if (body.endAt !== undefined) update.endAt = body.endAt ? String(body.endAt) : null;
  if (body.note !== undefined) update.note = body.note;
  const [row] = await db.update(sleepSessions).set(update).where(eq(sleepSessions.id, id)).returning();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});

// DELETE /api/sleeps/:id
app.delete('/api/sleeps/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db.delete(sleepSessions).where(eq(sleepSessions.id, id)).returning();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});


// GET /api/trends?days=14 — daily totals for trend analysis.
app.get('/api/trends', async (c) => {
  const rawDays = Number(c.req.query('days') ?? 14);
  const days = Number.isFinite(rawDays) ? Math.min(60, Math.max(3, Math.round(rawDays))) : 14;
  const rows = await db.execute<{
    day: string;
    "feedingMl": number;
    "feedingCount": number;
    "avgFeedMl": number | null;
    "sleepMin": number;
    "sleepCount": number;
    "wetCount": number;
    "dirtyCount": number;
    note: string | null;
  }>(sql`
    WITH dates AS (
      SELECT generate_series(
        (current_date - (${days}::int - 1) * interval '1 day')::date,
        current_date,
        interval '1 day'
      )::date AS day
    ), feeding AS (
      SELECT day, COALESCE(SUM(amount_ml), 0)::int AS feeding_ml, COUNT(*)::int AS feeding_count,
             ROUND(AVG(amount_ml))::int AS avg_feed_ml
      FROM feedings
      GROUP BY day
    ), sleep AS (
      SELECT day,
             COALESCE(SUM(EXTRACT(EPOCH FROM (end_at - start_at)) / 60), 0)::int AS sleep_min,
             COUNT(*)::int AS sleep_count
      FROM sleep_sessions
      WHERE end_at IS NOT NULL
      GROUP BY day
    ), diaper AS (
      SELECT day,
             COUNT(*) FILTER (WHERE kind = 'wet')::int AS wet_count,
             COUNT(*) FILTER (WHERE kind = 'dirty')::int AS dirty_count
      FROM diapers
      GROUP BY day
    )
    SELECT d.day::text AS day,
           COALESCE(f.feeding_ml, 0)::int AS "feedingMl",
           COALESCE(f.feeding_count, 0)::int AS "feedingCount",
           f.avg_feed_ml::int AS "avgFeedMl",
           COALESCE(s.sleep_min, 0)::int AS "sleepMin",
           COALESCE(s.sleep_count, 0)::int AS "sleepCount",
           COALESCE(di.wet_count, 0)::int AS "wetCount",
           COALESCE(di.dirty_count, 0)::int AS "dirtyCount",
           NULLIF(n.note, '') AS note
    FROM dates d
    LEFT JOIN feeding f ON f.day = d.day
    LEFT JOIN sleep s ON s.day = d.day
    LEFT JOIN diaper di ON di.day = d.day
    LEFT JOIN day_notes n ON n.day = d.day
    ORDER BY d.day ASC
  `);

  const filled = rows.filter((r) => r.feedingCount > 0 || r.sleepCount > 0 || r.wetCount > 0 || r.dirtyCount > 0 || !!r.note);
  const avg = (vals: number[]) => vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const last = rows.at(-1) ?? null;
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;

  return c.json({
    days,
    rows,
    summary: {
      trackedDays: filled.length,
      avgDailyMl: avg(filled.map((r) => r.feedingMl).filter((v) => v > 0)),
      avgDailySleepMin: avg(filled.map((r) => r.sleepMin).filter((v) => v > 0)),
      avgDailyWet: avg(filled.map((r) => r.wetCount).filter((v) => v > 0)),
      avgDailyDirty: avg(filled.map((r) => r.dirtyCount).filter((v) => v > 0)),
      todayVsYesterday: last && prev ? {
        feedingMl: last.feedingMl - prev.feedingMl,
        sleepMin: last.sleepMin - prev.sleepMin,
        wet: last.wetCount - prev.wetCount,
        dirty: last.dirtyCount - prev.dirtyCount,
      } : null,
    },
  });
});

// GET /api/notes/:day
app.get('/api/notes/:day', async (c) => {
  const day = c.req.param('day');
  const [row] = await db.select().from(dayNotes).where(eq(dayNotes.day, day));
  return c.json(row ?? { day, note: '', updatedAt: null });
});

// PUT /api/notes/:day { note }
app.put('/api/notes/:day', async (c) => {
  const day = c.req.param('day');
  const body = await c.req.json();
  const note = String(body.note ?? '');
  const [row] = await db
    .insert(dayNotes)
    .values({ day, note })
    .onConflictDoUpdate({ target: dayNotes.day, set: { note, updatedAt: new Date().toISOString() } })
    .returning();
  return c.json(row);
});

async function loadSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? null;
}

// GET /api/settings → user's plan (or null fields)
app.get('/api/settings', async (c) => {
  const row = await loadSettings();
  return c.json(
    row ?? {
      id: 1,
      targetFeedsPerDay: null,
      targetPerFeedMl: null,
      intervalHours: null,
      wakeTime: null,
      bedtimeFeedTime: null,
      lastFeedTime: null,
      updatedAt: null,
    },
  );
});

// PUT /api/settings — partial: only fields present in body are updated.
app.put('/api/settings', async (c) => {
  const body = await c.req.json();
  const norm = (v: unknown) => {
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const normTime = (v: unknown) => {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    return /^\d{1,2}:\d{2}$/.test(s)
      ? s.split(':').map((p, i) => (i === 0 ? p.padStart(2, '0') : p)).join(':')
      : null;
  };

  const existing = await loadSettings();
  const next = {
    id: 1,
    targetFeedsPerDay: 'targetFeedsPerDay' in body ? norm(body.targetFeedsPerDay) : existing?.targetFeedsPerDay ?? null,
    targetPerFeedMl: 'targetPerFeedMl' in body ? norm(body.targetPerFeedMl) : existing?.targetPerFeedMl ?? null,
    intervalHours: 'intervalHours' in body ? norm(body.intervalHours) : existing?.intervalHours ?? null,
    wakeTime: 'wakeTime' in body ? normTime(body.wakeTime) : existing?.wakeTime ?? null,
    bedtimeFeedTime: 'bedtimeFeedTime' in body ? normTime(body.bedtimeFeedTime) : existing?.bedtimeFeedTime ?? null,
    lastFeedTime: 'lastFeedTime' in body ? normTime(body.lastFeedTime) : existing?.lastFeedTime ?? null,
    updatedAt: new Date().toISOString(),
  };
  const [row] = await db
    .insert(settings)
    .values(next)
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        targetFeedsPerDay: next.targetFeedsPerDay,
        targetPerFeedMl: next.targetPerFeedMl,
        intervalHours: next.intervalHours,
        wakeTime: next.wakeTime,
        bedtimeFeedTime: next.bedtimeFeedTime,
        lastFeedTime: next.lastFeedTime,
        updatedAt: next.updatedAt,
      },
    })
    .returning();
  return c.json(row);
});

// GET /api/recommendations?day=YYYY-MM-DD — returns guidance + remaining for that day
app.get('/api/recommendations', async (c) => {
  const day = c.req.query('day');
  if (!day) return c.json({ error: 'day required' }, 400);
  const rec = getRecommendation(BABY_BIRTH_DATE, day);
  const userSettings = await loadSettings();

  const rows = await db
    .select()
    .from(feedings)
    .where(eq(feedings.day, day))
    .orderBy(asc(feedings.fedAt));

  // The "plan" used for progress / suggestions: user override beats Holle table.
  const planFeedsPerDay = userSettings?.targetFeedsPerDay ?? rec.feedsPerDay;
  const planPerFeedMl = userSettings?.targetPerFeedMl ?? rec.perFeedMl;
  const planIntervalHours = userSettings?.intervalHours ?? rec.intervalHours;
  const planDailyTotalMl = planFeedsPerDay * planPerFeedMl;
  const usingOverride = !!(
    userSettings && (
      userSettings.targetFeedsPerDay != null ||
      userSettings.targetPerFeedMl != null ||
      userSettings.intervalHours != null
    )
  );

  const consumedMl = rows.reduce((s, r) => s + r.amountMl, 0);
  const consumedCount = rows.length;
  const remainingMl = Math.max(0, planDailyTotalMl - consumedMl);
  const remainingFeeds = Math.max(0, planFeedsPerDay - consumedCount);
  const suggestedNextMl = remainingFeeds > 0
    ? Math.round(remainingMl / remainingFeeds / 5) * 5
    : 0;

  const lastFedAt = rows.length ? rows[rows.length - 1].fedAt : null;
  const suggestedNextAt = lastFedAt
    ? new Date(new Date(lastFedAt).getTime() + planIntervalHours * 3600 * 1000).toISOString()
    : null;

  const wakeTime = userSettings?.wakeTime ?? '07:00';
  const bedtimeFeedTime = userSettings?.bedtimeFeedTime ?? '22:30';
  const lastFeedTime = userSettings?.lastFeedTime ?? '03:00';

  const forecast = buildForecast({
    day,
    lastFedAt,
    remainingFeeds,
    perFeedMl: suggestedNextMl > 0 ? suggestedNextMl : planPerFeedMl,
    intervalHours: planIntervalHours,
    wakeTime,
    bedtimeFeedTime,
    lastFeedTime,
  });

  return c.json({
    babyBirthDate: BABY_BIRTH_DATE,
    day,
    recommendation: rec,
    plan: {
      feedsPerDay: planFeedsPerDay,
      perFeedMl: planPerFeedMl,
      intervalHours: planIntervalHours,
      dailyTotalMl: planDailyTotalMl,
      usingOverride,
      wakeTime,
      bedtimeFeedTime,
      lastFeedTime,
    },
    consumedMl,
    consumedCount,
    remainingMl,
    remainingFeeds,
    suggestedNextMl,
    suggestedNextAt,
    lastFedAt,
    forecast,
  });
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`API listening on http://localhost:${port}`);
