import { useState, useCallback, useRef, useEffect } from "react";

/**
 * SSE 이벤트 등 고빈도 상태 업데이트를 requestAnimationFrame 단위로 배칭하는 훅.
 * 16ms(1프레임) 내에 도착한 모든 업데이트를 단일 setState로 통합하여
 * 불필요한 리렌더를 대폭 줄인다.
 */
export function useSSEBatch<T>(initialState: T | (() => T)) {
  const [state, setState] = useState<T>(initialState);
  const pendingRef = useRef<((prev: T) => T)[]>([]);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    if (pendingRef.current.length === 0) return;
    const fns = pendingRef.current;
    pendingRef.current = [];
    setState((prev) => {
      let current = prev;
      for (const fn of fns) {
        current = fn(current);
      }
      return current;
    });
  }, []);

  const batchUpdate = useCallback(
    (updater: (prev: T) => T) => {
      pendingRef.current.push(updater);
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = [];
    };
  }, []);

  return [state, batchUpdate, setState] as const;
}
