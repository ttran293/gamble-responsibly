import type { Bet } from "./core";

export function sportBreakdown(bets: Bet[]) {
  const grouped = new Map<string, { sport: string; count: number; stake: number }>();
  for (const bet of bets) {
    const sport = bet.sport?.trim() || "Unknown";
    const item = grouped.get(sport) ?? { sport, count: 0, stake: 0 };
    item.count++;
    item.stake += bet.stake;
    grouped.set(sport, item);
  }
  return [...grouped.values()].sort((a, b) => b.count - a.count || b.stake - a.stake || a.sport.localeCompare(b.sport));
}
