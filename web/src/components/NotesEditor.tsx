import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function NotesEditor({ day }: { day: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['note', day], queryFn: () => api.note(day) });
  const [text, setText] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const initialized = useRef<string | null>(null);

  useEffect(() => {
    if (q.data && initialized.current !== day) {
      setText(q.data.note);
      setSavedAt(q.data.updatedAt);
      initialized.current = day;
    }
  }, [q.data, day]);

  useEffect(() => {
    initialized.current = null;
  }, [day]);

  const save = useMutation({
    mutationFn: (note: string) => api.saveNote(day, note),
    onSuccess: (row) => {
      setSavedAt(row.updatedAt);
      qc.invalidateQueries({ queryKey: ['note', day] });
    },
  });

  // debounced autosave
  useEffect(() => {
    if (initialized.current !== day) return;
    if ((q.data?.note ?? '') === text) return;
    const t = setTimeout(() => save.mutate(text), 600);
    return () => clearTimeout(t);
  }, [text, day]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Бележки за деня</h2>
        <span className="text-xs text-[var(--color-muted)]">
          {save.isPending
            ? 'Записва…'
            : savedAt
            ? `Запазено ${new Date(savedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}`
            : 'Автоматично запазване'}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Сън, настроение, аки, повръщане, лекарства, нещо ново…"
        className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-input-bg)] text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)] resize-y"
      />
    </div>
  );
}
