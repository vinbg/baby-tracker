// HiPP Combiotic Stage 1 — official feeding chart from the box.
// Reference: organicformulashop.com (PDF of HiPP German Stage 1 packaging).
//
// | Age            | Bottles/day | Water (ml) | Scoops |
// |----------------|-------------|------------|--------|
// | 1–2 weeks      | 7–8         | 60         | 2      |
// | 3–4 weeks      | 5–7         | 90         | 3      |
// | 5–8 weeks      | 5–6         | 120        | 4      |
// | 3–4 months     | 5           | 150        | 5      |
// | 5 months       | 4–5         | 180        | 6      |
// | 6 months+      | 4           | 210        | 7      |
//
// We pick the midpoint of "bottles/day" for the default plan; user overrides
// in "Моят план" win for everything that drives suggestions/progress.

export type Recommendation = {
  ageDays: number;
  ageLabel: string;
  perFeedMl: number;
  feedsPerDay: number;
  dailyTotalMl: number;
  intervalHours: number;
  source: string;
  sourceUrl: string;
};

const SOURCE = 'HiPP Combiotic 1 — препоръка от опаковката';
const SOURCE_URL = 'https://organicformulashop.com/pages/pdf-hipp-organic-combiotic-first-infant-milk-german-formula-stage-1';

const TABLE: Array<{ maxDays: number; perFeed: number; feeds: number; intervalH: number; label: string }> = [
  // 1–2 weeks: 60 ml × 7–8 → 7
  { maxDays: 14,  perFeed: 60,  feeds: 7, intervalH: 3,   label: '1–2 седмица' },
  // 3–4 weeks: 90 ml × 5–7 → 6
  { maxDays: 30,  perFeed: 90,  feeds: 6, intervalH: 3.5, label: '3–4 седмица' },
  // 5–8 weeks: 120 ml × 5–6 → 5
  { maxDays: 56,  perFeed: 120, feeds: 5, intervalH: 4,   label: '5–8 седмица' },
  // 3–4 months: 150 ml × 5 (single value on chart)
  { maxDays: 120, perFeed: 150, feeds: 5, intervalH: 4,   label: '3–4 месец' },
  // 5 months: 180 ml × 4–5 → 4
  { maxDays: 150, perFeed: 180, feeds: 4, intervalH: 4.5, label: '5 месец' },
  // 6 months+: 210 ml × 4
  { maxDays: 365, perFeed: 210, feeds: 4, intervalH: 4.5, label: '6+ месец (с твърди храни)' },
];

export function getRecommendation(birthDateISO: string, forDateISO: string): Recommendation {
  const birth = new Date(birthDateISO + 'T00:00:00Z').getTime();
  const at = new Date(forDateISO + 'T00:00:00Z').getTime();
  const ageDays = Math.max(0, Math.floor((at - birth) / 86_400_000));

  const row = TABLE.find((r) => ageDays <= r.maxDays) ?? TABLE[TABLE.length - 1];

  return {
    ageDays,
    ageLabel: row.label,
    perFeedMl: row.perFeed,
    feedsPerDay: row.feeds,
    dailyTotalMl: row.perFeed * row.feeds,
    intervalHours: row.intervalH,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
  };
}

export function ageInDays(birthDateISO: string, atISO: string): number {
  const birth = new Date(birthDateISO + 'T00:00:00Z').getTime();
  const at = new Date(atISO).getTime();
  return Math.max(0, Math.floor((at - birth) / 86_400_000));
}
