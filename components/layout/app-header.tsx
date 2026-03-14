"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERIOD_OPTIONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  NotificationIcon,
  DashboardSquare01Icon,
  Alert02Icon,
  News01Icon,
} from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePeriod } from "@/contexts/period-context";
import { cn } from "@/lib/utils";
import type { PeriodKey } from "@/lib/types";
import type { IconSvgElement } from "@hugeicons/react";

const periodItems = PERIOD_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

interface TabItem {
  href: string;
  label: string;
  icon: IconSvgElement;
}

const TABS: TabItem[] = [
  { href: "/", label: "대시보드", icon: DashboardSquare01Icon },
  { href: "/signals", label: "위기 신호", icon: Alert02Icon },
  { href: "/news", label: "뉴스 분석", icon: News01Icon },
];

export function AppHeader() {
  const pathname = usePathname();
  const { period, setPeriod } = usePeriod();

  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-50 w-full border-b border-border bg-card"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <div
          className="flex shrink-0 items-baseline"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "22px", letterSpacing: "0.06em", gap: "6px" }}
        >
          <span style={{ fontWeight: 900 }} className="text-foreground">IRMI</span>
          <span className="inline-block size-1.5 rounded-full bg-brand" style={{ marginLeft: "-2px", marginRight: "2px", alignSelf: "center" }} />
          <span style={{ fontWeight: 300 }} className="text-foreground/70">Radar</span>
        </div>

        {/* Center: Navigation */}
        <nav
          data-slot="tab-navigation"
          className="flex flex-1 items-center justify-center"
        >
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200",
                    isActive
                      ? "text-brand-muted font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon icon={tab.icon} size={15} strokeWidth={2} />
                  <span>{tab.label}</span>
                  {/* Active underline bar */}
                  {isActive && (
                    <span className="absolute inset-x-1 -bottom-[9px] h-[2px] rounded-full bg-brand" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Right: Controls */}
        <div className="flex shrink-0 items-center gap-2">
          <Select items={periodItems} value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger size="sm" className="w-[110px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {periodItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <ThemeToggle />

          <Button variant="ghost" size="icon" className="size-8">
            <HugeiconsIcon
              icon={NotificationIcon}
              size={16}
              strokeWidth={2}
              className="text-muted-foreground"
            />
            <span className="sr-only">알림 설정</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
