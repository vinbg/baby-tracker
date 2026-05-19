type Props = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  step?: number;
};

const baseInput =
  'h-12 sm:h-10 w-14 sm:w-12 text-center rounded-lg border border-[var(--color-line)] bg-[var(--color-input-bg)] text-lg sm:text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)] appearance-none';

export function TimePicker({ hour, minute, onChange, step = 5 }: Props) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 / step }, (_, i) => i * step);
  const minuteSnap = Math.round(minute / step) * step % 60;

  return (
    <div className="inline-flex items-center gap-1">
      <select
        aria-label="час"
        className={`${baseInput} pr-1`}
        value={hour}
        onChange={(e) => onChange(Number(e.target.value), minute)}
      >
        {hours.map((h) => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span className="text-[var(--color-muted)] font-medium">:</span>
      <select
        aria-label="минути"
        className={`${baseInput} pr-1`}
        value={minuteSnap}
        onChange={(e) => onChange(hour, Number(e.target.value))}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          const now = new Date();
          onChange(now.getHours(), now.getMinutes());
        }}
        className="ml-1 h-12 sm:h-10 px-3 sm:px-2 text-sm sm:text-xs text-[var(--color-brand)] hover:underline"
      >
        сега
      </button>
    </div>
  );
}
