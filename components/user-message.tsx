import type { ReactNode } from "react";

export function UserMessage({ children }: { children: ReactNode }) {
  return <div className="user-message">
    <div className="user-message-bubble"><span className="user-message-label">You</span>{children}</div>
    <span className="user-message-avatar" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="11" r="5" fill="currentColor" /><path d="M6 27c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="currentColor" /></svg></span>
  </div>;
}
