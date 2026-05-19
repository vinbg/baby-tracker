import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ForecastSlot } from '../lib/api';
import { api } from '../lib/api';
import { FeedingList } from './FeedingList';
import { AddFeedingForm, type Prefill } from './AddFeedingForm';
import { ForecastList } from './ForecastList';
import { NotesEditor } from './NotesEditor';
import { DiaperTracker } from './DiaperTracker';
import { SleepTracker } from './SleepTracker';

export function DayView({ day }: { day: string }) {
  const feedings = useQuery({ queryKey: ['feedings', day], queryFn: () => api.feedings(day) });
  const rec = useQuery({ queryKey: ['rec', day], queryFn: () => api.rec(day) });
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  const pickFromForecast = (slot: ForecastSlot) => {
    const at = new Date(slot.at);
    setPrefill({
      key: slot.at,
      hour: at.getHours(),
      minute: at.getMinutes(),
      amount: slot.amountMl,
    });
  };

  return (
    <div className="space-y-6">
      <AddFeedingForm
        day={day}
        suggestedMl={rec.data?.suggestedNextMl ?? 0}
        prefill={prefill}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT: eaten today */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Изядено днес</h2>
            <span className="text-xs text-[var(--color-muted)]">
              {rec.data ? `${rec.data.consumedMl} / ${rec.data.plan.dailyTotalMl} мл` : ''}
            </span>
          </div>
          <FeedingList day={day} feedings={feedings.data ?? []} loading={feedings.isLoading} />
        </div>

        {/* RIGHT: forecast for the rest of the day */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Прогноза за деня</h2>
            <span className="text-xs text-[var(--color-muted)]">
              {rec.data ? `остават ${rec.data.remainingFeeds}` : ''}
            </span>
          </div>
          <ForecastList
            forecast={rec.data?.forecast ?? []}
            bedtimeFeedTime={rec.data?.plan.bedtimeFeedTime ?? '22:30'}
            lastFeedTime={rec.data?.plan.lastFeedTime ?? '03:00'}
            onPickSlot={pickFromForecast}
          />
          <p className="px-4 py-2 text-[11px] text-[var(--color-muted)] border-t border-[var(--color-line)]">
            Кликни ред, за да го запишеш — формата отгоре се попълва с часа и количеството.
          </p>
        </div>
      </div>

      <SleepTracker day={day} />

      <DiaperTracker day={day} />

      <NotesEditor day={day} />
    </div>
  );
}
