import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Bed, Check, Clock, Droplets, Milk, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import { api, type Diaper, type DiaperKind, type Feeding, type SleepSession } from '../lib/api';
import { fmtTime, parseTimestamp } from '../lib/utils';
import { ForecastList } from './ForecastList';
import { NotesEditor } from './NotesEditor';
import { TimePicker } from './TimePicker';

type EntryTab = 'feeding' | 'sleep' | 'diaper' | 'note';

type Props = { day: string; onOpenTrends?: () => void };

export function DayView({ day, onOpenTrends }: Props) {
  const [tab, setTab] = useState<EntryTab>('feeding');
  const [feedingPrefill, setFeedingPrefill] = useState<{ key: string; hour: number; minute: number; amount: number } | null>(null);
  const qc = useQueryClient();
  const feedings = useQuery({ queryKey: ['feedings', day], queryFn: () => api.feedings(day) });
  const diapers = useQuery({ queryKey: ['diapers', day], queryFn: () => api.diapers(day) });
  const sleeps = useQuery({ queryKey: ['sleeps', day], queryFn: () => api.sleeps(day) });
  const rec = useQuery({ queryKey: ['rec', day], queryFn: () => api.rec(day) });
  const note = useQuery({ queryKey: ['note', day], queryFn: () => api.note(day) });

  const invalidateDay = () => {
    qc.invalidateQueries({ queryKey: ['feedings', day] });
    qc.invalidateQueries({ queryKey: ['diapers', day] });
    qc.invalidateQueries({ queryKey: ['sleeps', day] });
    qc.invalidateQueries({ queryKey: ['rec', day] });
    qc.invalidateQueries({ queryKey: ['recent-days'] });
  };

  const sleepTotal = useMemo(
    () => (sleeps.data ?? []).reduce((sum, row) => sum + sleepMinutes(row), 0),
    [sleeps.data],
  );
  const wet = (diapers.data ?? []).filter((d) => d.kind === 'wet').length;
  const dirty = (diapers.data ?? []).filter((d) => d.kind === 'dirty').length;
  const next = rec.data?.suggestedNextAt ? fmtTime(rec.data.suggestedNextAt) : '—';

  return (
    <div className="space-y-4 sm:space-y-6">
      <TodayHero
        consumedMl={rec.data?.consumedMl ?? 0}
        dailyTotalMl={rec.data?.plan.dailyTotalMl ?? 0}
        consumedCount={rec.data?.consumedCount ?? 0}
        feedTarget={rec.data?.plan.feedsPerDay ?? 0}
        sleepTotal={sleepTotal}
        wet={wet}
        dirty={dirty}
        nextFeed={next}
        onOpenTrends={onOpenTrends}
      />

      <QuickActions active={tab} onPick={setTab} />

      {tab === 'note' ? (
        <NotesEditor day={day} />
      ) : (
        <EntryPanel
          day={day}
          active={tab}
          suggestedMl={rec.data?.suggestedNextMl ?? rec.data?.plan.perFeedMl ?? 135}
          onDone={invalidateDay}
          feedingPrefill={feedingPrefill}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <DailyTimeline
          day={day}
          feedings={feedings.data ?? []}
          diapers={diapers.data ?? []}
          sleeps={sleeps.data ?? []}
          note={note.data?.note ?? ''}
          loading={feedings.isLoading || diapers.isLoading || sleeps.isLoading}
          onDeleted={invalidateDay}
        />

        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={16} /> Прогноза за хранене</h2>
              <span className="text-xs text-[var(--color-muted)]">{rec.data ? `остават ${rec.data.remainingFeeds}` : ''}</span>
            </div>
            <ForecastList
              forecast={rec.data?.forecast ?? []}
              bedtimeFeedTime={rec.data?.plan.bedtimeFeedTime ?? '22:30'}
              lastFeedTime={rec.data?.plan.lastFeedTime ?? '03:00'}
              onPickSlot={(slot) => {
                const at = parseTimestamp(slot.at);
                setFeedingPrefill({ key: slot.at, hour: at.getHours(), minute: at.getMinutes(), amount: slot.amountMl });
                setTab('feeding');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TodayHero({
  consumedMl,
  dailyTotalMl,
  consumedCount,
  feedTarget,
  sleepTotal,
  wet,
  dirty,
  nextFeed,
  onOpenTrends,
}: {
  consumedMl: number;
  dailyTotalMl: number;
  consumedCount: number;
  feedTarget: number;
  sleepTotal: number;
  wet: number;
  dirty: number;
  nextFeed: string;
  onOpenTrends?: () => void;
}) {
  const pct = dailyTotalMl > 0 ? Math.min(100, Math.round((consumedMl / dailyTotalMl) * 100)) : 0;
  return (
    <section className="rounded-[1.6rem] border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-4 sm:p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">днес</div>
          <h2 className="mt-1 text-lg sm:text-2xl font-bold tracking-tight">Как върви денят</h2>
        </div>
        <div className="rounded-full bg-[var(--color-brand-soft)] px-3 py-2 text-xs sm:text-sm font-bold text-[var(--color-brand-strong)] tabular-nums">
          следв. хранене {nextFeed}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Metric icon={<Milk size={17} />} label="мляко" value={`${consumedMl}`} suffix={dailyTotalMl ? `/${dailyTotalMl} мл` : 'мл'} />
        <Metric icon={<Bed size={17} />} label="сън" value={formatDuration(sleepTotal)} />
        <Metric icon={<Droplets size={17} />} label="памперси" value={`${wet}/${dirty}`} suffix="м/ак" />
      </div>

      <div className="mt-4 h-2.5 rounded-full bg-[var(--color-brand-soft)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--color-brand)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>{consumedCount} / {feedTarget || '—'} хранения</span>
        <span>{pct}%</span>
      </div>
      {onOpenTrends && (
        <button
          type="button"
          onClick={onOpenTrends}
          className="mt-4 w-full h-11 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] text-sm font-extrabold text-[var(--color-brand-strong)] inline-flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <BarChart3 size={16} /> Виж трендове
        </button>
      )}
    </section>
  );
}

function Metric({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 shadow-sm min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1 min-w-0">
        <span className="text-lg sm:text-2xl font-extrabold tabular-nums truncate">{value}</span>
        {suffix && <span className="text-[10px] sm:text-xs text-[var(--color-muted)] truncate">{suffix}</span>}
      </div>
    </div>
  );
}

function QuickActions({ active, onPick }: { active: EntryTab; onPick: (tab: EntryTab) => void }) {
  const items: Array<{ id: EntryTab; label: string; icon: string; className: string }> = [
    { id: 'feeding', label: 'Храна', icon: '🍼', className: 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]' },
    { id: 'sleep', label: 'Сън', icon: '😴', className: 'bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)]' },
    { id: 'diaper', label: 'Памперси', icon: '💧', className: 'bg-[var(--color-night-bg)] text-[var(--color-night-fg)]' },
    { id: 'note', label: 'Бележка', icon: '📝', className: 'bg-[var(--color-good)] text-[var(--color-ink)]' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item.id)}
          className={`min-h-16 sm:min-h-20 rounded-2xl border font-bold active:scale-[0.98] transition shadow-sm ${item.className} ${active === item.id ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20' : 'border-transparent'}`}
        >
          <span className="block text-2xl sm:text-3xl leading-none mb-1">{item.icon}</span>
          <span className="text-xs sm:text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function EntryPanel({
  day,
  active,
  suggestedMl,
  onDone,
  feedingPrefill,
}: {
  day: string;
  active: EntryTab;
  suggestedMl: number;
  onDone: () => void;
  feedingPrefill: { key: string; hour: number; minute: number; amount: number } | null;
}) {
  return (
    <section className="rounded-[1.6rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] font-semibold">бързо добавяне</div>
          <h2 className="text-sm font-extrabold">{entryTitle(active)}</h2>
        </div>
        <div className="text-xs text-[var(--color-muted)]">избери от бутоните горе</div>
      </div>

      {active === 'feeding' && <FeedingEntry day={day} suggestedMl={suggestedMl} prefill={feedingPrefill} onDone={onDone} />}
      {active === 'sleep' && <SleepEntry day={day} onDone={onDone} />}
      {active === 'diaper' && <DiaperEntry day={day} onDone={onDone} />}

    </section>
  );
}


function entryTitle(active: EntryTab) {
  if (active === 'feeding') return 'Ново хранене';
  if (active === 'sleep') return 'Нов сън';
  if (active === 'diaper') return 'Нов памперс';
  return 'Бележка за деня';
}

function FeedingEntry({ day, suggestedMl, prefill, onDone }: { day: string; suggestedMl: number; prefill: { key: string; hour: number; minute: number; amount: number } | null; onDone: () => void }) {
  const qc = useQueryClient();
  const now = new Date();
  const [amount, setAmount] = useState(String(suggestedMl || 135));
  const [duration, setDuration] = useState('');
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());

  useEffect(() => {
    if (!prefill) return;
    setHour(prefill.hour);
    setMinute(prefill.minute);
    setAmount(String(prefill.amount));
  }, [prefill]);

  const add = useMutation({
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
      setDuration('');
      qc.invalidateQueries({ queryKey: ['feedings', day] });
      qc.invalidateQueries({ queryKey: ['rec', day] });
      qc.invalidateQueries({ queryKey: ['recent-days'] });
      onDone();
    },
  });

  const values = Array.from(new Set([60, 90, 120, 135, 150, 180, 210, suggestedMl].filter(Boolean))).sort((a, b) => a - b);
  const valid = Number(amount) > 0 && Number(amount) <= 500;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) add.mutate(); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
        <Field label="Количество"><NumberInput value={amount} onChange={setAmount} suffix="мл" placeholder="135" /></Field>
        <Field label="Час"><TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} /></Field>
        <Field label="Времетраене (опц.)"><NumberInput value={duration} onChange={setDuration} suffix="мин" placeholder="—" /></Field>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {values.map((v) => <Chip key={v} active={Number(amount) === v} onClick={() => setAmount(String(v))}>{v} мл</Chip>)}
      </div>
      <button type="submit" disabled={!valid || add.isPending} className="w-full h-13 rounded-2xl bg-[var(--color-brand)] text-[var(--color-on-brand)] font-extrabold disabled:opacity-50 active:scale-[0.98] transition">
        {add.isPending ? 'Записва…' : 'Запиши хранене'}
      </button>
    </form>
  );
}

