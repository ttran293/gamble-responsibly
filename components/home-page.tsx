"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";

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

export function HomePage({ signedIn, userName }: { signedIn: boolean; userName?: string }) {
  const [view, setView] = useState<"home" | "friend" | "tracker">("home");
  const [pauseOpen, setPauseOpen] = useState(false);
  const [message, setMessage] = useState("");

  const go = (target: "friend" | "tracker") => {
    if (target === "friend") {
      window.location.href = "/supporter";
      return;
    }
    if (target === "tracker") {
      window.location.href = signedIn ? "/dashboard" : "/start";
      return;
    }
    setView(target);
    setPauseOpen(false);
  };

  return (
    <main>
      <header className="nav">
        <button className="brand" onClick={() => setView("home")}><img src="/jelly-logo.gif?v=3" alt="" />Jelly</button>
        <nav className="home-nav">
          <Link href="/supporter">Send invitation</Link>
          {signedIn ? <><span className="home-session-label">Signed in as <strong>{userName || "Jelly member"}</strong></span><Link className="nav-cta" href="/dashboard">Dashboard</Link><SignOutButton redirectTo="/" /></> : <Link className="nav-cta" href="/sign-in">Log In</Link>}
        </nav>
      </header>

      {view === "home" && <Home signedIn={signedIn} />}
      {view === "friend" && <Friend onTracker={() => go("tracker")} />}
      {view === "tracker" && <Tracker onPause={() => setPauseOpen(true)} />}

      {pauseOpen && <PauseModal close={() => setPauseOpen(false)} message={message} setMessage={setMessage} />}
    </main>
  );
}

type Path = "friend" | "tracker";

type HowStep = { n: string; title: string; body: string; href?: string; action?: string; cta?: string };

const friendSteps: HowStep[] = [
  { n: "01", title: "You're worried about someone", body: "Someone you care about is struggling with gambling, and you want to help." },
  { n: "02", title: "Invite them to track a goal", body: "They can follow their habit and a goal to gamble less, or stop. Joining is their choice." },
  { n: "03", title: "Be there when it gets hard", body: "If they join from your invitation, you become their emergency contact. Jelly lets you know when a streak of not betting breaks, or when they want to bet and want to reach out.", href: "/supporter", action: "Send invitation", cta: "Send an invitation when you're ready. Joining is their choice." }
];

const trackerSteps: HowStep[] = [
  { n: "01", title: "Track your habit", body: "Record what you do, so the pattern is clear." },
  { n: "02", title: "Set a goal", body: "Choose to gamble less, or stop. Jelly helps you work toward it." },
  { n: "03", title: "Create an account", body: "Start with a name, email, and password. You can begin right away.", href: "/start", action: "Create account", cta: "Create an account to start tracking your habit and goal." }
];

const faqs = [
  { q: "Who is Jelly for?", a: "Someone who wants to track their own habit and reach a goal to gamble less, or stop. And someone who wants to help a person they care about do the same." },
  { q: "What do I track?", a: "Your gambling habit, and a goal to gamble less or stop. Jelly helps you work toward that goal." },
  { q: "What if I invite someone I care about?", a: "They decide whether to join and set their own goal. If they create an account from your invitation, you become their emergency contact. Jelly notifies you when a streak of not betting breaks, or when they want to bet and want to reach out." },
  { q: "What does an emergency contact see?", a: "Only those notices. You do not see their habit record, spending, or goal details unless they choose to share them." },
  { q: "Can I use Jelly without an emergency contact?", a: "Yes. Tracking your own habit and goal does not require anyone else. You can add a contact later if you want someone notified when you are struggling." }
];

const resources = [
  { title: "NCPG Help by State", body: "Gambling-specific support and treatment. A starting point for therapists, programs, and local resources.", href: "https://www.ncpgambling.org/help-treatment/help-by-state/", action: "Find help in your state" },
  { title: "Gamblers Anonymous", body: "In-person and online peer groups, including virtual and telephone meetings.", href: "https://gamblersanonymous.org/find-a-meeting/", action: "Find a meeting" },
  { title: "Gam-Anon", body: "Meetings for friends and family affected by someone else's gambling.", href: "https://gam-anon.org/meeting-directory", action: "Find a family meeting" }
];

