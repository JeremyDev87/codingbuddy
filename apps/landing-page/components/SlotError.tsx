'use client';

import { useEffect, useRef } from 'react';

interface SlotErrorProps {
  reset: () => void;
  slotName:
    | 'agents'
    | 'quick start'
    | 'hero'
    | 'before after'
    | 'features'
    | 'supported tools'
    | 'tui-dashboard'
    | 'footer';
}

export const SlotError = ({ reset, slotName }: SlotErrorProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <section role="alert" aria-live="assertive">
      <h2>Failed to load {slotName}</h2>
      <p>Something went wrong. Please try again.</p>
      <button
        ref={buttonRef}
        onClick={reset}
        type="button"
        aria-label={`Try loading ${slotName} again`}
      >
        Try again
      </button>
    </section>
  );
};
