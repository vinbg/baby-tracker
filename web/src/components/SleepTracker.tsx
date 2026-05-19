import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bed, Plus, Trash2 } from 'lucide-react';
import { api, type SleepSession } from '../lib/api';
import { fmtTime } from '../lib/utils';
import { TimePicker } from './TimePicker';

export function SleepTracker({ day }: { day: string }) {
  const qc = useQueryClient();
  const sleeps = useQuery({ queryKey: ['sleeps', day], queryFn: () => api.sleeps(day) });
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMinute, setEndMinute] = useState(0);
  const [error, setError] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sleeps', day] });

  const add = useMutation({
    mutationFn: () => {
      setError('');
      const startAt = dateFor(day, startHour, startMinute);
      const endAt = dateFor(day, endHour, endMinute);
      if (endAt.getTime() <= startAt.getTime()) {
        throw new Error('Краят трябва да е след началото.');
      }
      return api.addSleep({ day, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    },
    onSuccess: () => {
      invalidate();
      const nextStart = dateFor(day, endHour, endMinute);
      const nextEnd = new Date(nextStart.getTime() + 60 * 60_000);
      setStartHour(nextStart.getHours());
      setStartMinute(nextStart.getMinutes());
      setEndHour(nextEnd.getHours());
      setEndMinute(nextEnd.getMinutes());
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Неуспешно добавяне.'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteSleep(id),
    onSuccess: invalidate,
  });

  const list = sleeps.data ?? [];
  const totalMinutes = useMemo(() => list.reduce((sum, item) => sum + sleepMinutes(item), 0), [list]);
  const longest = useMemo(() => Math.max(0, ...list.map(sleepMinutes)), [list]);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2"><Bed size={16} /> Сън</h2>
          <p className="text-xs text-[var(--color-muted)]">добави период с начало и край</p>
        </div>
        <span className="text-xs text-[var(--color-muted)] tabular-nums text-right">
          {formatDuration(totalMinutes)} общо
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-input-bg)]/40 p-3 space-y-2">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Начало</span>
            <TimePicker hour={startHour} minute={startMinute} onChange={(h, m) => { setStartHour(h); setStartMinute(m); }} />
          </label>
          <label className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-input-bg)]/40 p-3 space-y-2">
            <span className="text-xs font-semibold text-[var(--color-muted)]">Край</span>
            <TimePicker hour={endHour} minute={endMinute} onChange={(h, m) => { setEndHour(h); setEndMinute(m); }} />
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={() => add.mutate()}
          disabled={add.isPending}
          className="w-full h-14 rounded-2xl bg-[var(--color-night-bg)] text-[var(--color-night-fg)] font-bold px-6 inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
        >
          <Plus size={20} strokeWidth={3} /> Добави сън
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center text-xs">
        <Stat label="сесии" value={String(list.length)} />
        <Stat label="най-дълъг" value={formatDuration(longest)} />
        <Stat label="средно" value={formatDuration(list.length ? Math.round(totalMinutes / list.length) : 0)} />
      </div>

      {list.length > 0 && (
        <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
          {list.map((item) => (
            <li key={item.id} className="px-4 py-3 flex items-center gap-3 group">
              <span className="text-xl">😴</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium tabular-nums">
                  {fmtTime(item.startAt)} — {item.endAt ? fmtTime(item.endAt) : '—'}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  {formatDuration(sleepMinutes(item))}
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

function sleepMinutes(item: SleepSession) {
  if (!item.endAt) return 0;
  const start = new Date(item.startAt).getTime();
  const end = new Date(item.endAt).getTime();
  return Math.max(0, Math.round((end - start) / 60_000));
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function dateFor(day: string, hour: number, minute: number) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
}
