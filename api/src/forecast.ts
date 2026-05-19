// Forecast the remaining feedings of the selected calendar day.
//
// Two anchored slots:
//   - lastFeedTime    — the middle-of-the-night feed for the SAME selected day.
//                       If it is 03:00, it is the first feeding of that day,
//                       not the last feeding of the previous day.
//   - bedtimeFeedTime — the last feed before the long sleep stretch.
// Other slots are spread between the next due feeding and bedtime.

export type ForecastSlotKind = 'regular' | 'bedtime' | 'night';

export type ForecastSlot = {
  at: string;
  amountMl: number;
  kind: ForecastSlotKind;
  isDreamFeed: boolean;     // true only for kind === 'night' (kept for back-compat)
  isBedtimeFeed: boolean;   // true only for kind === 'bedtime'
  reason: string;
};

export type BuildForecastInput = {
  day: string;
  lastFedAt: string | null;
  remainingFeeds: number;
  perFeedMl: number;
  intervalHours: number;
  wakeTime: string;
  bedtimeFeedTime: string;
  lastFeedTime: string;
};

const MIN_GAP_RATIO = 0.6;
// Bedtime is the real "dream feed": biggest bottle, eaten fully awake before
// the long sleep stretch. The night feed is half-asleep — usually smaller.
const BEDTIME_BONUS_PCT = 0.18;
const NIGHT_BONUS_PCT = -0.10;

export function buildForecast(input: BuildForecastInput): ForecastSlot[] {
  const {
    day, lastFedAt, remainingFeeds, perFeedMl, intervalHours,
    wakeTime, bedtimeFeedTime, lastFeedTime,
  } = input;
  if (remainingFeeds <= 0) return [];

  const wakeAt = anchorToDay(day, wakeTime);
  const bedtimeAt = anchorToDay(day, bedtimeFeedTime);
  // Night feed belongs to the selected calendar day. Example: for 2026-05-19,
  // 03:00 means 2026-05-19 03:00 and should sort before daytime feeds.
  const nightAt = anchorToDay(day, lastFeedTime);

  const earliestNext = lastFedAt
    ? addHours(new Date(lastFedAt), intervalHours)
    : maxDate(new Date(), wakeAt);

  // Helper to wrap a Date into a slot with the right metadata.
  const make = (at: Date, kind: ForecastSlotKind, prev: Date | null): ForecastSlot => {
    const amountMl = kind === 'night'
      ? bump(perFeedMl, NIGHT_BONUS_PCT)
      : kind === 'bedtime'
        ? bump(perFeedMl, BEDTIME_BONUS_PCT)
        : perFeedMl;
    const reason =
      kind === 'night'
        ? 'нощно хранене (по-голяма доза за по-дълъг сън)'
        : kind === 'bedtime'
          ? 'преди сън (леко по-голяма доза)'
          : prev
            ? `~${formatGap(at, prev)} от предходно`
            : 'следващо';
    return {
      at: at.toISOString(),
      amountMl,
      kind,
      isDreamFeed: kind === 'night',
      isBedtimeFeed: kind === 'bedtime',
      reason,
    };
  };

  // 1 left → night feed only.
  if (remainingFeeds === 1) {
    const at = snapTo5Min(maxDate(earliestNext, nightAt));
    return [make(at, 'night', null)];
  }

  // 2 left → night + bedtime when the night feed is still relevant for the
  // selected day; otherwise just keep the remaining order after earliestNext.
  if (remainingFeeds === 2) {
    const bedtime = snapTo5Min(maxDate(earliestNext, bedtimeAt));
    const night = snapTo5Min(
      nightAt.getTime() < bedtimeAt.getTime()
        ? nightAt
        : maxDate(addHours(bedtime, intervalHours * MIN_GAP_RATIO), nightAt),
    );
    return sortSlots([make(night, 'night', null), make(bedtime, 'bedtime', night)]);
  }

  // 3+ → spread (n-2) between earliestNext and bedtime, then bedtime, then night.
  const regularCount = remainingFeeds - 2;
  let regulars: Date[];
  if (earliestNext.getTime() >= bedtimeAt.getTime()) {
    // We've drifted past bedtime — step at plan interval and accept that.
    regulars = stepEvery(earliestNext, regularCount, intervalHours);
  } else {
    const totalSpan = (bedtimeAt.getTime() - earliestNext.getTime()) / 3_600_000;
    const idealGap = regularCount === 1 ? 0 : totalSpan / regularCount;
    const gap = Math.max(idealGap, intervalHours * MIN_GAP_RATIO);
    regulars = [];
    for (let i = 0; i < regularCount; i++) {
      regulars.push(addHours(earliestNext, gap * i));
    }
  }
  const regularsRounded = regulars.map(snapTo5Min);

  const lastRegular = regularsRounded[regularsRounded.length - 1];
  const bedtime = snapTo5Min(
    maxDate(addHours(lastRegular, intervalHours * MIN_GAP_RATIO), bedtimeAt),
  );
  const night = snapTo5Min(
    nightAt.getTime() < bedtimeAt.getTime()
      ? nightAt
      : maxDate(addHours(bedtime, intervalHours * MIN_GAP_RATIO), nightAt),
  );

  const out: ForecastSlot[] = [];
  let prev: Date | null = null;
  for (const at of regularsRounded) {
    out.push(make(at, 'regular', prev));
    prev = at;
  }
  out.push(make(bedtime, 'bedtime', prev));
  out.push(make(night, 'night', null));
  return sortSlots(out);
}

function sortSlots(slots: ForecastSlot[]): ForecastSlot[] {
  return [...slots].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function snapTo5Min(at: Date): Date {
  const d = new Date(at);
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0);
  return d;
}

function anchorToDay(
  day: string,
  hhmm: string,
  opts?: { rollIfBefore?: string },
): Date {
  const [y, mo, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const at = new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0, 0);
  if (opts?.rollIfBefore) {
    const [bh, bm] = opts.rollIfBefore.split(':').map(Number);
    const cur = (h ?? 0) * 60 + (mi ?? 0);
    const ref = (bh ?? 0) * 60 + (bm ?? 0);
    if (cur < ref) at.setDate(at.getDate() + 1);
  }
  return at;
}

function addHours(at: Date, hours: number): Date {
  return new Date(at.getTime() + hours * 3_600_000);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function bump(perFeed: number, pct: number): number {
  const v = Math.round((perFeed * (1 + pct)) / 5) * 5;
  return Math.max(5, v);
}

function stepEvery(start: Date, n: number, hours: number): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < n; i++) out.push(addHours(start, hours * i));
  return out;
}

function formatGap(later: Date, earlier: Date): string {
  const mins = Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60_000));
  if (mins < 60) return `${mins}мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}ч` : `${h}ч ${m}мин`;
}
