import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bed, Droplets, Milk, Sparkles } from 'lucide-react';
import { api, type TrendDay } from '../lib/api';

export function TrendsView() {
  const [days, setDays] = useState(14);
  const q = useQuery({ queryKey: ['trends', days], queryFn: () => api.trends(days) });
  const rows = q.data?.rows ?? [];
  const maxMilk = Math.max(1, ...rows.map((r) => r.feedingMl));
  const maxSleep = Math.max(1, ...rows.map((r) => r.sleepMin));
  const maxDiapers = Math.max(1, ...rows.map((r) => r.wetCount + r.dirtyCount));
  const insights = useMemo(() => buildInsights(rows), [rows]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[1.6rem] border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-4 sm:p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">анализ</div>
            <h2 className="mt-1 text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 size={22} /> Трендове
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Мляко, сън и памперси за последните дни.</p>
          </div>
          <div className="inline-flex rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] p-1 shadow-sm">
            {[7, 14, 30].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDays(v)}
                className={`h-8 px-3 rounded-full text-xs font-extrabold transition ${days === v ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)]' : 'text-[var(--color-muted)]'}`}
              >
                {v}д
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <TrendStat icon={<Milk size={16} />} label="ср. мляко" value={`${q.data?.summary.avgDailyMl ?? 0} мл`} />
          <TrendStat icon={<Bed size={16} />} label="ср. сън" value={formatDuration(q.data?.summary.avgDailySleepMin ?? 0)} />
          <TrendStat icon={<Droplets size={16} />} label="ср. мокри" value={`${q.data?.summary.avgDailyWet ?? 0}/ден`} />
          <TrendStat icon={<Sparkles size={16} />} label="дни със записи" value={`${q.data?.summary.trackedDays ?? 0}/${days}`} />
        </div>
      </section>

      {q.isLoading ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">Зарежда трендовете…</div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <TrendChart title="Мляко" unit="мл" rows={rows} max={maxMilk} getValue={(r) => r.feedingMl} tone="brand" />
            <TrendChart title="Сън" unit="" rows={rows} max={maxSleep} getValue={(r) => r.sleepMin} formatValue={formatDuration} tone="sleep" />
            <TrendChart title="Памперси" unit="" rows={rows} max={maxDiapers} getValue={(r) => r.wetCount + r.dirtyCount} tone="diaper" />
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
              <h3 className="text-sm font-semibold">Бързи инсайти</h3>
              <span className="text-xs text-[var(--color-muted)]">автоматично</span>
            </div>
            <div className="p-4 grid gap-2">
              {insights.map((text) => (
                <div key={text} className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-ink)]">{text}</div>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-line)]">
              <h3 className="text-sm font-semibold">По дни</h3>
            </div>
            <ul className="divide-y divide-[var(--color-line)]">
              {rows.slice().reverse().map((r) => (
                <li key={r.day} className="px-4 py-3 grid grid-cols-[4.5rem_1fr] sm:grid-cols-[7rem_repeat(4,1fr)] gap-3 items-center text-sm">
                  <div className="font-bold tabular-nums">{formatDay(r.day)}</div>
                  <DayMetric label="мляко" value={`${r.feedingMl} мл`} />
                  <DayMetric label="хранения" value={`${r.feedingCount}`} />
                  <DayMetric label="сън" value={formatDuration(r.sleepMin)} />
                  <DayMetric label="памперси" value={`💧${r.wetCount} 💩${r.dirtyCount}`} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function TrendStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">{icon}{label}</div>
      <div className="mt-1 text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function TrendChart({ title, unit, rows, max, getValue, formatValue, tone }: { title: string; unit: string; rows: TrendDay[]; max: number; getValue: (r: TrendDay) => number; formatValue?: (v: number) => string; tone: 'brand' | 'sleep' | 'diaper' }) {
  const color = tone === 'brand' ? 'bg-[var(--color-brand)]' : tone === 'sleep' ? 'bg-[var(--color-bedtime-fg)]' : 'bg-[var(--color-night-fg)]';
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-[var(--color-muted)]">последни {rows.length} дни</span>
      </div>
      <div className="h-36 flex items-end gap-1.5">
        {rows.map((r) => {
          const value = getValue(r);
          const h = Math.max(4, Math.round((value / max) * 100));
          return (
            <div key={r.day} className="flex-1 min-w-0 flex flex-col items-center gap-1 group">
              <div className="relative w-full flex items-end h-28 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div className={`w-full rounded-full ${color}`} style={{ height: `${h}%` }} title={`${formatDay(r.day)}: ${formatValue ? formatValue(value) : `${value} ${unit}`}`} />
              </div>
              <span className="text-[9px] text-[var(--color-muted)] tabular-nums">{new Date(r.day + 'T00:00:00').getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}

function buildInsights(rows: TrendDay[]) {
  const nonEmpty = rows.filter((r) => r.feedingMl || r.sleepMin || r.wetCount || r.dirtyCount);
  if (!nonEmpty.length) return ['Още няма достатъчно записи за анализ.'];
  const last = rows.at(-1);
  const prev = rows.at(-2);
  const avgMilk = avg(nonEmpty.map((r) => r.feedingMl).filter(Boolean));
  const avgSleep = avg(nonEmpty.map((r) => r.sleepMin).filter(Boolean));
  const out: string[] = [];
  if (last && prev) {
    const milkDiff = last.feedingMl - prev.feedingMl;
    const sleepDiff = last.sleepMin - prev.sleepMin;
    out.push(`Днес млякото е ${diffText(milkDiff, 'мл')} спрямо вчера.`);
    out.push(`Сънят днес е ${diffTextDuration(sleepDiff)} спрямо вчера.`);
  }
  out.push(`Средно за периода: ${avgMilk} мл мляко и ${formatDuration(avgSleep)} сън на ден.`);
  const bestSleep = nonEmpty.reduce((best, r) => r.sleepMin > best.sleepMin ? r : best, nonEmpty[0]);
  if (bestSleep?.sleepMin) out.push(`Най-много сън: ${formatDay(bestSleep.day)} — ${formatDuration(bestSleep.sleepMin)}.`);
  return out;
}

function avg(vals: number[]) {
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

function diffText(value: number, unit: string) {
  if (value === 0) return `без промяна`;
  return value > 0 ? `+${value} ${unit}` : `${value} ${unit}`;
}

function diffTextDuration(value: number) {
  if (value === 0) return 'без промяна';
  return value > 0 ? `+${formatDuration(value)}` : `-${formatDuration(Math.abs(value))}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function formatDay(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' });
}
