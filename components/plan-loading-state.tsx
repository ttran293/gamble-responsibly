"use client";

import { useEffect, useState } from "react";
import { JellyMessage } from "./jelly-message";

const thoughts = [
  "Understanding the goal you chose…",
  "Reviewing your sample activity…",
  "Putting your next steps together…"
];

export function PlanLoadingState() {
  const [thought, setThought] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setThought(current => {
        if (current === thoughts.length - 1) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 2400);
    return () => window.clearInterval(interval);
  }, []);

  return <div className="onboarding-generating">
    <p className="eyebrow">Creating your plan</p>
    <h1>Jelly is putting your plan together.</h1>
    <p className="onboarding-intro">A few thoughtful steps based on what you shared.</p>
    <JellyMessage label="Jelly thinking…" className="plan-loading-message">
      <p role="status" aria-live="polite">{thoughts[thought]}</p>
      <span className="plan-loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </JellyMessage>
  </div>;
}
