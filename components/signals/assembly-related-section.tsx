"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Legal01Icon,
  LegalDocument01Icon,
  Calendar03Icon,
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
          fetch(`/api/assembly?type=legislation&category=${category}&limit=3`),
          fetch(`/api/assembly?type=bills&category=${category}&limit=3`),
        ]);

        const legData: ApiResponse<AssemblyLegislation[]> = await legRes.json();
        const billData: ApiResponse<AssemblyBill[]> = await billRes.json();

        if (legData.success && legData.data) setLegislation(legData.data);
        if (billData.success && billData.data) setBills(billData.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  const allItems = [
    ...legislation.map((l) => ({ type: "legislation" as const, data: l })),
    ...bills.map((b) => ({ type: "bill" as const, data: b })),
  ];

  if (!loading && allItems.length === 0) return null;

  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground mb-2">
        <HugeiconsIcon
          icon={Legal01Icon}
          size={14}
          strokeWidth={2}
          className="text-brand"
        />
        관련 국회 동향
        {!loading && (
          <Badge variant="secondary" className="text-xs ml-1">
            {allItems.length}건
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
          {allItems.slice(0, 4).map((item) =>
            item.type === "legislation" ? (
              <a
                key={item.data.billNo}
                href={item.data.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-lg border border-border bg-card shadow-sm p-2.5 flex items-start gap-2",
                  "transition-all duration-200 ease-out hover:shadow-md"
                )}
              >
                <Badge
                  variant="outline"
                  className="text-[11px] border-assembly-accent/30 text-assembly-accent shrink-0 mt-0.5"
                >
                  입법예고
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                    {item.data.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {item.data.committee}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                      <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
                      {item.data.deadlineDt}
                    </span>
                  </div>
                </div>
              </a>
            ) : (
              <a
                key={item.data.billNo}
                href={item.data.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-lg border border-border bg-card shadow-sm p-2.5 flex items-start gap-2",
                  "transition-all duration-200 ease-out hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <HugeiconsIcon icon={LegalDocument01Icon} size={12} strokeWidth={2} className="text-muted-foreground" />
                  {item.data.result && (
                    <Badge variant="secondary" className="text-[11px]">
                      {item.data.result}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                    {item.data.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {item.data.kind} / {item.data.proposerKind}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {item.data.proposeDt}
                    </span>
                  </div>
                </div>
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}
