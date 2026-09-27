import type { ReactNode } from "react";

export function JellyMessage({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`jelly-message ${className}`}>
    <img className="jelly-message-avatar" src="/jelly-logo.png" alt="" aria-hidden="true" />
    <div className="jelly-message-bubble">
      <span className="jelly-message-label">{label}</span>
      {children}
    </div>
  </div>;
}