function choosePath(event: React.KeyboardEvent, next: Path, setPath: (path: Path) => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  setPath(next);
}

function Home({ signedIn }: { signedIn: boolean }) {
  const [path, setPath] = useState<Path>("friend");
  const steps = path === "friend" ? friendSteps : signedIn ? trackerSteps.map(step => step.href === "/start" ? { ...step, title: "Open your dashboard", body: "Continue with your saved goal and activity.", href: "/dashboard", action: "Go to dashboard", cta: "Continue with the goal and activity you've already saved." } : step) : trackerSteps;
  const action = steps.find(step => step.href && step.action);

  return <>
    <section className="hero">
      <h1>Work toward gambling less.</h1>
      <p>Track your own habit, or invite someone you care about and be there if they struggle.</p>
      <p className="egg"><b>Jelly</b> <i>(n.)</i> The little wobble before you bounce back.</p>
    </section>
    <section className="choice">
      <div className="paths-band" aria-label="Choose your path">
        <div className="paths">
        <div role="button" tabIndex={0} className={`path-card friend-card${path === "friend" ? " is-selected" : ""}`} aria-pressed={path === "friend"} onClick={() => setPath("friend")} onKeyDown={(event) => choosePath(event, "friend", setPath)}>
          <div className="path-icon">♡</div><div><h2>I&apos;m concerned about someone</h2><p className="path-lead">Help them gamble less, or stop.</p><p>Invite them to track that goal. If they join from your invitation, you are their emergency contact and Jelly notifies you when they are struggling.</p></div>
        </div>
        <div role="button" tabIndex={0} className={`path-card tracker-card${path === "tracker" ? " is-selected" : ""}`} aria-pressed={path === "tracker"} onClick={() => setPath("tracker")} onKeyDown={(event) => choosePath(event, "tracker", setPath)}>
          <div className="path-icon">◌</div><div><h2>I want to understand my gambling habit</h2><p className="path-lead">Track your habit. Reach a goal.</p><p>Jelly helps you gamble less, or stop.</p></div>
        </div>
        </div>
      </div>
      <div className="how" aria-labelledby="how-heading">
        <div className="band-inner">
        <h2 id="how-heading">How it works</h2>
        <p className="how-context">{path === "friend" ? "If you want to help someone you care about" : "If you want to reach your own goal"}</p>
        <div className="how-grid">
          {steps.map((step) => (
            <article className="how-card" key={step.n}>
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
        {action?.href && action.action && <div className="how-cta">{action.cta && <p>{action.cta}</p>}<Link className="primary" href={action.href}>{action.action} →</Link></div>}
        </div>
      </div>
    </section>
    <section className="faq" aria-labelledby="faq-heading">
      <div className="band-inner">
      <h2 id="faq-heading">FAQ</h2>
      <div className="faq-list">
        {faqs.map((item) => (
          <details className="faq-item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      </div>
    </section>
    <section className="resources" aria-labelledby="resources-heading">
      <div className="band-inner">
      <h2 id="resources-heading">Resources</h2>
      <p className="how-context">Gambling-specific support and treatment, peer groups, therapists and programs, help for friends and family, debt, and blocking tools.</p>
      <div className="urgent-help">
        <span>Need help now</span>
        <a href="tel:18006973738">Call or text 1-800-MY-RESET</a>
        <p>The National Problem Gambling Helpline. You can also <a href="https://www.1800myreset.org" target="_blank" rel="noopener noreferrer">chat online</a>.</p>
      </div>
      <div className="resource-list">
        {resources.map((item) => (
          <a className="resource-card" href={item.href} key={item.title} target="_blank" rel="noopener noreferrer">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <span className="link">{item.action} →</span>
          </a>
        ))}
      </div>
      <p className="resource-note">For gambling-related debt, or for blocking and self-exclusion, call or text the helpline and ask to be connected in your state.</p>
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
    <div className="invite"><div><span className="eyebrow">An invitation</span><h2>They can track their habits and spending.</h2><p>They decide whether to use Jelly, and their information remains theirs.</p></div><button className="primary" onClick={onTracker}>See the betting tracker <span>→</span></button></div>
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
