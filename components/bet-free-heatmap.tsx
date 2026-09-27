"use client";

import { useEffect, useMemo, useState, type FocusEvent, type MouseEvent } from "react";
import { shiftDay } from "../lib/metrics/core";

type DailyPoint = { date: string; count: number; cashStake: number };
type Cell = DailyPoint & { inRange: boolean };
type Tip = { text: string; x: number; y: number; above: boolean };

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const monthLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
const fullDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function weeksFor(daily: DailyPoint[]) {
  if (!daily.length) return [] as Cell[][];
  const byDate = new Map(daily.map(point => [point.date, point]));
  let cursor = shiftDay(daily[0].date, -weekday(daily[0].date));
  const last = shiftDay(daily[daily.length - 1].date, 6 - weekday(daily[daily.length - 1].date));
  const weeks: Cell[][] = [];
  while (cursor <= last) {
    const week: Cell[] = [];
    for (let day = 0; day < 7; day++) {
      const point = byDate.get(cursor);
      week.push(point ? { ...point, inRange: true } : { date: cursor, count: 0, cashStake: 0, inRange: false });
      cursor = shiftDay(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function monthSpans(weeks: Cell[][]) {
  const spans: { label: string; weeks: number }[] = [];
  for (const week of weeks) {
    const marker = week.find(cell => cell.inRange) ?? week[0];
    const label = monthLabel(marker.date);
    const previous = spans.at(-1);
    if (previous?.label === label) previous.weeks += 1;
    else spans.push({ label, weeks: 1 });
  }
  return spans;
}

function cellText(cell: Cell, completeCoverage: boolean) {
  const when = fullDate(cell.date);
  if (cell.count > 0) {
    const bets = `${cell.count} ${cell.count === 1 ? "bet" : "bets"}`;
    return `${when}: ${bets}, ${usd(cell.cashStake)} cash wagered`;
  }
  if (!completeCoverage) return `${when}: no bet in the loaded records. Not marked, because this range is not covered by every selected account.`;
  return `${when}: no recorded bet`;
}

function summary(total: number, unmarked: number, completeCoverage: boolean) {
  if (!completeCoverage && unmarked > 0) return "Days without a recorded bet are not marked. This range is not covered by every selected account, so a blank day is not abstinence.";
  if (unmarked === 0) return `Every day in this range has a recorded bet (${total} ${total === 1 ? "day" : "days"}).`;
  if (unmarked === total) return total === 1 ? "No recorded bet on this day." : `No recorded bets on any of these ${total} days.`;
  return `${unmarked} of ${total} days had no recorded bets.`;
}

export function BetFreeHeatmap({ daily, completeCoverage }: { daily: DailyPoint[]; completeCoverage: boolean }) {
  const weeks = useMemo(() => weeksFor(daily), [daily]);
  const months = useMemo(() => monthSpans(weeks), [weeks]);
  const unmarked = daily.filter(point => point.count === 0).length;
  const caption = summary(daily.length, unmarked, completeCoverage);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [tip]);

  function showTip(event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, text: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    const above = rect.top > 48;
    setTip({ text, x: rect.left + rect.width / 2, y: above ? rect.top : rect.bottom, above });
  }

  return <div className="bet-free">
    <div className="bet-free-scroll">
      <div className="bet-free-map">
        <div className="bet-free-months" aria-hidden="true">
          {months.map((span, index) => <span key={`${span.label}-${index}`} style={{ ["--weeks" as string]: String(span.weeks) }}>{span.label}</span>)}
        </div>
        <div className="bet-free-days" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div>
        <div className="bet-free-weeks" role="group" aria-label={caption}>
          {weeks.map(week => <div className="bet-free-week" key={week[0].date}>
            {week.map(cell => {
              const clearDay = cell.inRange && cell.count === 0 && completeCoverage;
              const unknown = cell.inRange && cell.count === 0 && !completeCoverage;
              if (!cell.inRange) return <span className="bet-free-cell is-pad" key={cell.date} />;
              const text = cellText(cell, completeCoverage);
              return <button
                type="button"
                key={cell.date}
                className={`bet-free-cell${clearDay ? " is-clear" : ""}${unknown ? " is-unknown" : ""}`}
                aria-label={text}
                onMouseEnter={event => showTip(event, text)}
                onMouseLeave={() => setTip(null)}
                onFocus={event => showTip(event, text)}
                onBlur={() => setTip(null)}
              />;
            })}
          </div>)}
        </div>
      </div>
    </div>
    <div className="bet-free-footer">
      <p>{caption}</p>
      <div className="bet-free-legend" aria-hidden="true"><span>Bet recorded</span><i className="bet-free-swatch" /><i className="bet-free-swatch is-clear" /><span>No recorded bet</span></div>
    </div>
    {tip && <div className={`bet-free-tooltip${tip.above ? "" : " is-below"}`} style={{ left: tip.x, top: tip.y }} role="tooltip">{tip.text}</div>}
  </div>;
}
