export type Feeding = {
  id: number;
  day: string;
  fedAt: string;
  amountMl: number;
  durationMin: number | null;
  note: string | null;
  createdAt: string;
};

export type DayNote = { day: string; note: string; updatedAt: string | null };

export type Recommendation = {
  ageDays: number;
  ageLabel: string;
  perFeedMl: number;
  feedsPerDay: number;
  dailyTotalMl: number;
  intervalHours: number;
  source: string;
  sourceUrl: string;
};

export type Plan = {
  feedsPerDay: number;
  perFeedMl: number;
  intervalHours: number;
  dailyTotalMl: number;
  usingOverride: boolean;
  wakeTime: string;
  bedtimeFeedTime: string;
  lastFeedTime: string;
};

export type ForecastSlotKind = 'regular' | 'bedtime' | 'night';

export type ForecastSlot = {
  at: string;
  amountMl: number;
  kind: ForecastSlotKind;
  isDreamFeed: boolean;
  isBedtimeFeed: boolean;
  reason: string;
};

export type DayRecommendation = {
  babyBirthDate: string;
  day: string;
  recommendation: Recommendation;
  plan: Plan;
  consumedMl: number;
  consumedCount: number;
  remainingMl: number;
  remainingFeeds: number;
  suggestedNextMl: number;
  suggestedNextAt: string | null;
  lastFedAt: string | null;
  forecast: ForecastSlot[];
};

export type Settings = {
  id: number;
  targetFeedsPerDay: number | null;
  targetPerFeedMl: number | null;
  intervalHours: number | null;
  wakeTime: string | null;
  bedtimeFeedTime: string | null;
  lastFeedTime: string | null;
  updatedAt: string | null;
};

export type DayTotal = { day: string; total_ml: number; count: number };

export type DiaperKind = 'wet' | 'dirty';

export type Diaper = {
  id: number;
  day: string;
  loggedAt: string;
  kind: DiaperKind;
  note: string | null;
  createdAt: string;
};

export type SleepSession = {
  id: number;
  day: string;
  startAt: string;
  endAt: string | null;
  note: string | null;
  createdAt: string;
};


export type TrendDay = {
  day: string;
  feedingMl: number;
  feedingCount: number;
  avgFeedMl: number | null;
  sleepMin: number;
  sleepCount: number;
  wetCount: number;
  dirtyCount: number;
  note: string | null;
};

export type Trends = {
  days: number;
  rows: TrendDay[];
  summary: {
    trackedDays: number;
    avgDailyMl: number;
    avgDailySleepMin: number;
    avgDailyWet: number;
    avgDailyDirty: number;
    todayVsYesterday: null | { feedingMl: number; sleepMin: number; wet: number; dirty: number };
  };
};

const AUTH_STORAGE_KEY = 'baby-feeding-auth-token';

export function getAuthToken() {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function hasAuthToken() {
  return Boolean(getAuthToken());
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event('baby-auth-cleared'));
}

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) clearAuthToken();
  return response;
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  login: (input: { username: string; password: string }) =>
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(j<{ token: string; user: string }>),
  baby: () => authFetch('/api/baby').then(j<{ name: string; birthDate: string }>),
  feedings: (day: string) => authFetch(`/api/feedings?day=${day}`).then(j<Feeding[]>),
  recentDays: () => authFetch('/api/feedings/recent-days?limit=120').then(j<DayTotal[]>),
  trends: (days = 14) => authFetch(`/api/trends?days=${days}`).then(j<Trends>),
  rec: (day: string) => authFetch(`/api/recommendations?day=${day}`).then(j<DayRecommendation>),
  note: (day: string) => authFetch(`/api/notes/${day}`).then(j<DayNote>),
  saveNote: (day: string, note: string) =>
    authFetch(`/api/notes/${day}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    }).then(j<DayNote>),
  addFeeding: (input: { day: string; fedAt: string; amountMl: number; durationMin?: number | null; note?: string | null }) =>
    authFetch('/api/feedings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(j<Feeding>),
  patchFeeding: (id: number, patch: Partial<Pick<Feeding, 'amountMl' | 'fedAt' | 'note' | 'day' | 'durationMin'>>) =>
    authFetch(`/api/feedings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j<Feeding>),
  deleteFeeding: (id: number) =>
    authFetch(`/api/feedings/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),
  settings: () => authFetch('/api/settings').then(j<Settings>),
  saveSettings: (input: Partial<Pick<Settings, 'targetFeedsPerDay' | 'targetPerFeedMl' | 'intervalHours' | 'wakeTime' | 'bedtimeFeedTime' | 'lastFeedTime'>>) =>
    authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(j<Settings>),
  diapers: (day: string) => authFetch(`/api/diapers?day=${day}`).then(j<Diaper[]>),
  addDiaper: (input: { day: string; kind: DiaperKind; loggedAt?: string }) =>
    authFetch('/api/diapers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(j<Diaper>),
  patchDiaper: (id: number, patch: Partial<Pick<Diaper, 'loggedAt' | 'kind' | 'day' | 'note'>>) =>
    authFetch(`/api/diapers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j<Diaper>),
  deleteDiaper: (id: number) =>
    authFetch(`/api/diapers/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),
  sleeps: (day: string) => authFetch(`/api/sleeps?day=${day}`).then(j<SleepSession[]>),
  addSleep: (input: { day: string; startAt: string; endAt: string; note?: string | null }) =>
    authFetch('/api/sleeps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(j<SleepSession>),
  patchSleep: (id: number, patch: Partial<Pick<SleepSession, 'day' | 'startAt' | 'endAt' | 'note'>>) =>
    authFetch(`/api/sleeps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j<SleepSession>),
  deleteSleep: (id: number) =>
    authFetch(`/api/sleeps/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),
};