function SleepEntry({ day, onDone }: { day: string; onDone: () => void }) {
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMinute, setEndMinute] = useState(0);
  const [error, setError] = useState('');

  const add = useMutation({
    mutationFn: () => {
      setError('');
      const startAt = dateFor(day, startHour, startMinute);
      const endAt = dateFor(day, endHour, endMinute);
      if (endAt.getTime() <= startAt.getTime()) endAt.setDate(endAt.getDate() + 1);
      return api.addSleep({ day, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    },
    onSuccess: () => {
      onDone();
      const nextStart = dateFor(day, endHour, endMinute);
      const nextEnd = new Date(nextStart.getTime() + 60 * 60_000);
      setStartHour(nextStart.getHours()); setStartMinute(nextStart.getMinutes());
      setEndHour(nextEnd.getHours()); setEndMinute(nextEnd.getMinutes());
    },
    onError: () => setError('Неуспешно добавяне на сън.'),
  });

  const crossesMidnight = dateFor(day, endHour, endMinute).getTime() <= dateFor(day, startHour, startMinute).getTime();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TimePicker hour={startHour} minute={startMinute} onChange={(h, m) => { setStartHour(h); setStartMinute(m); }} compact showNow={false} />
        <span className="text-xs text-[var(--color-muted)] font-bold">→</span><TimePicker hour={endHour} minute={endMinute} onChange={(h, m) => { setEndHour(h); setEndMinute(m); }} compact showNow={false} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {crossesMidnight && <p className="text-xs text-[var(--color-muted)]">Краят е преди началото, затова ще се запише като сън през нощта до следващия ден.</p>}
      <button type="button" onClick={() => add.mutate()} disabled={add.isPending} className="w-full h-13 rounded-2xl bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)] font-extrabold disabled:opacity-50 active:scale-[0.98] transition">
        {add.isPending ? 'Записва…' : 'Добави сън'}
      </button>
    </div>
  );
}

