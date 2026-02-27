import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  ArrowRight01Icon,
  Building02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CATEGORY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { Policy } from "@/lib/types";

interface PolicyCardProps {
  policy: Policy;
}

export function PolicyCard({ policy }: PolicyCardProps) {
  // 첫 번째 카테고리 라벨 가져오기
  const categoryLabel =
    policy.targetCategories.length > 0
      ? CATEGORY_LABEL_MAP[policy.targetCategories[0]]
      : null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        {/* 헤더: 정책명 + 카테고리 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm text-foreground">
            {policy.title}
          </h4>
          {categoryLabel && (
            <Badge variant="outline" className="text-xs shrink-0">
              {categoryLabel}
            </Badge>
          )}
        </div>

        {/* 지원기관 */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <HugeiconsIcon icon={Building02Icon} size={12} strokeWidth={2} />
          {policy.provider}
        </div>

        {/* 지원 내용 */}
        <p className="text-sm text-foreground mb-2">{policy.benefit}</p>

        {/* 대상 조건 */}
        <p className="text-xs text-muted-foreground mb-3">
          <span className="font-medium">대상:</span> {policy.eligibility}
        </p>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:${policy.contact}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 text-xs gap-1"
            )}
          >
            <HugeiconsIcon icon={Call02Icon} size={12} strokeWidth={2} />
            {policy.contact}
          </a>
          <a
            href={policy.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-7 text-xs gap-1"
            )}
          >
            자세히 보기
            <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
