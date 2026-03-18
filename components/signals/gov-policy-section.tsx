"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
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
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  if (!loading && policies.length === 0) return null;

  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-3">
        <HugeiconsIcon
          icon={Wallet01Icon}
          size={14}
          strokeWidth={2}
          className="text-brand"
        />
        관련 지원정책
        {!loading && (
          <Badge variant="secondary" className="text-[10px] ml-1">
            {policies.length}건
          </Badge>
        )}
        {!loading && policies.length > 3 && (
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="outline"
              size="icon"
              className="size-6 rounded-full"
              disabled={!canPrev}
              onClick={() => api?.scrollPrev()}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-6 rounded-full"
              disabled={!canNext}
              onClick={() => api?.scrollNext()}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
            </Button>
          </div>
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
        <Carousel opts={{ slidesToScroll: 3, align: "start" }} setApi={setApi} className="w-full">
          <CarouselContent className="-ml-2">
            {policies.map((policy) => (
              <CarouselItem key={policy.id} className="pl-2 basis-1/3">
                <a
                  href={policy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "h-(--height-signal-card) rounded-lg border border-border bg-card shadow-sm p-2.5 flex flex-col overflow-hidden",
                    "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
                  )}
                >
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                    {policy.title}
                  </p>

                  {policy.benefit && (
                    <p className="text-[11px] text-foreground/70 leading-snug line-clamp-2">
                      {policy.benefit}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-1 mt-auto">
                    <span className="text-[10px] text-muted-foreground truncate min-w-0">
                      {policy.provider}
                    </span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={9}
                      strokeWidth={2}
                      className="text-muted-foreground shrink-0"
                    />
                  </div>
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
}
