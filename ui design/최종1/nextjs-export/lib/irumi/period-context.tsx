"use client";

/**
 * 대시보드 전체에서 공유되는 '조회 기간' 상태를 관리하는 Context.
 * app/irumi/layout.tsx 에서 <PeriodProvider> 로 감싸고,
 * 각 페이지/컴포넌트에서 usePeriod() 훅으로 사용합니다.
 */

import React, { createContext, useContext, useState } from "react";

const PERIODS = ["최근 1주", "최근 1개월", "최근 3개월"] as const;
export type Period = (typeof PERIODS)[number];

interface PeriodContextValue {
  period: Period;
  periods: readonly Period[];
  setPeriod: (p: Period) => void;
}

const PeriodContext = createContext<PeriodContextValue>({
  period: "최근 1개월",
  periods: PERIODS,
  setPeriod: () => {},
});

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>("최근 1개월");

  return (
    <PeriodContext.Provider value={{ period, periods: PERIODS, setPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  return useContext(PeriodContext);
}
