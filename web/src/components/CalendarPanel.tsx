import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { bg } from 'date-fns/locale';

type Props = {
  selected: Date;
  onSelect: (d: Date | undefined) => void;
  daysWithData: string[];
  birthDate?: string;
};

export function CalendarPanel({ selected, onSelect, daysWithData, birthDate }: Props) {
  const dataSet = new Set(daysWithData);
  const matchHasData = (d: Date) => {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dataSet.has(k);
  };
  const minDate = birthDate ? new Date(birthDate + 'T00:00:00') : undefined;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)]">
      <DayPicker
        animate
        mode="single"
        locale={bg}
        weekStartsOn={1}
        selected={selected}
        onSelect={onSelect}
        startMonth={minDate}
        disabled={minDate ? { before: minDate } : undefined}
        modifiers={{ hasData: matchHasData }}
        modifiersClassNames={{ hasData: 'rdp-day-has-data' }}
      />
      <div className="px-2 pt-2 pb-1 flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
        ден с записи
      </div>
    </div>
  );
}
