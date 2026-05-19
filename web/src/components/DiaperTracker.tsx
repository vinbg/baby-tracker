import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import { api, type Diaper, type DiaperKind } from '../lib/api';
import { fmtTime } from '../lib/utils';
import { TimePicker } from './TimePicker';

export function DiaperTracker({ day }: { day: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['diapers', day], queryFn: () => api.diapers(day) });
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['diapers', day] });

  const add = useMutation({
    mutationFn: (kind: DiaperKind) =>
      api.addDiaper({ day, kind, loggedAt: nowForDay(day) }),
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteDiaper(id),
    onSuccess: invalidate,
  });

  const { wet, dirty } = useMemo(() => {
    const list = q.data ?? [];
    return {
      wet: list.filter((d) => d.kind === 'wet').length,
      dirty: list.filter((d) => d.kind === 'dirty').length,
    };
  }, [q.data]);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
        <h2 className="text-sm font-semibold">Памперси</h2>
        <span className="text-xs text-[var(--color-muted)] tabular-nums">
          💧 {wet} · 💩 {dirty}
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <DiaperButton
          emoji="💧"
          label="Мокър"
          count={wet}
          color="wet"
          disabled={add.isPending}
          onClick={() => add.mutate('wet')}
        />
        <DiaperButton
          emoji="💩"
          label="Мръсен"
          count={dirty}
          color="dirty"
          disabled={add.isPending}
          onClick={() => add.mutate('dirty')}
        />
      </div>

      {q.data && q.data.length > 0 && (
        <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
          {q.data.map((d) =>
            editingId === d.id ? (
              <EditDiaperRow
                key={d.id}
                day={day}
                diaper={d}
                onClose={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  invalidate();
                }}
              />
            ) : (
              <li key={d.id} className="px-4 py-2.5 flex items-center gap-3 group">
                <span className="text-lg">{d.kind === 'wet' ? '💧' : '💩'}</span>
                <span className="text-sm font-medium flex-1">
                  {d.kind === 'wet' ? 'Мокър' : 'Мръсен'}
                </span>
                <span className="text-sm text-[var(--color-muted)] tabular-nums">
                  {fmtTime(d.loggedAt)}
                </span>
                <div className="flex items-center gap-1 sm:opacity-60 sm:group-hover:opacity-100 transition">
                  <button
                    onClick={() => setEditingId(d.id)}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-2)]"
                    aria-label="редактирай"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Изтриване на записа?')) del.mutate(d.id);
                    }}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-red-600 hover:bg-[var(--color-surface-2)]"
                    aria-label="изтрий"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function DiaperButton({
  emoji,
  label,
  count,
  color,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  color: 'wet' | 'dirty';
  disabled?: boolean;
  onClick: () => void;
}) {
  const tone =
    color === 'wet'
      ? 'bg-[var(--color-night-bg)] text-[var(--color-night-fg)] border-[var(--color-night-bg)]'
      : 'bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)] border-[var(--color-bedtime-bg)]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-20 rounded-2xl border-2 ${tone} font-semibold flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition disabled:opacity-50`}
    >
      <div className="absolute top-2 right-3 text-2xl font-bold tabular-nums opacity-90">
        {count}
      </div>
      <div className="absolute top-2 left-3 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/60">
        <Plus size={14} strokeWidth={3} />
      </div>
      <div className="text-3xl leading-none">{emoji}</div>
      <div className="text-sm">{label}</div>
    </button>
  );
}

function EditDiaperRow({
  day,
  diaper,
  onClose,
  onSaved,
}: {
  day: string;
  diaper: Diaper;
  onClose: () => void;
  onSaved: () => void;
}) {
  const at = new Date(diaper.loggedAt);
  const [hour, setHour] = useState(at.getHours());
  const [minute, setMinute] = useState(at.getMinutes());
  const [kind, setKind] = useState<DiaperKind>(diaper.kind);

  const save = useMutation({
    mutationFn: () => {
      const [y, mo, d] = day.split('-').map(Number);
      const loggedAt = new Date(y, (mo ?? 1) - 1, d ?? 1, hour, minute, 0, 0).toISOString();
      return api.patchDiaper(diaper.id, { loggedAt, kind });
    },
    onSuccess: onSaved,
  });

  return (
    <li className="px-4 py-3 flex items-center gap-2 bg-[var(--color-input-bg)]/40 flex-wrap">
      <div className="inline-flex rounded-lg border border-[var(--color-line)] overflow-hidden">
        <button
          type="button"
          onClick={() => setKind('wet')}
          className={`px-3 h-11 sm:h-9 text-sm font-semibold ${
            kind === 'wet' ? 'bg-[var(--color-night-bg)] text-[var(--color-night-fg)]' : 'text-[var(--color-muted)]'
          }`}
        >
          💧 Мокър
        </button>
        <button
          type="button"
          onClick={() => setKind('dirty')}
          className={`px-3 h-11 sm:h-9 text-sm font-semibold border-l border-[var(--color-line)] ${
            kind === 'dirty' ? 'bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)]' : 'text-[var(--color-muted)]'
          }`}
        >
          💩 Мръсен
        </button>
      </div>
      <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-9 h-9 inline-flex items-center justify-center text-[var(--color-brand)] hover:brightness-110 disabled:opacity-40"
          aria-label="запази"
        >
          <Check size={18} />
        </button>
        <button
          onClick={onClose}
          className="w-9 h-9 inline-flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label="отказ"
        >
          <X size={18} />
        </button>
      </div>
    </li>
  );
}

// If the selected day is today, log "now". Otherwise log at noon of that day —
// the user can always edit the time afterwards.
function nowForDay(day: string): string {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (day === todayKey) return today.toISOString();
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).toISOString();
}