function DiaperEntry({ day, onDone }: { day: string; onDone: () => void }) {
  const now = new Date();
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());

  const add = useMutation({
    mutationFn: (kind: DiaperKind) => api.addDiaper({ day, kind, loggedAt: isoFromDayAndTime(day, hour, minute) }),
    onSuccess: onDone,
  });

  return (
    <div className="space-y-3">
      <Field label="Час">
        <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => add.mutate('wet')} disabled={add.isPending} className="h-20 rounded-2xl bg-[var(--color-night-bg)] text-[var(--color-night-fg)] font-extrabold active:scale-[0.98] transition disabled:opacity-50">
          <span className="block text-3xl">💧</span> Мокър
        </button>
        <button type="button" onClick={() => add.mutate('dirty')} disabled={add.isPending} className="h-20 rounded-2xl bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)] font-extrabold active:scale-[0.98] transition disabled:opacity-50">
          <span className="block text-3xl">💩</span> Мръсен
        </button>
      </div>
    </div>
  );
}

function DailyTimeline({ day, feedings, diapers, sleeps, note, loading, onDeleted }: { day: string; feedings: Feeding[]; diapers: Diaper[]; sleeps: SleepSession[]; note: string; loading: boolean; onDeleted: () => void }) {
  const [editing, setEditing] = useState<{ type: 'feeding' | 'sleep' | 'diaper'; id: number } | null>(null);
  const items = useMemo(() => {
    const rows: TimelineItem[] = [
      ...feedings.map((f) => ({ type: 'feeding' as const, id: f.id, at: f.fedAt, title: 'Хранене', subtitle: f.durationMin ? `${f.durationMin} мин` : 'без времетраене', badge: `${f.amountMl} мл`, icon: '🍼' })),
      ...sleeps.map((s) => ({ type: 'sleep' as const, id: s.id, at: s.startAt, title: 'Сън', subtitle: `${fmtTime(s.startAt)} — ${s.endAt ? fmtTime(s.endAt) : '—'}`, badge: formatDuration(sleepMinutes(s)), icon: '😴' })),
      ...diapers.map((d) => ({ type: 'diaper' as const, id: d.id, at: d.loggedAt, title: 'Памперс', subtitle: d.kind === 'wet' ? 'мокър' : 'мръсен', badge: d.kind === 'wet' ? '💧' : '💩', icon: d.kind === 'wet' ? '💧' : '💩', kind: d.kind })),
    ];
    if (note.trim()) rows.push({ type: 'note' as const, id: 0, at: `${day}T12:00:00`, title: 'Бележка', subtitle: note.trim(), badge: '📝', icon: '📝' });
    return rows.sort((a, b) => parseTimestamp(b.at).getTime() - parseTimestamp(a.at).getTime());
  }, [day, feedings, diapers, sleeps, note]);

  const delFeeding = useMutation({ mutationFn: (id: number) => api.deleteFeeding(id), onSuccess: onDeleted });
  const delSleep = useMutation({ mutationFn: (id: number) => api.deleteSleep(id), onSuccess: onDeleted });
  const delDiaper = useMutation({ mutationFn: (id: number) => api.deleteDiaper(id), onSuccess: onDeleted });

  const deleteItem = (item: TimelineItem) => {
    if (item.type === 'note') return;
    if (!confirm('Изтриване на записа?')) return;
    if (item.type === 'feeding') delFeeding.mutate(item.id);
    if (item.type === 'sleep') delSleep.mutate(item.id);
    if (item.type === 'diaper') delDiaper.mutate(item.id);
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Clock size={16} /> Записи за деня</h2>
        <span className="text-xs text-[var(--color-muted)]">най-новите отгоре</span>
      </div>
      {loading ? (
        <div className="px-4 py-8 text-sm text-[var(--color-muted)]">Зарежда…</div>
      ) : items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="text-3xl mb-1">👶</div>
          <div className="text-sm text-[var(--color-muted)]">Още няма записи за този ден.</div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {items.map((item) => {
            if (editing?.id === item.id && editing.type === item.type) {
              if (item.type === 'feeding') {
                const feeding = feedings.find((f) => f.id === item.id);
                if (feeding) return (
                  <EditFeedingTimelineRow
                    key={`${item.type}-${item.id}`}
                    day={day}
                    feeding={feeding}
                    onCancel={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onDeleted(); }}
                  />
                );
              }
              if (item.type === 'sleep') {
                const sleep = sleeps.find((s) => s.id === item.id);
                if (sleep) return (
                  <EditSleepTimelineRow
                    key={`${item.type}-${item.id}`}
                    day={day}
                    sleep={sleep}
                    onCancel={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onDeleted(); }}
                  />
                );
              }
              if (item.type === 'diaper') {
                const diaper = diapers.find((d) => d.id === item.id);
                if (diaper) return (
                  <EditDiaperTimelineRow
                    key={`${item.type}-${item.id}`}
                    day={day}
                    diaper={diaper}
                    onCancel={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onDeleted(); }}
                  />
                );
              }
            }
            return (
              <li key={`${item.type}-${item.id}`} className="px-4 py-3 flex items-center gap-3 group">
                <div className="w-12 shrink-0 text-sm font-extrabold tabular-nums">{fmtTime(item.at)}</div>
                <div className="w-9 h-9 shrink-0 rounded-2xl bg-[var(--color-surface-2)] grid place-items-center text-lg">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{item.title}</div>
                  <div className="text-xs text-[var(--color-muted)] truncate">{item.subtitle}</div>
                </div>
                <div className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--color-brand-strong)] tabular-nums">{item.badge}</div>
                {item.type !== 'note' && (
                  <button type="button" onClick={() => setEditing({ type: item.type as 'feeding' | 'sleep' | 'diaper', id: item.id })} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-2)] transition" aria-label="редактирай">
                    <Pencil size={15} />
                  </button>
                )}
                {item.type !== 'note' && (
                  <button type="button" onClick={() => deleteItem(item)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-red-600 hover:bg-[var(--color-surface-2)] transition" aria-label="изтрий">
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}



function EditFeedingTimelineRow({
  day,
  feeding,
  onCancel,
  onSaved,
}: {
  day: string;
  feeding: Feeding;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const at = parseTimestamp(feeding.fedAt);
  const [hour, setHour] = useState(at.getHours());
  const [minute, setMinute] = useState(at.getMinutes());
  const [amount, setAmount] = useState(String(feeding.amountMl));
  const [duration, setDuration] = useState(feeding.durationMin != null ? String(feeding.durationMin) : '');

  const save = useMutation({
    mutationFn: () => {
      const dn = Number(duration);
      return api.patchFeeding(feeding.id, {
        day,
        fedAt: isoFromDayAndTime(day, hour, minute),
        amountMl: Number(amount),
        durationMin: duration === '' ? null : Number.isFinite(dn) && dn > 0 ? Math.round(dn) : null,
      });
    },
    onSuccess: onSaved,
  });

  const valid = Number(amount) > 0 && Number(amount) <= 500;

  return (
    <li className="px-3 py-2 bg-[var(--color-input-bg)]/40">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <InlineNumber value={amount} onChange={setAmount} suffix="мл" placeholder="135" className="w-[4.75rem]" />
        <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} compact showNow={false} />
        <InlineNumber value={duration} onChange={setDuration} suffix="м" placeholder="—" className="w-[4.25rem]" />
        <EditActions onSave={() => valid && save.mutate()} onCancel={onCancel} disabled={!valid || save.isPending} />
      </div>
    </li>
  );
}

function EditSleepTimelineRow({
  day,
  sleep,
  onCancel,
  onSaved,
}: {
  day: string;
  sleep: SleepSession;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const start = parseTimestamp(sleep.startAt);
  const end = sleep.endAt ? parseTimestamp(sleep.endAt) : new Date(start.getTime() + 60 * 60_000);
  const [startHour, setStartHour] = useState(start.getHours());
  const [startMinute, setStartMinute] = useState(start.getMinutes());
  const [endHour, setEndHour] = useState(end.getHours());
  const [endMinute, setEndMinute] = useState(end.getMinutes());

  const save = useMutation({
    mutationFn: () => {
      const startAt = dateFor(day, startHour, startMinute);
      const endAt = dateFor(day, endHour, endMinute);
      if (endAt.getTime() <= startAt.getTime()) endAt.setDate(endAt.getDate() + 1);
      return api.patchSleep(sleep.id, { day, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    },
    onSuccess: onSaved,
  });

  const crossesMidnight = dateFor(day, endHour, endMinute).getTime() <= dateFor(day, startHour, startMinute).getTime();

  return (
    <li className="px-3 py-2 bg-[var(--color-input-bg)]/40">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <TimePicker hour={startHour} minute={startMinute} onChange={(h, m) => { setStartHour(h); setStartMinute(m); }} compact showNow={false} />
        <span className="text-xs text-[var(--color-muted)] font-bold">→</span><TimePicker hour={endHour} minute={endMinute} onChange={(h, m) => { setEndHour(h); setEndMinute(m); }} compact showNow={false} />
        <EditActions onSave={() => save.mutate()} onCancel={onCancel} disabled={save.isPending} />
      </div>
    </li>
  );
}

function EditDiaperTimelineRow({
  day,
  diaper,
  onCancel,
  onSaved,
}: {
  day: string;
  diaper: Diaper;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const at = parseTimestamp(diaper.loggedAt);
  const [hour, setHour] = useState(at.getHours());
  const [minute, setMinute] = useState(at.getMinutes());
  const [kind, setKind] = useState<DiaperKind>(diaper.kind);

  const save = useMutation({
    mutationFn: () => api.patchDiaper(diaper.id, {
      day,
      loggedAt: isoFromDayAndTime(day, hour, minute),
      kind,
    }),
    onSuccess: onSaved,
  });

  return (
    <li className="px-3 py-2 bg-[var(--color-input-bg)]/40">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex rounded-xl border border-[var(--color-line)] overflow-hidden">
          <button
            type="button"
            onClick={() => setKind('wet')}
            className={`px-2.5 h-10 text-xs font-extrabold ${kind === 'wet' ? 'bg-[var(--color-night-bg)] text-[var(--color-night-fg)]' : 'text-[var(--color-muted)] bg-[var(--color-surface)]'}`}
          >
            💧 Мокър
          </button>
          <button
            type="button"
            onClick={() => setKind('dirty')}
            className={`px-2.5 h-10 text-xs font-extrabold border-l border-[var(--color-line)] ${kind === 'dirty' ? 'bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)]' : 'text-[var(--color-muted)] bg-[var(--color-surface)]'}`}
          >
            💩 Мръсен
          </button>
        </div>
        <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} compact showNow={false} />
        <EditActions onSave={() => save.mutate()} onCancel={onCancel} disabled={save.isPending} />
      </div>
    </li>
  );
}


function EditActions({ onSave, onCancel, disabled }: { onSave: () => void; onCancel: () => void; disabled?: boolean }) {
  return (
    <div className="ml-auto shrink-0 flex items-center gap-0.5">
      <button type="button" onClick={onSave} disabled={disabled} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[var(--color-brand)] hover:bg-[var(--color-surface-2)] disabled:opacity-50" aria-label="запази">
        <Check size={15} />
      </button>
      <button type="button" onClick={onCancel} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]" aria-label="отказ">
        <X size={15} />
      </button>
    </div>
  );
}

type TimelineItem = {
  type: 'feeding' | 'sleep' | 'diaper' | 'note';
  id: number;
  at: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  kind?: DiaperKind;
};

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-input-bg)]/40 p-3 space-y-2">
      <span className="block text-xs font-bold text-[var(--color-muted)]">{label}</span>
      {children}
    </label>
  );
}


