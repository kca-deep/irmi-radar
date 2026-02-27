"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { PeriodKey } from "@/lib/types";

interface PeriodContextValue {
  period: PeriodKey;
  setPeriod: (period: PeriodKey) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<PeriodKey>("1w");

  const setPeriod = useCallback((p: PeriodKey) => {
    setPeriodState(p);
  }, []);

  return (
    <PeriodContext value={{ period, setPeriod }}>
      {children}
    </PeriodContext>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return ctx;
}
