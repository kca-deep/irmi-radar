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

// -- 카테고리별 배지 색상 --
export const CATEGORY_BADGE_MAP: Record<CategoryKey, string> = {
  prices: "bg-cat-prices/10 text-cat-prices border-cat-prices/30",
  employment: "bg-cat-employment/10 text-cat-employment border-cat-employment/30",
  selfEmployed: "bg-cat-self-employed/10 text-cat-self-employed border-cat-self-employed/30",
  finance: "bg-cat-finance/10 text-cat-finance border-cat-finance/30",
  realEstate: "bg-cat-real-estate/10 text-cat-real-estate border-cat-real-estate/30",
};

// -- 카테고리별 도트 색상 (범례용) --
export const CATEGORY_DOT_MAP: Record<CategoryKey, string> = {
  prices: "bg-cat-prices",
  employment: "bg-cat-employment",
  selfEmployed: "bg-cat-self-employed",
  finance: "bg-cat-finance",
  realEstate: "bg-cat-real-estate",
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
