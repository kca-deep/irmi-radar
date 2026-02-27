import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  LegalDocument01Icon,
} from "@hugeicons/core-free-icons";
import { PolicyCard } from "@/components/signals/policy-card";

import type { Signal, Policy } from "@/lib/types";

interface ActionGuideSectionProps {
  signal: Signal;
  policies: Policy[];
}

export function ActionGuideSection({
  signal,
  policies,
}: ActionGuideSectionProps) {
  // 정책 매칭 로직: relatedSignals 우선, 그 다음 targetCategories
  const matchedPolicies = policies.filter((policy) => {
    // 1. relatedSignals에 신호 ID가 있으면 최우선 매칭
    if (policy.relatedSignals.includes(signal.id)) {
      return true;
    }
    // 2. targetCategories에 신호 카테고리가 있으면 매칭
    if (policy.targetCategories.includes(signal.category)) {
      return true;
    }
    return false;
  });

  return (
    <div className="space-y-6">
      {/* 대응 가이드 */}
      <div>
        <h4 className="flex items-center gap-2 font-semibold text-sm mb-3">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={2}
            className="text-primary"
          />
          대응 가이드
        </h4>
        <ol className="space-y-2 pl-1">
          {signal.analysis.actionPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 관련 지원 정책 */}
      {matchedPolicies.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-sm mb-3">
            <HugeiconsIcon
              icon={LegalDocument01Icon}
              size={16}
              strokeWidth={2}
              className="text-primary"
            />
            관련 지원 정책
          </h4>
          <div className="space-y-3">
            {matchedPolicies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
