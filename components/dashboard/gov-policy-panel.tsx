"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { CATEGORY_LABEL_MAP, CATEGORIES } from "@/lib/constants";
import { CATEGORY_BADGE_MAP, CATEGORY_DOT_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { CategoryKey, Policy } from "@/lib/types";

interface ApiResponse {
  success: boolean;
  data?: Policy[];
  error?: string;
}

interface CategoryPolicies {
  category: CategoryKey;
  policies: Policy[];
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL_MAP) as CategoryKey[];


export function GovPolicyPanel() {
  const [categoryPolicies, setCategoryPolicies] = useState<CategoryPolicies[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          CATEGORY_KEYS.map(async (key) => {
            const res = await fetch(`/api/policies?category=${key}&limit=3`);
            const data: ApiResponse = await res.json();
            return {
              category: key,
              policies: data.success && data.data ? data.data : [],
            };
          })
        );
        setCategoryPolicies(results);
      } catch {
        setError("정책 API 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const allPolicies = categoryPolicies.flatMap((cp) =>
    cp.policies.map((p) => ({ ...p, _category: cp.category }))
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Wallet01Icon}
            size={18}
            strokeWidth={2}
            className="text-policy-accent"
          />
          <h3 className="text-sm font-semibold text-foreground">
            민생 지원정책
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {CATEGORIES.map((cat) => (
            <span key={cat.key} className="flex items-center gap-1">
              <span className={cn("size-1.5 rounded-full", CATEGORY_DOT_MAP[cat.key])} />
              <span className="text-[10px] text-muted-foreground">{cat.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={16}
            strokeWidth={2}
            className="animate-spin"
          />
          데이터 불러오는 중...
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          {error}
        </div>
      )}

      {/* 콘텐츠 */}
      {!loading && !error && (
        <>
          {/* 카테고리별 카운트 요약 */}
          <div className="flex flex-wrap gap-2">
            {categoryPolicies.map((cp) => (
              <span
                key={cp.category}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                  CATEGORY_BADGE_MAP[cp.category]
                )}
              >
                {CATEGORY_LABEL_MAP[cp.category]}
                <span className="font-bold">{cp.policies.length}</span>
              </span>
            ))}
          </div>

          {/* 컴팩트 정책 리스트 */}
          {allPolicies.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-muted-foreground">
              지원정책 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {allPolicies.map((policy) => (
                <a
                  key={policy.id}
                  href={policy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium",
                      CATEGORY_BADGE_MAP[policy._category]
                    )}
                  >
                    {CATEGORY_LABEL_MAP[policy._category]}
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-foreground line-clamp-1">
                    {policy.title}
                  </span>
                  <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">
                    {policy.provider}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={10}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
