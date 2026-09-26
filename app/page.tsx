"use client";

import Link from "next/link";
import { useState } from "react";

const transactions = [
  { day: "Sep 24", type: "Deposit", amount: 75, tone: "amber" },
  { day: "Sep 24", type: "Sports bet", amount: -42, tone: "terracotta" },
  { day: "Sep 23", type: "Deposit", amount: 50, tone: "amber" },
  { day: "Sep 23", type: "Withdrawal", amount: 20, tone: "sage" },
  { day: "Sep 22", type: "Sports bet", amount: -60, tone: "terracotta" }
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export default function StillwaterApp() {
  const [view, setView] = useState<"home" | "friend" | "tracker">("home");
  const [pauseOpen, setPauseOpen] = useState(false);
  const [message, setMessage] = useState("");

  const go = (target: "friend" | "tracker") => {
    if (target === "friend") {
      window.location.href = "/supporter";
      return;
    }
    if (target === "tracker") {
      window.location.href = "/start";
      return;
    }
    setView(target);
    setPauseOpen(false);
  };

  return (
    <main>
      <header className="nav">
        <button className="brand" onClick={() => setView("home")}><span>◒</span> stillwater</button>
        <nav>
          <Link href="/demo">Explore demo metrics</Link>
          <Link className="nav-cta" href="/sign-in">Log In</Link>
        </nav>
      </header>

      {view === "home" && <Home />}
      {view === "friend" && <Friend onTracker={() => go("tracker")} />}
      {view === "tracker" && <Tracker onPause={() => setPauseOpen(true)} />}

      {pauseOpen && <PauseModal close={() => setPauseOpen(false)} message={message} setMessage={setMessage} />}
    </main>
  );
}

type Path = "friend" | "tracker";

const friendSteps = [
  { n: "01", title: "Say what you've noticed", body: "Choose a calm moment. Lead with what you have seen and how you feel, rather than a demand." },
  { n: "02", title: "Offer a betting tracker", body: "They can record betting activity, wins, and losses. Their data stays theirs." },
  { n: "03", title: "Send an invitation", body: "They receive a private link and decide whether to join. You will not see their activity or spending.", href: "/supporter", action: "Send invitation" }
];

const trackerSteps = [
  { n: "01", title: "Open a private space", body: "Your tracker is only for you. No one else can see what you record." },
  { n: "02", title: "Record what happened", body: "Log activity, wins, losses, and money spent. Over time, you can see what changed." },
  { n: "03", title: "Create an account", body: "Start with a name, email, and password. You can begin right away.", href: "/start", action: "Create account" }
];

function choosePath(event: React.KeyboardEvent, next: Path, setPath: (path: Path) => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  setPath(next);
}

function Home() {
  const [path, setPath] = useState<Path>("friend");
  const steps = path === "friend" ? friendSteps : trackerSteps;

  return <>
    <section className="hero">
      <div className="eyebrow">A clearer view of your betting habits</div>
      <h1>Understand your betting,<br />one day at a time.</h1>
      <p>Track activity, wins, losses, and spending. Notice patterns and decide what to do next, or invite someone you care about to try it for themselves.</p>
    </section>
    <section className="paths" aria-label="Choose your path">
      <div role="button" tabIndex={0} className={`path-card friend-card${path === "friend" ? " is-selected" : ""}`} aria-pressed={path === "friend"} onClick={() => setPath("friend")} onKeyDown={(event) => choosePath(event, "friend", setPath)}>
        <div className="path-icon">♡</div><div><h2>I&apos;m concerned about someone</h2><p className="path-lead">Invite them to track their habits and spending.</p><p>Share Stillwater with someone you care about. They can record their betting activity, wins, and losses. Their data stays theirs.</p></div>
      </div>
      <div role="button" tabIndex={0} className={`path-card tracker-card${path === "tracker" ? " is-selected" : ""}`} aria-pressed={path === "tracker"} onClick={() => setPath("tracker")} onKeyDown={(event) => choosePath(event, "tracker", setPath)}>
        <div className="path-icon">◌</div><div><h2>I want to understand my gambling habit</h2><p className="path-lead">Track your habits and spending.</p><p>Record your betting activity, wins, losses, and money spent in one place. See how your habits change over time.</p></div>
      </div>
    </section>
    <section className="how" aria-labelledby="how-heading">
      <h2 id="how-heading">How it works</h2>
      <p className="how-context">{path === "friend" ? "For someone you care about" : "For your own tracker"}</p>
      <div className="how-grid">
        {steps.map((step) => step.href ? (
          <Link className="how-card how-action" href={step.href} key={step.n}>
            <span>{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <span className="link">{step.action} →</span>
          </Link>
        ) : (
          <article className="how-card" key={step.n}>
            <span>{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
    <p className="privacy-note"><Icon>⌁</Icon> Your information is private. No one can see or connect your data without your clear permission.</p>
  </>;
}

function Friend({ onTracker }: { onTracker: () => void }) {
  return <section className="inner friend-page">
    <span className="back" onClick={() => history.back()}>← Back</span>
    <div className="split-heading"><div><span className="eyebrow">For friends &amp; family</span><h1>You don&apos;t have to solve this alone.</h1></div><p>Your care can make a difference. Begin with a conversation that leaves room for their choices.</p></div>
    <div className="guide-grid">
      <article className="guide-card"><span>01</span><h2>Prepare for the conversation</h2><p>Choose a calm moment. Lead with what you have noticed and how you feel, rather than labels or demands.</p><a href="#words">View conversation prompts →</a></article>
      <article className="guide-card"><span>02</span><h2>Protect what you share</h2><p>Get practical guidance on shared bills, accounts, and boundaries. You cannot access their financial data without consent.</p><a href="#finances">Explore financial safeguards →</a></article>
      <article className="guide-card"><span>03</span><h2>Find support for you</h2><p>Supporting someone can be exhausting. Connect with services and peers who understand what this can feel like.</p><a href="#support">Find support options →</a></article>
    </div>
    <div className="invite"><div><span className="eyebrow">An invitation</span><h2>They can track their habits and spending.</h2><p>They decide whether to use Stillwater, and their information remains theirs.</p></div><button className="primary" onClick={onTracker}>See the betting tracker <span>→</span></button></div>
  </section>;
}

function Tracker({ onPause }: { onPause: () => void }) {
  return <section className="dashboard">
    <div className="dashboard-top"><div><span className="eyebrow">Your private space</span><h1>Good afternoon, Alex.</h1><p>Here&apos;s a clear view of the last 30 days. This is fictional demo data.</p></div><button className="urge" onClick={onPause}>I feel like gambling <span>→</span></button></div>
    <div className="disclaimer"><Icon>i</Icon> This is a reflection tool, not financial advice or therapy. You&apos;re always in control of what you do next.</div>
    <div className="metrics"><Metric label="Deposits" value="$425" note="Money added" /><Metric label="Withdrawals" value="$85" note="Money taken out" /><Metric label="Actual net result" value="−$340" note="Deposits less withdrawals" negative /><Metric label="Time tracked" value="6h 40m" note="Across 12 sessions" /></div>
    <div className="content-grid"><section className="chart-card"><div className="card-heading"><div><span className="eyebrow">Your activity</span><h2>Balance over time</h2></div><button>Last 30 days⌄</button></div><div className="chart"><div className="y-labels"><span>$0</span><span>−$150</span><span>−$300</span></div><svg viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label="Balance fell to negative $340 over the month"><path d="M0,28 L45,30 L86,46 L126,40 L168,65 L210,70 L250,58 L294,96 L332,85 L375,110 L413,104 L458,146 L500,135 L545,171 L592,162 L635,189 L700,196" fill="none" stroke="#B6655B" strokeWidth="4"/><path d="M0,28 L45,30 L86,46 L126,40 L168,65 L210,70 L250,58 L294,96 L332,85 L375,110 L413,104 L458,146 L500,135 L545,171 L592,162 L635,189 L700,196 L700,210 L0,210Z" fill="rgba(182,101,91,.10)"/></svg><div className="x-labels"><span>Aug 26</span><span>Sep 2</span><span>Sep 9</span><span>Sep 16</span><span>Sep 24</span></div></div></section><Pattern /></div>
    <section className="activity-card"><div className="card-heading"><div><span className="eyebrow">Recent activity</span><h2>Transactions</h2></div><button>View all →</button></div>{transactions.map((t) => <div className="transaction" key={t.day + t.type}><span className={`dot ${t.tone}`}></span><span>{t.type}</span><span>{t.day}</span><strong className={t.amount < 0 ? "negative" : ""}>{t.amount > 0 ? "+" : ""}${Math.abs(t.amount)}</strong></div>)}</section>
  </section>;
}

function Metric({ label, value, note, negative = false }: { label: string; value: string; note: string; negative?: boolean }) { return <article className="metric"><span>{label}</span><strong className={negative ? "negative" : ""}>{value}</strong><small>{note}</small></article>; }

function Pattern() { return <aside className="pattern"><div className="pattern-head"><span className="spark">✦</span><span className="eyebrow">A pattern to consider</span></div><h2>Deposits sometimes follow a loss.</h2><p>On 4 occasions this month, another deposit was made within 24 hours of a losing session.</p><div className="pattern-line"><span>Loss</span><i>→</i><span>New deposit</span></div><p className="small">This describes what&apos;s in your data. It doesn&apos;t explain why it happened.</p><button>Talk through this with me →</button></aside>; }

function PauseModal({ close, message, setMessage }: { close: () => void; message: string; setMessage: (message: string) => void }) { return <div className="modal-backdrop" role="presentation"><section className="pause-modal" role="dialog" aria-modal="true" aria-label="Your pause plan"><button className="close" onClick={close}>×</button><span className="eyebrow">Your pause plan</span><h2>Pause before deciding.</h2><p>You said that when an urge arrives, you&apos;d take ten minutes away from the screen and text Maya.</p><div className="pause-actions"><button className="primary" onClick={() => setMessage("Your 10-minute pause has started. You can come back when you feel ready.")}>Start my 10-minute pause</button><button className="outline" onClick={() => setMessage("A draft message to Maya is ready: “Hey, I’m having an urge to gamble. Could we talk for a few minutes?”")}>Text Maya</button><button className="text-button">Find blocking &amp; self-exclusion tools →</button></div>{message && <p className="confirmation">{message}</p>}</section></div>; }
