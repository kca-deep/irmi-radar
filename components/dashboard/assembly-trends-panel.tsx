"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Legal01Icon,
  UserMultipleIcon,
  LegalDocument01Icon,
  Calendar03Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { AssemblyPetition, AssemblyLegislation } from "@/lib/types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function AssemblyTrendsPanel() {
  const [petitions, setPetitions] = useState<AssemblyPetition[]>([]);
  const [legislation, setLegislation] = useState<AssemblyLegislation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [petRes, legRes] = await Promise.all([
          fetch("/api/assembly?type=petitions&limit=5"),
          fetch("/api/assembly?type=legislation&limit=5"),
        ]);

        const petData: ApiResponse<AssemblyPetition[]> = await petRes.json();
        const legData: ApiResponse<AssemblyLegislation[]> = await legRes.json();

        if (petData.success && petData.data) setPetitions(petData.data);
        if (legData.success && legData.data) setLegislation(legData.data);

        if (!petData.success && !legData.success) {
          setError(petData.error || legData.error || "데이터를 불러올 수 없습니다.");
        }
      } catch {
        setError("국회 API 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      {/* 헤더 - 위기연쇄현황 패턴 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Legal01Icon}
            size={18}
            strokeWidth={2}
            className="text-assembly-accent"
          />
          <h3 className="text-sm font-semibold text-foreground">국회 동향</h3>
        </div>
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

      {/* 콘텐츠 */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 좌: 청원 계류현황 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={UserMultipleIcon}
                size={14}
                strokeWidth={2}
                className="text-assembly-accent"
              />
              <span className="font-medium text-xs text-foreground">
                시민 청원
              </span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {petitions.length}건
              </Badge>
            </div>
            <div className="space-y-2">
              {petitions.map((p) => (
                <PetitionCard key={p.billNo} petition={p} />
              ))}
              {petitions.length === 0 && (
                <EmptyState text="계류 중인 청원이 없습니다." />
              )}
            </div>
          </div>

          {/* 우: 진행중 입법예고 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={LegalDocument01Icon}
                size={14}
                strokeWidth={2}
                className="text-assembly-accent"
              />
              <span className="font-medium text-xs text-foreground">
                입법예고
              </span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {legislation.length}건
              </Badge>
            </div>
            <div className="space-y-2">
              {legislation.map((l) => (
                <LegislationCard key={l.billNo} legislation={l} />
              ))}
              {legislation.length === 0 && (
                <EmptyState text="진행중인 입법예고가 없습니다." />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PetitionCard({ petition }: { petition: AssemblyPetition }) {
  return (
    <a
      href={petition.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg border border-border/50 bg-background/60 p-3 space-y-1.5",
        "transition-colors hover:bg-background/80"
      )}
    >
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
        {petition.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground line-clamp-1">
          {petition.proposer}
        </span>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {petition.committee}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
          {petition.proposeDt}
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={10}
          strokeWidth={2}
          className="text-muted-foreground"
        />
      </div>
    </a>
  );
}

function LegislationCard({ legislation }: { legislation: AssemblyLegislation }) {
  const isNearDeadline = (() => {
    const deadline = new Date(legislation.deadlineDt);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  })();

  return (
    <a
      href={legislation.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg border border-border/50 bg-background/60 p-3 space-y-1.5",
        "transition-colors hover:bg-background/80"
      )}
    >
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
        {legislation.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground line-clamp-1">
          {legislation.proposer}
        </span>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {legislation.committee}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[10px] flex items-center gap-1",
            isNearDeadline ? "text-warning font-medium" : "text-muted-foreground"
          )}
        >
          <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
          마감 {legislation.deadlineDt}
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={10}
          strokeWidth={2}
          className="text-muted-foreground"
        />
      </div>
    </a>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-4 text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}
