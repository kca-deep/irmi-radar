"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  Call02Icon,
  ArrowRight01Icon,
  Loading03Icon,
  Building02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { CategoryKey, Policy } from "@/lib/types";

interface ApiResponse {
  success: boolean;
  data?: Policy[];
  error?: string;
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL_MAP) as CategoryKey[];

export function GovPolicyPanel() {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryKey>("selfEmployed");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/policies?category=${selectedCategory}&limit=5`
        );
        const data: ApiResponse = await res.json();

        if (data.success && data.data) {
          setPolicies(data.data);
        } else {
          setError(data.error || "정책 데이터를 불러올 수 없습니다.");
        }
      } catch {
        setError("정책 API 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCategory]);

  return (
    <div className="rounded-xl border border-border bg-policy-surface p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-policy-accent/15">
          <HugeiconsIcon
            icon={Wallet01Icon}
            size={16}
            strokeWidth={2}
            className="text-policy-accent"
          />
        </div>
        <h3 className="font-semibold text-sm text-foreground">
          민생 지원정책
        </h3>
        <span className="text-[10px] text-muted-foreground ml-auto">
          gov.kr
        </span>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedCategory(key)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
              selectedCategory === key
                ? "bg-policy-accent text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {CATEGORY_LABEL_MAP[key]}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
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
        <div className="text-center py-6 text-xs text-muted-foreground">
          {error}
        </div>
      )}

      {/* 정책 카드 목록 */}
      {!loading && !error && (
        <>
          {policies.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {policies.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  return (
    <a
      href={policy.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg border border-border/50 bg-background/60 p-3 space-y-1.5",
        "transition-colors hover:bg-background/80"
      )}
    >
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
        {policy.title}
      </p>

      <div className="flex items-center gap-1.5">
        <HugeiconsIcon
          icon={Building02Icon}
          size={10}
          strokeWidth={2}
          className="text-muted-foreground shrink-0"
        />
        <span className="text-[10px] text-muted-foreground line-clamp-1">
          {policy.provider}
        </span>
      </div>

      {policy.benefit && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {policy.benefit}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        {policy.contact && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <HugeiconsIcon
              icon={Call02Icon}
              size={10}
              strokeWidth={2}
              className="shrink-0"
            />
            <span className="line-clamp-1">{policy.contact}</span>
          </span>
        )}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={10}
          strokeWidth={2}
          className="text-muted-foreground shrink-0 ml-auto"
        />
      </div>

    </a>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-4 text-[11px] text-muted-foreground">
      해당 카테고리의 지원정책이 없습니다.
    </div>
  );
}
