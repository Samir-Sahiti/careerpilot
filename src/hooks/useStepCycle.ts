"use client";

import { useState, useRef } from "react";

/**
 * Cycles a step index from 0 up to (stepsLength - 1) on a fixed interval.
 * Designed for multi-step progress UIs shown during async AI operations.
 */
export function useStepCycle(stepsLength: number, intervalMs: number) {
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setStepIndex(0);
    timerRef.current = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, stepsLength - 1));
    }, intervalMs);
  };

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return { stepIndex, start, stop };
}
