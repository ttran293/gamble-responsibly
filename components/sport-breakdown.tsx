import type { Bet } from "../lib/metrics/core";
import { sportBreakdown } from "../lib/metrics/sports";

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const colors = ["#2f6f5c", "#d08a5b", "#6a829e", "#9d79a8", "#c6a34f", "#7a9890"];
const radius = 84;
const center = 100;

function slicePath(start: number, end: number) {
  const point = (angle: number) => {
    const radians = (angle - 90) * Math.PI / 180;
    return `${center + radius * Math.cos(radians)} ${center + radius * Math.sin(radians)}`;
  };
  return `M ${center} ${center} L ${point(start)} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${point(end)} Z`;
}

export function SportBreakdown({ bets }: { bets: Bet[] }) {
  const sports = sportBreakdown(bets);
  const total = bets.length;
  let angle = 0;
  return <section className="panel sport-panel" aria-labelledby="sport-breakdown-title">
    <p className="eyebrow">Sport breakdown</p>
    <h2 id="sport-breakdown-title">Sports you bet on most</h2>
    <p>Share of bets placed in the selected period.</p>
    {sports.length ? <>
      <div className="sport-pie-wrap">
        <svg className="sport-pie" viewBox="0 0 200 200" role="img" aria-label={`Bet share by sport: ${sports.map(item => `${item.sport} ${item.count} of ${total}`).join(", ")}`}>
          {sports.map((item, index) => {
            const start = angle;
            angle += item.count / total * 360;
            return item.count === total
              ? <circle key={item.sport} cx={center} cy={center} r={radius} fill={colors[index % colors.length]} />
              : <path key={item.sport} d={slicePath(start, angle)} fill={colors[index % colors.length]} stroke="#fff" strokeWidth="1.5" />;
          })}
        </svg>
        <ol className="sport-legend">{sports.map((item, index) => <li key={item.sport}>
          <span className="sport-swatch" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
          <span><strong>{item.sport}</strong><small>{item.count} {item.count === 1 ? "bet" : "bets"} · {Math.round(item.count / total * 100)}% · {usd(item.stake)} staked</small></span>
        </li>)}</ol>
      </div>
    </> : <p>No bets were recorded in this period.</p>}
  </section>;
}
