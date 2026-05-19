import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { TimePicker } from './TimePicker';

export type Prefill = {
  key: string;       // unique per pick — drives the apply effect
  hour: number;
  minute: number;
  amount: number;
};

type Props = { day: string; suggestedMl: number; prefill?: Prefill | null };

export function AddFeedingForm({ day, suggestedMl, prefill }: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [hour, setHour] = useState<number>(() => new Date().getHours());
  const [minute, setMinute] = useState<number>(() => new Date().getMinutes());
  const lastPrefillKey = useRef<string | null>(null);

  useEffect(() => {
    if (!amount && suggestedMl > 0) setAmount(String(suggestedMl));
  }, [suggestedMl, amount]);

  useEffect(() => {
    if (!prefill) return;
    if (lastPrefillKey.current === prefill.key) return;
    lastPrefillKey.current = prefill.key;
    setHour(prefill.hour);
    setMinute(prefill.minute);
    setAmount(String(prefill.amount));
  }, [prefill]);

  const placeholder = suggestedMl ? String(suggestedMl) : '180';

  const mut = useMutation({
    mutationFn: () => {
      const fedAt = isoFromDayAndTime(day, hour, minute);
      const dn = Number(duration);
      return api.addFeeding({
        day,
        fedAt,
        amountMl: Number(amount),
        durationMin: Number.isFinite(dn) && dn > 0 ? Math.round(dn) : null,
      });
    },
    onSuccess: () => {
      setAmount('');
      setDuration('');
      qc.invalidateQueries({ queryKey: ['feedings', day] });
      qc.invalidateQueries({ queryKey: ['rec', day] });
      qc.invalidateQueries({ queryKey: ['recent-days'] });
    },
  });

  const valid = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 && n <= 500;
  }, [amount]);

  const fieldInput =
    'h-10 text-center rounded-lg border border-[var(--color-line)] bg-[var(--color-input-bg)] text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)]';

  return (
    <form
      className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-soft)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) mut.mutate();
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Ново хранене</h2>
        {suggestedMl > 0 && (
          <button
            type="button"
            onClick={() => setAmount(String(suggestedMl))}
            className="text-xs text-[var(--color-brand)] hover:underline"
          >
            предложение: {suggestedMl} мл
          </button>
        )}
      </div>

      {/* Mobile: stacked, big touch targets. Desktop (sm+): one row. */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <Field label="Количество" className="sm:w-28">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={placeholder}
              className={`${fieldInput} w-full h-12 sm:h-10 text-lg sm:text-base pl-7 pr-9`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">мл</span>
          </div>
        </Field>

        <Field label="Час">
          <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
        </Field>

        <Field label={<>Времетраене <span className="opacity-60">(опц.)</span></>} className="sm:w-28">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              step={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="—"
              className={`${fieldInput} w-full h-12 sm:h-10 text-lg sm:text-base pl-8 pr-9`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">мин</span>
          </div>
        </Field>

        <button
          type="submit"
          disabled={!valid || mut.isPending}
          className="sm:ml-auto h-12 sm:h-10 px-5 rounded-lg bg-[var(--color-brand)] text-[var(--color-on-brand)] font-semibold shadow-sm enabled:hover:brightness-110 disabled:opacity-40 transition text-base sm:text-sm"
        >
          {mut.isPending ? 'Записва…' : 'Запиши'}
        </button>
      </div>

      {/* Quick amount chips — one tap on mobile */}
      <QuickAmountChips
        suggested={suggestedMl}
        current={amount}
        onPick={(n) => setAmount(String(n))}
      />

      {mut.isError && (
        <p className="mt-2 text-xs text-red-600">Неуспешно записване. Опитай пак.</p>
      )}
    </form>
  );
}

function QuickAmountChips({
  suggested,
  current,
  onPick,
}: {
  suggested: number;
  current: string;
  onPick: (n: number) => void;
}) {
  const baseValues = [60, 90, 120, 150, 180, 210];
  const set = new Set(baseValues);
  if (suggested > 0) set.add(suggested);
  const values = Array.from(set).sort((a, b) => a - b);
  const cur = Number(current);

  return (
    <div className="mt-3 -mx-1 flex flex-wrap gap-1.5">
      {values.map((v) => {
        const active = cur === v;
        const isSuggested = v === suggested;
        return (
          <button
            type="button"
            key={v}
            onClick={() => onPick(v)}
            className={`px-3 h-8 rounded-full text-sm font-semibold tabular-nums transition border ${
              active
                ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)] border-[var(--color-brand)]'
                : isSuggested
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-ink)] border-[var(--color-brand-soft)]'
                : 'bg-[var(--color-input-bg)] text-[var(--color-ink-dim)] border-[var(--color-line)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            {v}
            <span className="ml-0.5 text-[11px] opacity-70">мл</span>
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}</label>
      {children}
    </div>
  );
}

function isoFromDayAndTime(day: string, hour: number, minute: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
  return dt.toISOString();
}
