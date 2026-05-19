import { useMemo } from 'react';
import { Moon, BedDouble, ArrowRight } from 'lucide-react';
import type { ForecastSlot } from '../lib/api';
import { fmtTime } from '../lib/utils';

type Props = {
  forecast: ForecastSlot[];
  bedtimeFeedTime: string;
  lastFeedTime: string;
  onPickSlot?: (slot: ForecastSlot) => void;
};

export function ForecastList({ forecast, bedtimeFeedTime, lastFeedTime, onPickSlot }: Props) {
  const now = useMemo(() => Date.now(), [forecast]);

  if (forecast.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="text-3xl mb-1">🌙</div>
        <div className="text-sm text-[var(--color-muted)]">
          Дневният план за хранене е изпълнен. Време за сън!
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {forecast.map((slot, idx) => {
        const at = new Date(slot.at);
        const dt = at.getTime() - now;
        const isNext = idx === 0;
        const minsAway = Math.round(dt / 60_000);
        const inLabel = formatRelative(minsAway);

        return (
          <li
            key={slot.at}
            className={`px-4 py-3 flex items-center gap-3 group transition ${
              isNext ? 'bg-[var(--color-brand-soft)]/40' : ''
            } ${onPickSlot ? 'cursor-pointer hover:bg-[var(--color-surface-2)]/60' : ''}`}
            onClick={onPickSlot ? () => onPickSlot(slot) : undefined}
            role={onPickSlot ? 'button' : undefined}
            tabIndex={onPickSlot ? 0 : undefined}
          >
            <div className="w-16 shrink-0">
              <div className="text-base font-semibold tabular-nums">{fmtTime(slot.at)}</div>
              <div className="text-[11px] text-[var(--color-muted)]">{inLabel}</div>
            </div>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div
                className={`px-2.5 py-1 rounded-full text-sm font-semibold tabular-nums ${
                  slot.isDreamFeed
                    ? 'bg-[var(--color-night-bg)] text-[var(--color-night-fg)]'
                    : slot.isBedtimeFeed
                    ? 'bg-[var(--color-bedtime-bg)] text-[var(--color-bedtime-fg)]'
                    : isNext
                    ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)]'
                    : 'bg-[var(--color-input-bg)] text-[var(--color-ink-dim)] border border-[var(--color-line)]'
                }`}
              >
                {slot.amountMl} мл
              </div>
              {slot.isDreamFeed && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-night-fg)]">
                  <Moon size={12} /> нощно (към {lastFeedTime})
                </span>
              )}
              {slot.isBedtimeFeed && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-bedtime-fg)]">
                  <BedDouble size={12} /> преди сън (към {bedtimeFeedTime})
                </span>
              )}
              {isNext && !slot.isDreamFeed && !slot.isBedtimeFeed && (
                <span className="text-[11px] text-[var(--color-muted)]">
                  следващо
                </span>
              )}
            </div>

            {onPickSlot && (
              <ArrowRight
                size={14}
                className="text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatRelative(minsAway: number): string {
  if (minsAway < 0) {
    const m = -minsAway;
    if (m < 60) return `закъснява ${m}мин`;
    return `закъснява ${Math.floor(m / 60)}ч ${m % 60}мин`;
  }
  if (minsAway < 1) return 'сега';
  if (minsAway < 60) return `след ${minsAway}мин`;
  const h = Math.floor(minsAway / 60);
  const m = minsAway % 60;
  return m === 0 ? `след ${h}ч` : `след ${h}ч ${m}мин`;
}
