"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Legal01Icon,
  LegalDocument01Icon,
  Calendar03Icon,
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
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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

  const allItems = [
    ...legislation.map((l) => ({ type: "legislation" as const, data: l })),
    ...bills.map((b) => ({ type: "bill" as const, data: b })),
  ];

  if (!loading && allItems.length === 0) return null;

  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-3">
        <HugeiconsIcon
          icon={Legal01Icon}
          size={14}
          strokeWidth={2}
          className="text-brand"
        />
        관련 국회 동향
        {!loading && (
          <Badge variant="secondary" className="text-[10px] ml-1">
            {allItems.length}건
          </Badge>
        )}
        {!loading && allItems.length > 3 && (
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
            {allItems.map((item) =>
              item.type === "legislation" ? (
                <CarouselItem key={item.data.billNo} className="pl-2 basis-1/3">
                  <a
                    href={item.data.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "h-(--height-signal-card) rounded-lg border border-border bg-card shadow-sm p-2.5 flex flex-col gap-1 overflow-hidden",
                      "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
                    )}
                  >
                    <Badge
                      variant="outline"
                      className="text-[9px] border-assembly-accent/30 text-assembly-accent w-fit"
                    >
                      입법예고
                    </Badge>
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                      {item.data.name}
                    </p>
                    <div className="space-y-0.5 mt-auto">
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.data.committee}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <HugeiconsIcon
                          icon={Calendar03Icon}
                          size={9}
                          strokeWidth={2}
                          className="shrink-0"
                        />
                        마감 {item.data.deadlineDt}
                      </p>
                    </div>
                  </a>
                </CarouselItem>
              ) : (
                <CarouselItem key={item.data.billNo} className="pl-2 basis-1/3">
                  <a
                    href={item.data.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "h-(--height-signal-card) rounded-lg border border-border bg-card shadow-sm p-2.5 flex flex-col gap-1 overflow-hidden",
                      "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <HugeiconsIcon
                        icon={LegalDocument01Icon}
                        size={10}
                        strokeWidth={2}
                        className="text-muted-foreground shrink-0"
                      />
                      {item.data.result && (
                        <Badge variant="secondary" className="text-[9px]">
                          {item.data.result}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                      {item.data.name}
                    </p>
                    <div className="space-y-0.5 mt-auto">
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.data.kind} / {item.data.proposerKind}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.data.proposeDt}
                      </p>
                    </div>
                  </a>
                </CarouselItem>
              )
            )}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
}
