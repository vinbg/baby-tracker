import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bed, Play, Square, Trash2 } from 'lucide-react';
import { api, type SleepSession } from '../lib/api';
import { fmtTime } from '../lib/utils';

export function SleepTracker({ day }: { day: string }) {
  const qc = useQueryClient();
  const sleeps = useQuery({ queryKey: ['sleeps', day], queryFn: () => api.sleeps(day) });
  const active = useQuery({ queryKey: ['sleeps', 'active'], queryFn: api.activeSleep, refetchInterval: 60_000 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sleeps', day] });
    qc.invalidateQueries({ queryKey: ['sleeps', 'active'] });
  };

  const start = useMutation({
    mutationFn: () => api.startSleep({ day, startAt: nowForDay(day) }),
    onSuccess: invalidate,
  });

  const stop = useMutation({
    mutationFn: (id: number) => api.stopSleep(id, new Date().toISOString()),
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteSleep(id),
    onSuccess: invalidate,
  });

  const list = sleeps.data ?? [];
  const activeForDay = active.data?.day === day ? active.data : null;
  const totalMinutes = useMemo(() => list.reduce((sum, item) => sum + sleepMinutes(item, now), 0), [list, now]);
  const longest = useMemo(() => Math.max(0, ...list.map((item) => sleepMinutes(item, now))), [list, now]);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2"><Bed size={16} /> Сън</h2>
          <p className="text-xs text-[var(--color-muted)]">бърз старт/стоп за дрямки и нощен сън</p>
        </div>
        <span className="text-xs text-[var(--color-muted)] tabular-nums text-right">
          {formatDuration(totalMinutes)} общо
        </span>
      </div>

      <div className="p-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        {activeForDay ? (
          <div className="rounded-2xl bg-[var(--color-night-bg)] text-[var(--color-night-fg)] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">спи сега</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{formatDuration(sleepMinutes(activeForDay, now))}</div>
            <div className="mt-1 text-sm opacity-80">от {fmtTime(activeForDay.startAt)}</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
            Няма активен сън. Натисни старт, когато Ели заспи.
          </div>
        )}

        {activeForDay ? (
          <button
            type="button"
            onClick={() => stop.mutate(activeForDay.id)}
            disabled={stop.isPending}
            className="h-16 sm:h-20 rounded-2xl bg-[var(--color-brand)] text-white font-bold px-6 inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Square size={18} fill="currentColor" /> Събуди се
          </button>
        ) : (
          <button
            type="button"
            onClick={() => start.mutate()}
            disabled={start.isPending || Boolean(active.data)}
            className="h-16 sm:h-20 rounded-2xl bg-[var(--color-night-bg)] text-[var(--color-night-fg)] font-bold px-6 inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
            title={active.data ? 'Има активен сън в друг ден' : 'Старт на сън'}
          >
            <Play size={20} fill="currentColor" /> Заспива
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center text-xs">
        <Stat label="сесии" value={String(list.length)} />
        <Stat label="най-дълъг" value={formatDuration(longest)} />
        <Stat label="активен" value={activeForDay ? 'да' : 'не'} />
      </div>

      {list.length > 0 && (
        <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
          {list.map((item) => (
            <li key={item.id} className="px-4 py-3 flex items-center gap-3 group">
              <span className="text-xl">😴</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium tabular-nums">
                  {fmtTime(item.startAt)} — {item.endAt ? fmtTime(item.endAt) : 'сега'}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  {formatDuration(sleepMinutes(item, now))}{item.endAt ? '' : ' · активен'}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Изтриване на съня?')) del.mutate(item.id);
                }}
                className="w-10 h-10 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-red-600 hover:bg-[var(--color-surface-2)] sm:opacity-60 sm:group-hover:opacity-100 transition"
                aria-label="изтрий"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] px-2 py-2">
      <div className="font-semibold tabular-nums text-[var(--color-ink)]">{value}</div>
      <div className="text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

function sleepMinutes(item: SleepSession, now: number) {
  const start = new Date(item.startAt).getTime();
  const end = item.endAt ? new Date(item.endAt).getTime() : now;
  return Math.max(0, Math.round((end - start) / 60_000));
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function nowForDay(day: string): string {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (day === todayKey) return today.toISOString();
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).toISOString();
}
