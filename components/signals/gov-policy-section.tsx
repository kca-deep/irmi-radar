"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  Call02Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { CategoryKey, Policy } from "@/lib/types";

interface ApiResponse {
  success: boolean;
  data?: PolicyItem[];
  error?: string;
}

// API 응답에서 supportType 등 추가 필드를 포함할 수 있음
type PolicyItem = Policy & {
  supportType?: string;
};

interface GovPolicySectionProps {
  category: CategoryKey;
}

export function GovPolicySection({ category }: GovPolicySectionProps) {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/policies?category=${category}&limit=4`
        );
        const data: ApiResponse = await res.json();

        if (data.success && data.data) {
          setPolicies(data.data);
        }
      } catch {
        // 실패 시 빈 상태 유지
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  if (!loading && policies.length === 0) return null;

  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-3">
        <HugeiconsIcon
          icon={Wallet01Icon}
          size={14}
          strokeWidth={2}
          className="text-policy-accent"
        />
        관련 지원정책
        {!loading && (
          <Badge variant="secondary" className="text-[10px] ml-1">
            {policies.length}건
          </Badge>
        )}
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-4 gap-2 text-[11px] text-muted-foreground">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={12}
            strokeWidth={2}
            className="animate-spin"
          />
          조회 중...
        </div>
      ) : (
        <div className="space-y-2">
          {policies.map((policy) => (
            <a
              key={policy.id}
              href={policy.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block rounded-lg border border-policy-accent/20 bg-policy-accent/5 p-2.5 space-y-1",
                "transition-colors hover:bg-policy-accent/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-1 flex-1 min-w-0">
                  {policy.title}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {policy.provider}
                </span>
              </div>

              {policy.benefit && (
                <p className="text-[10px] text-foreground/70 leading-snug line-clamp-1">
                  {policy.benefit}
                </p>
              )}

              <div className="flex items-center justify-between">
                {policy.contact && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-0">
                    <HugeiconsIcon
                      icon={Call02Icon}
                      size={9}
                      strokeWidth={2}
                      className="shrink-0"
                    />
                    <span className="truncate">{policy.contact}</span>
                  </span>
                )}
                <span className="text-[10px] text-policy-accent flex items-center gap-0.5 ml-auto shrink-0">
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={9}
                    strokeWidth={2}
                  />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
