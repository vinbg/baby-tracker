import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, X } from 'lucide-react';
import { api } from '../lib/api';
import { fmtTime } from '../lib/utils';

export function RecommendationsCard({ day }: { day: string }) {
  const q = useQuery({ queryKey: ['rec', day], queryFn: () => api.rec(day) });
  if (!q.data) return null;
  const r = q.data;
  const pct = Math.min(100, Math.round((r.consumedMl / Math.max(1, r.plan.dailyTotalMl)) * 100));
  const next = r.suggestedNextAt ? new Date(r.suggestedNextAt) : null;
  const nextLabel = next ? fmtTime(next.toISOString()) : '—';

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">препоръка от HiPP Combiotic 1</div>
        <div className="text-sm font-medium mt-0.5">{r.recommendation.ageLabel}</div>
        <div className="text-xs text-[var(--color-muted)]">
          {r.recommendation.feedsPerDay} × {r.recommendation.perFeedMl} мл · ~{r.recommendation.intervalHours}ч интервал
        </div>
        <a
          href={r.recommendation.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-brand)] underline underline-offset-2"
        >
          източник: опаковка HiPP Combiotic 1
        </a>
      </div>

      <PlanEditor
        rec={{ feeds: r.recommendation.feedsPerDay, perFeed: r.recommendation.perFeedMl, intervalH: r.recommendation.intervalHours }}
        plan={r.plan}
      />

      <div>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-semibold tabular-nums">{r.consumedMl}</span>
            <span className="text-sm text-[var(--color-muted)]"> / {r.plan.dailyTotalMl} мл</span>
          </div>
          <span className="text-xs text-[var(--color-muted)]">{pct}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[var(--color-brand-soft)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-brand)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-[var(--color-muted)]">
          <span>{r.consumedCount} / {r.plan.feedsPerDay} хранения</span>
          <span>остават {r.remainingMl} мл</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-line)]">
        <Stat label="следваща доза" value={r.suggestedNextMl > 0 ? `${r.suggestedNextMl} мл` : '✓'} />
        <Stat label="следващ час" value={nextLabel} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

type PlanEditorProps = {
  rec: { feeds: number; perFeed: number; intervalH: number };
  plan: { feedsPerDay: number; perFeedMl: number; intervalHours: number; usingOverride: boolean };
};

function PlanEditor({ rec, plan }: PlanEditorProps) {
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: api.settings });
  const [feeds, setFeeds] = useState<string>('');
  const [perFeed, setPerFeed] = useState<string>('');
  const [interval, setIntervalH] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [bedtimeFeedTime, setBedtimeFeedTime] = useState<string>('');
  const [lastFeedTime, setLastFeedTime] = useState<string>('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!settingsQ.data) return;
    setFeeds(settingsQ.data.targetFeedsPerDay?.toString() ?? '');
    setPerFeed(settingsQ.data.targetPerFeedMl?.toString() ?? '');
    setIntervalH(settingsQ.data.intervalHours?.toString() ?? '');
    setWakeTime(settingsQ.data.wakeTime ?? '');
    setBedtimeFeedTime(settingsQ.data.bedtimeFeedTime ?? '');
    setLastFeedTime(settingsQ.data.lastFeedTime ?? '');
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: (vals: {
      targetFeedsPerDay: number | null;
      targetPerFeedMl: number | null;
      intervalHours: number | null;
      wakeTime: string | null;
      bedtimeFeedTime: string | null;
      lastFeedTime: string | null;
    }) => api.saveSettings(vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['rec'] });
    },
  });

  const apply = () => {
    save.mutate({
      targetFeedsPerDay: numOrNull(feeds),
      targetPerFeedMl: numOrNull(perFeed),
      intervalHours: numOrNull(interval),
      wakeTime: wakeTime || null,
      bedtimeFeedTime: bedtimeFeedTime || null,
      lastFeedTime: lastFeedTime || null,
    });
  };

  const reset = () => {
    setFeeds(''); setPerFeed(''); setIntervalH(''); setWakeTime(''); setBedtimeFeedTime(''); setLastFeedTime('');
    save.mutate({
      targetFeedsPerDay: null,
      targetPerFeedMl: null,
      intervalHours: null,
      wakeTime: null,
      bedtimeFeedTime: null,
      lastFeedTime: null,
    });
  };

  return (
    <div className="rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'затвори' : 'редактирай моя план'}
        className="w-full flex items-center justify-between gap-3 text-left group"
      >
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)] flex items-center gap-2">
            моят план
            {plan.usingOverride && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-ink)] uppercase font-semibold">активен</span>
            )}
          </div>
          <div className="text-sm font-semibold mt-0.5 text-[var(--color-ink)]">
            {plan.feedsPerDay} × {plan.perFeedMl} мл · ~{plan.intervalHours}ч интервал
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition"
        >
          {open ? <X size={16} strokeWidth={2.5} /> : <Pencil size={15} strokeWidth={2.25} />}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Хранения" suffix="/ден" value={feeds} onChange={setFeeds} placeholder={String(rec.feeds)} />
            <Field label="Количество" suffix="мл" value={perFeed} onChange={setPerFeed} placeholder={String(rec.perFeed)} />
            <Field label="Интервал" suffix="ч" value={interval} onChange={setIntervalH} placeholder={String(rec.intervalH)} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--color-line)]">
            <TimeField label="Събуждане" value={wakeTime} onChange={setWakeTime} placeholder="07:00" />
            <TimeField label="Преди сън" value={bedtimeFeedTime} onChange={setBedtimeFeedTime} placeholder="22:30" />
            <TimeField label="Нощно" value={lastFeedTime} onChange={setLastFeedTime} placeholder="03:00" />
          </div>
          <p className="text-[10px] text-[var(--color-muted)]">
            „Преди сън" — последното хранене преди лягане (леко по-голяма доза). „Нощно" — реалното събуждане през нощта (най-голяма доза). Ако „Нощно" е след полунощ, се брои за следващия ден.
          </p>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              върни към препоръката
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={save.isPending}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-brand)] text-[var(--color-on-brand)] font-semibold disabled:opacity-50 hover:brightness-110 transition"
            >
              {save.isPending ? 'Записва…' : 'Запази'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1 truncate">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-2 rounded-md border border-[var(--color-line)] bg-[var(--color-input-bg)] text-base font-semibold tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/50 focus:border-[var(--color-brand)]"
      />
    </label>
  );
}

function Field({ label, suffix, value, onChange, placeholder }: { label: string; suffix: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1 truncate">
        {label} <span className="opacity-60 normal-case">{suffix}</span>
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-2.5 rounded-md border border-[var(--color-line)] bg-[var(--color-input-bg)] text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/50 focus:border-[var(--color-brand)]"
      />
    </label>
  );
}

function numOrNull(v: string): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
