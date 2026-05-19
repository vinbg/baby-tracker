import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feeding } from '../lib/api';
import { fmtTime } from '../lib/utils';
import { Trash2, Clock, Pencil, Check, X } from 'lucide-react';
import { TimePicker } from './TimePicker';

type Props = { day: string; feedings: Feeding[]; loading: boolean };

const COLS = 'grid-cols-[3.5rem_1fr_auto_5rem]';

export function FeedingList({ day, feedings, loading }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['feedings', day] });
    qc.invalidateQueries({ queryKey: ['rec', day] });
    qc.invalidateQueries({ queryKey: ['recent-days'] });
  };

  const del = useMutation({
    mutationFn: (id: number) => api.deleteFeeding(id),
    onSuccess: invalidate,
  });

  if (loading) return <div className="px-4 py-8 text-sm text-[var(--color-muted)]">Зарежда…</div>;
  if (feedings.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="text-3xl mb-1">🍼</div>
        <div className="text-sm text-[var(--color-muted)]">Още няма записи за този ден.</div>
      </div>
    );
  }

  let prevAt: number | null = null;
  return (
    <ul className="divide-y divide-[var(--color-line)]">
      <li className={`px-4 py-2 grid ${COLS} items-center gap-3 text-[11px] uppercase tracking-wide text-[var(--color-muted)]`}>
        <div>Час</div>
        <div>Времетраене</div>
        <div className="text-right">Количество</div>
        <div />
      </li>
      {feedings.map((f) => {
        const at = new Date(f.fedAt).getTime();
        const gap = prevAt ? Math.round((at - prevAt) / 60_000) : null;
        prevAt = at;
        const gapH = gap ? Math.floor(gap / 60) : null;
        const gapM = gap ? gap % 60 : null;

        if (editingId === f.id) {
          return (
            <EditRow
              key={f.id}
              day={day}
              feeding={f}
              onClose={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                invalidate();
              }}
            />
          );
        }

        return (
          <li key={f.id} className={`px-4 py-3 grid ${COLS} items-center gap-3 group`}>
            <div className="text-base font-semibold tabular-nums">{fmtTime(f.fedAt)}</div>
            <div className="min-w-0 text-sm text-[var(--color-muted)] tabular-nums">
              {f.durationMin != null ? (
                <span className="inline-flex items-center gap-1" title="времетраене на хранене">
                  <Clock size={12} /> {f.durationMin} мин
                </span>
              ) : (
                <span className="opacity-50">—</span>
              )}
              {gap !== null && (
                <span className="ml-2 text-[11px] opacity-70">
                  +{gapH ? `${gapH}ч ` : ''}{gapM}мин
                </span>
              )}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-ink)] text-sm font-semibold tabular-nums justify-self-end">
              {f.amountMl} мл
            </div>
            <div className="flex items-center gap-1 justify-self-end sm:opacity-60 sm:group-hover:opacity-100 transition">
              <button
                onClick={() => setEditingId(f.id)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-2)]"
                aria-label="редактирай"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => {
                  if (confirm('Изтриване на записа?')) del.mutate(f.id);
                }}
                className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-red-600 hover:bg-[var(--color-surface-2)]"
                aria-label="изтрий"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EditRow({
  day,
  feeding,
  onClose,
  onSaved,
}: {
  day: string;
  feeding: Feeding;
  onClose: () => void;
  onSaved: () => void;
}) {
  const at = new Date(feeding.fedAt);
  const [hour, setHour] = useState(at.getHours());
  const [minute, setMinute] = useState(at.getMinutes());
  const [amount, setAmount] = useState(String(feeding.amountMl));
  const [duration, setDuration] = useState(
    feeding.durationMin != null ? String(feeding.durationMin) : '',
  );

  const save = useMutation({
    mutationFn: () => {
      const [y, mo, d] = day.split('-').map(Number);
      const fedAt = new Date(y, (mo ?? 1) - 1, d ?? 1, hour, minute, 0, 0).toISOString();
      const dn = Number(duration);
      return api.patchFeeding(feeding.id, {
        fedAt,
        amountMl: Number(amount),
        durationMin: duration === '' ? null : Number.isFinite(dn) && dn > 0 ? Math.round(dn) : null,
      });
    },
    onSuccess: onSaved,
  });

  const valid = Number(amount) > 0 && Number(amount) <= 500;
  const inputCls =
    'h-11 sm:h-9 text-center rounded-lg border border-[var(--color-line)] bg-[var(--color-input-bg)] text-base sm:text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)]';

  return (
    <li className={`px-4 py-3 grid ${COLS} items-center gap-3 bg-[var(--color-input-bg)]/40`}>
      <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
      <div className="relative w-24">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          step={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="—"
          className={`${inputCls} w-full pl-8 pr-8`}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-muted)]">мин</span>
      </div>
      <div className="relative w-24 justify-self-end">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`${inputCls} w-full pl-7 pr-7`}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-muted)]">мл</span>
      </div>
      <div className="flex items-center gap-2 justify-self-end">
        <button
          onClick={() => valid && save.mutate()}
          disabled={!valid || save.isPending}
          className="text-[var(--color-brand)] hover:brightness-110 disabled:opacity-40"
          aria-label="запази"
        >
          <Check size={18} />
        </button>
        <button
          onClick={onClose}
          className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label="отказ"
        >
          <X size={18} />
        </button>
      </div>
    </li>
  );
}
