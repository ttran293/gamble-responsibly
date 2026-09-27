"use client";

import { useRef, useState } from "react";
import { formatStamp } from "../lib/format-date";
import type { Transaction } from "../lib/metrics/core";

const pageSize = 8;
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const displayType = (type: string) => {
  const label = type.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const displayProvider = (provider: string) => provider.replace(/\s*\(fictional\)/gi, "");
const displayDescription = (description: string) => /^Simulated (payout|wager)$/i.test(description.trim()) ? "" : description;

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const [page, setPage] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, transactions.length);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter(number => number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1);

  function goToPage(next: number) {
    if (next < 1 || next > pageCount || next === currentPage) return;
    setPage(next);
    requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  return <>
    <div className="panel-title"><div><p className="eyebrow">Activity</p><h2 ref={headingRef} tabIndex={-1}>Transactions</h2></div><span className="transaction-total">{transactions.length} transactions</span></div>
    {!transactions.length && <p>No transactions in this period.</p>}
    {transactions.slice(start, end).map(t => {
      const provider = displayProvider(t.provider ?? "");
      const description = displayDescription(t.description);
      return <div className="activity-row" key={t.id}><div><strong>{displayType(t.type)}</strong><small>{provider}{provider && description ? " · " : ""}{description}</small></div><time dateTime={t.at}>{formatStamp(t.at)}</time><b>{usd(t.cash)}{t.bonus !== 0 && <small>{usd(t.bonus)} bonus</small>}</b></div>;
    })}
    {pageCount > 1 && <nav className="transaction-pagination" aria-label="Transaction pages">
      <p className="transaction-page-range" aria-live="polite">Showing {start + 1}–{end} of {transactions.length}</p>
      <div className="transaction-page-buttons">
        <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
        {pages.map((number, index) => <span key={number} className="transaction-page-slot">
          {index > 0 && number > pages[index - 1] + 1 && <span className="transaction-page-ellipsis" aria-hidden="true">…</span>}
          <button type="button" className={number === currentPage ? "is-current" : ""} aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => goToPage(number)}>{number}</button>
        </span>)}
        <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount}>Next</button>
      </div>
    </nav>}
  </>;
}
