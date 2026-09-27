"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string; safetyFlag: string; createdAt: string };
type Goal = "stay" | "reduce" | "stop";

export function ChatWidget({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="chat-launcher" aria-expanded={open} aria-controls="chat-widget-panel" onClick={() => setOpen(value => !value)}><img src="/jelly-logo.gif?v=3" alt="" />{open ? "Close chat" : "Talk with Jelly"}</button>
    {open && <section id="chat-widget-panel" className="chat-widget-panel" aria-label="Talk with Jelly"><div className="chat-widget-top"><div className="chat-widget-identity"><img src="/jelly-logo.gif?v=3" alt="" /><strong>Talk with Jelly</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Close chat">×</button></div><ChatPanel goal={goal} /></section>}
  </>;
}

function ChatPanel({ goal }: { goal: Goal }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [consented, setConsented] = useState(false);
  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/chat", { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Chat history is unavailable.");
      if (active) { setMessages(body.messages ?? []); setConsented(Boolean(body.consented)); }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Chat history is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy || !started && !consented) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, consent: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not send your message.");
      setMessages(current => [...current, ...body.messages]);
      setConsented(true); setDraft("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send your message."); }
    finally { setBusy(false); }
  }

  async function clearHistory() {
    if (busy || !window.confirm("Delete your chat history? This cannot be undone.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/chat", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not delete chat history.");
      setMessages([]); setConsented(false); setStarted(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete chat history."); }
    finally { setBusy(false); }
  }

  const starters = goal === "stop"
    ? ["I want to bet right now and need a pause.", "I keep thinking one bet won't hurt.", "I placed a bet after deciding to stop."]
    : ["I have an urge to bet right now.", "I keep thinking I can win back a loss.", "I slipped on my gambling goal and want to reflect."];

  return <div className="chat-layout">
    <section className="chat-main" aria-label="Support chat">
      <div className="chat-heading"><div><p className="eyebrow">A pause when you need one</p><h1>Talk with Jelly</h1><p>Guided self-help for gambling urges and thoughts. This is not therapy or crisis care.</p></div>{messages.length > 0 && <button type="button" className="text-link" disabled={busy} onClick={() => void clearHistory()}>Delete chat history</button>}</div>
      {!consented && <div className="chat-disclosure"><h2>Before you start</h2><p>Your messages and selected goal, triggers, and pause action are sent to OpenAI to generate replies. Your chat history is available for 90 days after your last message, and you can delete it sooner. Chat is not monitored by a person. This version offers US support resources.</p><button type="button" className="primary" disabled={loading} onClick={() => setStarted(true)}>{started ? "Ready to chat" : "I understand — start chat"}</button></div>}
      <div className="chat-transcript" role="log" aria-live="polite" aria-label="Conversation">
        {loading && <p role="status">Loading chat…</p>}
        {!loading && !messages.length && <div className="chat-empty"><h2>What is happening right now?</h2><p>You can start with an urge, a thought, or a recent slip. Take your time.</p><div className="chat-starters">{starters.map(text => <button type="button" key={text} onClick={() => setDraft(text)}>{text}</button>)}</div></div>}
        {messages.map(message => <article className={`chat-message ${message.role}`} key={message.id}><span>{message.role === "user" ? "You" : "Jelly"}</span><p>{message.content}</p></article>)}
        <div ref={endRef} />
      </div>
      <form className="chat-composer" onSubmit={event => void send(event)}><label htmlFor="chat-input">Your message</label><textarea id="chat-input" value={draft} maxLength={2000} disabled={busy || loading || !started && !consented} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="What's on your mind?" /><div><small>{draft.length}/2000</small><button className="primary" type="submit" disabled={!draft.trim() || busy || loading || !started && !consented}>{busy ? "Sending…" : "Send"}</button></div></form>
      {error && <p className="onboarding-error" role="alert">{error}</p>}
    </section>
    <aside className="chat-help" aria-label="Support resources"><h2>Real people can help</h2><p>If you might hurt yourself or are in immediate danger, call local emergency services. In the US, call or text <a href="tel:988">988</a> for crisis support.</p><p>For gambling support, call or text <a href="tel:18006973738">1-800-MY-RESET</a>.</p><p>These links remain here even if chat is unavailable.</p></aside>
  </div>;
}
