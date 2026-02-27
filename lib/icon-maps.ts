import type { IconSvgElement } from "@hugeicons/react";
import {
  ShoppingCart01Icon,
  Briefcase01Icon,
  Store04Icon,
  BankIcon,
  Building01Icon,
  ArrowUp01Icon,
  MinusSignIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

import type { CategoryKey, Severity, Trend } from "@/lib/types";

// -- 카테고리별 아이콘 --
export const CATEGORY_ICON_MAP: Record<CategoryKey, IconSvgElement> = {
  prices: ShoppingCart01Icon,
  employment: Briefcase01Icon,
  selfEmployed: Store04Icon,
  finance: BankIcon,
  realEstate: Building01Icon,
};

// -- 등급별 CSS 색상 토큰 --
export const SEVERITY_COLOR_MAP: Record<Severity, string> = {
  critical: "danger",
  warning: "warning",
  caution: "caution",
  safe: "safe",
};

// -- 추세별 아이콘 + 라벨 --
export const TREND_ICON_MAP: Record<
  Trend,
  { icon: IconSvgElement; label: string }
> = {
  rising: { icon: ArrowUp01Icon, label: "상승" },
  stable: { icon: MinusSignIcon, label: "보합" },
  falling: { icon: ArrowDown01Icon, label: "하락" },
};
