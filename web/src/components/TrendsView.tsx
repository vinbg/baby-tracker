import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Bed, ChevronLeft, ChevronRight, Droplets, Milk, Sparkles } from 'lucide-react';
import { api, type TrendDay } from '../lib/api';

export function TrendsView({ onBack }: { onBack?: () => void }) {
  const [days, setDays] = useState(14);
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['trends', days], queryFn: () => api.trends(days) });
  const rows = q.data?.rows ?? [];
  const maxMilk = Math.max(1, ...rows.map((r) => r.feedingMl));
  const maxSleep = Math.max(1, ...rows.map((r) => r.sleepMin));
  const maxDiapers = Math.max(1, ...rows.map((r) => r.wetCount + r.dirtyCount));
  const insights = useMemo(() => buildInsights(rows), [rows]);
  const dayRows = useMemo(() => rows.slice().reverse(), [rows]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(dayRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = dayRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [days]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[1.6rem] border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-4 sm:p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mt-1 shrink-0 w-10 h-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] inline-flex items-center justify-center text-[var(--color-ink-dim)] hover:text-[var(--color-brand)] transition"
                aria-label="Назад към деня"
              >
                <ArrowLeft size={18} />
              </button>
            )}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">анализ</div>
            <h2 className="mt-1 text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 size={22} /> Трендове
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Мляко, сън и памперси за последните дни.</p>
          </div>
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
          <TrendStat icon={<Bed size={16} />} label="ср. сън" value={formatSleepHours(q.data?.summary.avgDailySleepMin ?? 0)} />
          <TrendStat icon={<Droplets size={16} />} label="мокри / мръсни" value={`${q.data?.summary.avgDailyWet ?? 0} / ${q.data?.summary.avgDailyDirty ?? 0}`} />
          <TrendStat icon={<Sparkles size={16} />} label="дни със записи" value={`${q.data?.summary.trackedDays ?? 0}/${days}`} />
        </div>
      </section>

      {q.isLoading ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">Зарежда трендовете…</div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <TrendChart title="Мляко" unit="мл" rows={rows} max={maxMilk} getValue={(r) => r.feedingMl} tone="brand" />
            <TrendChart title="Сън" unit="" rows={rows} max={maxSleep} getValue={(r) => r.sleepMin} formatValue={formatSleepHours} tone="sleep" />
            <DiaperTrendChart rows={rows} max={maxDiapers} />
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
            <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">По дни</h3>
                <p className="text-xs text-[var(--color-muted)]">10 записа на страница</p>
              </div>
              <span className="text-xs text-[var(--color-muted)] tabular-nums">
                {dayRows.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, dayRows.length)} / ${dayRows.length}` : '0 / 0'}
              </span>
            </div>
            <ul className="divide-y divide-[var(--color-line)]">
              {pagedRows.map((r) => (
                <li key={r.day} className="px-4 py-3 grid grid-cols-[4.5rem_1fr] sm:grid-cols-[7rem_repeat(4,1fr)] gap-3 items-center text-sm">
                  <div className="font-bold tabular-nums">{formatDay(r.day)}</div>
                  <DayMetric label="мляко" value={`${r.feedingMl} мл`} />
                  <DayMetric label="хранения" value={`${r.feedingCount}`} />
                  <DayMetric label="сън" value={formatSleepHours(r.sleepMin)} />
                  <DayMetric label="мокри / мръсни" value={`${r.wetCount} / ${r.dirtyCount}`} />
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[var(--color-line)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-10 px-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-ink-dim)] inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:text-[var(--color-brand)] hover:border-[var(--color-brand)] transition"
                >
                  <ChevronLeft size={16} /> Назад
                </button>
                <div className="text-sm font-extrabold tabular-nums">
                  {currentPage} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-10 px-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-ink-dim)] inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:text-[var(--color-brand)] hover:border-[var(--color-brand)] transition"
                >
                  Напред <ChevronRight size={16} />
                </button>
              </div>
            )}
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


function DiaperTrendChart({ rows, max }: { rows: TrendDay[]; max: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Памперси</h3>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
            <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-night-fg)]" /> мокри</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--color-bedtime-fg)]" /> мръсни</span>
          </div>
        </div>
        <span className="text-xs text-[var(--color-muted)]">последни {rows.length} дни</span>
      </div>
      <div className="h-36 flex items-end gap-1.5">
        {rows.map((r) => {
          const total = r.wetCount + r.dirtyCount;
          const h = Math.max(4, Math.round((total / max) * 100));
          const wetPct = total ? Math.round((r.wetCount / total) * 100) : 0;
          const dirtyPct = total ? 100 - wetPct : 0;
          return (
            <div key={r.day} className="flex-1 min-w-0 flex flex-col items-center gap-1">
              <div className="relative w-full flex items-end h-28 rounded-full bg-[var(--color-surface-2)] overflow-hidden" title={`${formatDay(r.day)}: мокри ${r.wetCount}, мръсни ${r.dirtyCount}`}>
                <div className="w-full rounded-full overflow-hidden flex flex-col-reverse" style={{ height: `${h}%` }}>
                  <div className="w-full bg-[var(--color-night-fg)]" style={{ height: `${wetPct}%` }} />
                  <div className="w-full bg-[var(--color-bedtime-fg)]" style={{ height: `${dirtyPct}%` }} />
                </div>
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
    out.push(`Днес млякото е ${last.feedingMl} мл (${diffText(milkDiff, 'мл')} спрямо вчера: ${prev.feedingMl} мл).`);
    out.push(`Сънят днес е ${formatSleepHours(last.sleepMin)} (${diffTextDuration(sleepDiff)} спрямо вчера: ${formatSleepHours(prev.sleepMin)}).`);
    out.push(`Памперси днес: мокри ${last.wetCount}, мръсни ${last.dirtyCount} (вчера: мокри ${prev.wetCount}, мръсни ${prev.dirtyCount}).`);
  }
  out.push(`Средно за периода: ${avgMilk} мл мляко и ${formatSleepHours(avgSleep)} сън на ден.`);
  const bestSleep = nonEmpty.reduce((best, r) => r.sleepMin > best.sleepMin ? r : best, nonEmpty[0]);
  if (bestSleep?.sleepMin) out.push(`Най-много сън: ${formatDay(bestSleep.day)} — ${formatSleepHours(bestSleep.sleepMin)}.`);
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
  return value > 0 ? `+${formatSleepHours(value)}` : `-${formatSleepHours(Math.abs(value))}`;
}

function formatSleepHours(minutes: number) {
  return `${(minutes / 60).toFixed(2)}ч`;
}

function formatDay(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' });
}
