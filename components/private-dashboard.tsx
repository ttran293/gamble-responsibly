"use client";

import { useState } from "react";

const activity = [
  ["Deposit", "Added to account", "+$75", "amber", "Today, 4:18 PM"],
  ["Sports bet", "Session result", "−$42", "terra", "Today, 3:54 PM"],
  ["Deposit", "Added to account", "+$50", "amber", "Yesterday, 9:16 PM"],
  ["Withdrawal", "Taken out", "+$20", "sage", "Yesterday, 8:42 PM"],
];

export function PrivateDashboard({ name, emailVerified }: { name: string; emailVerified: boolean }) {
  const [pauseOpen, setPauseOpen] = useState(false);
  return <>
    <div className="private-nav"><div className="brand"><span>◒</span> stillwater</div><div className="private-nav-right"><span className="private-label">Private tracker</span><button className="avatar" aria-label="Account">{name.slice(0, 1).toUpperCase()}</button></div></div>
    <main className="private-dashboard">
      <section className="welcome-row"><div><p className="eyebrow">Your private space</p><h1>Hi, {name}.</h1><p className="intro">A clear, non-judgmental look at the past 30 days.</p></div><button className="urge-button" onClick={() => setPauseOpen(true)}><span className="urge-dot"></span>I feel like gambling <b>→</b></button></section>
      {!emailVerified && <div className="verification-banner"><span>✦</span><div><strong>Protect this private space</strong><br />Check your email to verify your account. You can continue using the tracker now.</div><button>Resend email</button></div>}
      <section className="summary-strip"><div><span className="eyebrow">This month</span><h2>September</h2><p>Fictional demo activity</p></div><div className="summary-divider"></div><div><span className="eyebrow">Your intention</span><h2>Take a pause</h2><p>Set Sep 1</p></div><button className="text-link">Edit my intention →</button></section>
      <section className="metric-grid"><Metric label="Deposits" value="$425" detail="Money added" /><Metric label="Withdrawals" value="$85" detail="Money taken out" positive /><Metric label="Actual net result" value="−$340" detail="Deposits less withdrawals" negative /><Metric label="Time tracked" value="6h 40m" detail="Across 12 sessions" /></section>
      <section className="dashboard-grid"><article className="panel balance-panel"><div className="panel-title"><div><span className="eyebrow">Your activity</span><h2>Balance over time</h2></div><button className="period">Last 30 days⌄</button></div><div className="chart-wrap"><div className="chart-y"><span>$0</span><span>−$150</span><span>−$300</span></div><svg viewBox="0 0 620 210" preserveAspectRatio="none" aria-label="Balance trend ending at negative 340 dollars"><defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#B6655B" stopOpacity=".2"/><stop offset="1" stopColor="#B6655B" stopOpacity="0"/></linearGradient></defs><path d="M0 29 L45 33 L84 49 L124 42 L165 65 L205 72 L248 60 L288 95 L329 84 L370 111 L410 104 L455 145 L496 136 L540 171 L580 162 L620 195 L620 210 L0 210Z" fill="url(#fade)"/><path d="M0 29 L45 33 L84 49 L124 42 L165 65 L205 72 L248 60 L288 95 L329 84 L370 111 L410 104 L455 145 L496 136 L540 171 L580 162 L620 195" fill="none" stroke="#B6655B" strokeWidth="3.5"/><circle cx="620" cy="195" r="5" fill="#B6655B"/></svg><div className="chart-x"><span>Aug 26</span><span>Sep 2</span><span>Sep 9</span><span>Sep 16</span><span>Sep 24</span></div></div><p className="chart-caption"><i></i> Actual net result — not deposits alone</p></article>
        <article className="pattern-card"><div className="pattern-icon">✦</div><span className="eyebrow">A pattern to consider</span><h2>Deposits sometimes follow a loss.</h2><p>On 4 occasions this month, another deposit was made within 24 hours of a losing session.</p><div className="sequence"><span>Loss</span><b>→</b><span>New deposit</span></div><p className="fineprint">This describes what&apos;s in your data. It doesn&apos;t explain why it happened.</p><button className="text-link">Talk through this with me →</button></article></section>
      <section className="bottom-grid"><article className="panel activity-panel"><div className="panel-title"><div><span className="eyebrow">Recent activity</span><h2>Transactions</h2></div><button className="text-link">View all →</button></div>{activity.map(([title, sub, amount, tone, when]) => <div className="activity-row" key={title + when}><span className={`activity-dot ${tone}`}></span><div><strong>{title}</strong><small>{sub}</small></div><time>{when}</time><b className={amount.startsWith("−") ? "negative" : ""}>{amount}</b></div>)}</article>
      <article className="plan-card"><span className="eyebrow">Your pause plan</span><h2>When I feel an urge...</h2><p>I&apos;ll step away from the screen for 10 minutes and text Maya.</p><button onClick={() => setPauseOpen(true)} className="outline-button">Review my plan →</button></article></section>
    </main>
    {pauseOpen && <div className="pause-overlay"><section className="pause-card"><button className="modal-close" onClick={() => setPauseOpen(false)}>×</button><span className="eyebrow">Your pause plan</span><h2>Pause before deciding.</h2><p>You said you&apos;d take ten minutes away from the screen and message Maya when an urge arrives.</p><button className="primary pause-main" onClick={() => setPauseOpen(false)}>Start my 10-minute pause</button><button className="modal-link" onClick={() => setPauseOpen(false)}>Text Maya instead →</button></section></div>}
  </>;
}

function Metric({ label, value, detail, negative = false, positive = false }: { label: string; value: string; detail: string; negative?: boolean; positive?: boolean }) { return <article className="private-metric"><span>{label}</span><strong className={negative ? "negative" : positive ? "positive" : ""}>{value}</strong><small>{detail}</small></article>; }
