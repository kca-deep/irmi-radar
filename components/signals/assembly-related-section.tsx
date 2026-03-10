"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Legal01Icon,
  LegalDocument01Icon,
  Calendar03Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  CategoryKey,
  AssemblyLegislation,
  AssemblyBill,
} from "@/lib/types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AssemblyRelatedSectionProps {
  category: CategoryKey;
}

export function AssemblyRelatedSection({
  category,
}: AssemblyRelatedSectionProps) {
  const [legislation, setLegislation] = useState<AssemblyLegislation[]>([]);
  const [bills, setBills] = useState<AssemblyBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [legRes, billRes] = await Promise.all([
          fetch(
            `/api/assembly?type=legislation&category=${category}&limit=3`
          ),
          fetch(`/api/assembly?type=bills&category=${category}&limit=3`),
        ]);

        const legData: ApiResponse<AssemblyLegislation[]> =
          await legRes.json();
        const billData: ApiResponse<AssemblyBill[]> = await billRes.json();

        if (legData.success && legData.data) setLegislation(legData.data);
        if (billData.success && billData.data) setBills(billData.data);
      } catch {
        // 실패 시 빈 상태 유지
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  const totalCount = legislation.length + bills.length;

  if (!loading && totalCount === 0) return null;

  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-3">
        <HugeiconsIcon
          icon={Legal01Icon}
          size={14}
          strokeWidth={2}
          className="text-assembly-accent"
        />
        관련 국회 동향
        {!loading && (
          <Badge variant="secondary" className="text-[10px] ml-1">
            {totalCount}건
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
        <div className="grid grid-cols-2 gap-2">
          {legislation.map((l) => (
            <a
              key={l.billNo}
              href={l.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block rounded-lg border border-assembly-accent/20 bg-assembly-accent/5 p-2.5 space-y-1.5 min-w-0",
                "transition-colors hover:bg-assembly-accent/10"
              )}
            >
              <Badge
                variant="outline"
                className="text-[9px] border-assembly-accent/30 text-assembly-accent"
              >
                입법예고
              </Badge>
              <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">
                {l.name}
              </p>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground truncate">
                  {l.committee}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    size={9}
                    strokeWidth={2}
                    className="shrink-0"
                  />
                  마감 {l.deadlineDt}
                </p>
              </div>
            </a>
          ))}

          {bills.map((b) => (
            <a
              key={b.billNo}
              href={b.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-1.5 min-w-0",
                "transition-colors hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={LegalDocument01Icon}
                  size={10}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
                {b.result && (
                  <Badge variant="secondary" className="text-[9px]">
                    {b.result}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">
                {b.name}
              </p>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground truncate">
                  {b.kind} / {b.proposerKind}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {b.proposeDt}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
