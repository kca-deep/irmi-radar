"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
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
          `/api/policies?category=${category}&limit=6`
        );
        const data: ApiResponse = await res.json();
        if (data.success && data.data) {
          setPolicies(data.data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  if (!loading && policies.length === 0) return null;

  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground mb-2">
        <HugeiconsIcon
          icon={Wallet01Icon}
          size={14}
          strokeWidth={2}
          className="text-brand"
        />
        관련 지원정책
        {!loading && (
          <Badge variant="secondary" className="text-xs ml-1">
            {policies.length}건
          </Badge>
        )}
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-3 gap-2 text-[13px] text-muted-foreground">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={12}
            strokeWidth={2}
            className="animate-spin"
          />
          조회 중...
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {policies.slice(0, 4).map((policy) => (
            <a
              key={policy.id}
              href={policy.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "rounded-lg border border-border bg-card shadow-sm p-2.5 flex items-center gap-2",
                "transition-all duration-200 ease-out hover:shadow-md"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                  {policy.title}
                </p>
                {policy.benefit && (
                  <p className="text-[13px] text-foreground/70 leading-snug line-clamp-1 mt-0.5">
                    {policy.benefit}
                  </p>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {policy.provider}
                </span>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={12}
                strokeWidth={2}
                className="text-muted-foreground shrink-0"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