function InlineNumber({ value, onChange, suffix, placeholder, className = '' }: { value: string; onChange: (v: string) => void; suffix: string; placeholder: string; className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-2 pr-6 text-center text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)]"
      />
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-muted)]">{suffix}</span>
    </div>
  );
}

function NumberInput({ value, onChange, suffix, placeholder }: { value: string; onChange: (v: string) => void; suffix: string; placeholder: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 pr-11 text-center text-lg font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)]"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">{suffix}</span>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`h-9 px-3 rounded-full border text-sm font-bold whitespace-nowrap ${active ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)] border-[var(--color-brand)]' : 'bg-[var(--color-input-bg)] text-[var(--color-ink-dim)] border-[var(--color-line)]'}`}>
      {children}
    </button>
  );
}

function sleepMinutes(item: SleepSession) {
  if (!item.endAt) return 0;
  return Math.max(0, Math.round((parseTimestamp(item.endAt).getTime() - parseTimestamp(item.startAt).getTime()) / 60_000));
}

function formatDuration(minutes: number) {
  return `${(minutes / 60).toFixed(2)}ч`;
}

function isoFromDayAndTime(day: string, hour: number, minute: number): string {
  return dateFor(day, hour, minute).toISOString();
}

function dateFor(day: string, hour: number, minute: number) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
}

function nowForDay(day: string): string {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (day === todayKey) return today.toISOString();
  return dateFor(day, 12, 0).toISOString();
}
