"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  Loading03Icon,
  Call02Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL_MAP, CATEGORIES } from "@/lib/constants";
import { CATEGORY_DOT_MAP, CATEGORY_BADGE_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { CategoryKey, Policy } from "@/lib/types";

interface ApiResponse {
  success: boolean;
  data?: Policy[];
  error?: string;
}

interface PolicyWithCategory extends Policy {
  _category: CategoryKey;
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL_MAP) as CategoryKey[];

function PolicySlide({ policy }: { policy: PolicyWithCategory }) {
  const region =
    policy.targetRegions.length > 0
      ? policy.targetRegions.join(", ")
      : policy.provider;

  return (
    <a
      href={policy.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "w-[300px] shrink-0 rounded-lg border border-border bg-card/50 px-3 py-2.5 cursor-pointer",
        "hover:bg-card transition-colors"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 font-medium shrink-0",
            CATEGORY_BADGE_MAP[policy._category]
          )}
        >
          {CATEGORY_LABEL_MAP[policy._category]}
        </Badge>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
          <HugeiconsIcon icon={Location01Icon} size={10} strokeWidth={2} />
          {region}
        </span>
      </div>
      <p className="text-xs font-medium leading-snug text-foreground line-clamp-1 mb-1">
        {policy.title}
      </p>
      {policy.benefit && (
        <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">
          {policy.benefit}
        </p>
      )}
      {policy.contact && (
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <HugeiconsIcon icon={Call02Icon} size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{policy.contact}</span>
        </span>
      )}
    </a>
  );
}

function TickerSet({
  policies,
  keyPrefix = "",
}: {
  policies: PolicyWithCategory[];
  keyPrefix?: string;
}) {
  return (
    <div className="flex shrink-0 gap-3 pr-3">
      {policies.map((policy, i) => (
        <PolicySlide key={`${keyPrefix}${policy.id}-${i}`} policy={policy} />
      ))}
    </div>
  );
}

export function PolicyCarousel() {
  const [policies, setPolicies] = useState<PolicyWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const results = await Promise.all(
          CATEGORY_KEYS.map(async (key) => {
            const res = await fetch(`/api/policies?category=${key}&limit=3`);
            const data: ApiResponse = await res.json();
            return (data.success && data.data ? data.data : []).map((p) => ({
              ...p,
              _category: key,
            }));
          })
        );
        setPolicies(results.flat());
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={14}
            strokeWidth={2}
            className="animate-spin"
          />
          지원정책 불러오는 중...
        </div>
      </div>
    );
  }

  if (policies.length === 0) return null;

  const duration = policies.length * 3;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
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
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5">
            {policies.length}건
          </Badge>
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

      {/* Ticker */}
      <div className="overflow-hidden">
        <div
          className="flex hover:[animation-play-state:paused]"
          style={{
            animation: `ticker ${duration}s linear infinite`,
          }}
        >
          <TickerSet policies={policies} />
          <TickerSet policies={policies} keyPrefix="dup-" />
        </div>
      </div>
    </div>
  );
}
