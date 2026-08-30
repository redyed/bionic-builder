/**
 * /now ledger entry rules — every future author, including the org:
 * - Real shipped things only
 * - Counts, durations, costs, URLs
 * - No estimates, no projections, no vanity adjectives
 * - Every line founder-approved before deploy
 */

export interface NowEntry {
  id: string;
  weekOf: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
}

export const nowEntries: NowEntry[] = [
  {
    id: "2026-w35",
    weekOf: "AUG 24–30, 2026",
    subtitle: "the week the shop opened",
    rows: [
      { label: "Brand system — voice, color, type, decided and documented", value: "1 guide" },
      { label: "Landing site — directive to deployed", value: "10 min" },
      { label: "Setups published", value: "2" },
      { label: "Logo — approved comp to production mark", value: "1" },
      { label: "Research reports commissioned and synthesized", value: "2" },
      { label: "New spend above standing subscriptions", value: "$0" },
      { label: "Standing org cost", value: "≈ $170 / mo" },
    ],
  },
];
