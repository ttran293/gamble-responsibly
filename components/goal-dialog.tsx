"use client";

import { useEffect, useRef } from "react";
import type { OnboardingAnswers } from "../lib/onboarding";
import { OnboardingForm } from "./onboarding-form";

export function GoalDialog({ answers, onSaved, onCancel }: {
  answers: OnboardingAnswers;
  onSaved: (answers: OnboardingAnswers) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return <dialog ref={dialogRef} className="goal-dialog" aria-label="Change my goal" onCancel={(event) => { event.preventDefault(); if (!savingRef.current) onCancel(); }}>
    <OnboardingForm initialAnswers={answers} editing onSaved={onSaved} onCancel={onCancel} onSavingChange={(saving) => { savingRef.current = saving; }} />
  </dialog>;
}
