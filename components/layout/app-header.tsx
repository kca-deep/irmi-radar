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
  Radar01Icon,
  NotificationIcon,
  DashboardSquare01Icon,
  Alert02Icon,
  News01Icon,
  MapsLocation01Icon,
} from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
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
  { href: "/regions", label: "지역별 현황", icon: MapsLocation01Icon },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <HugeiconsIcon
              icon={Radar01Icon}
              size={18}
              strokeWidth={2}
              className="text-primary-foreground"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              이르미
            </span>
            <span className="hidden text-[10px] leading-none text-muted-foreground sm:block">
              민생위기 조기경보 레이더
            </span>
          </div>
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
                    "relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon icon={tab.icon} size={15} strokeWidth={2} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Right: Controls */}
        <div className="flex shrink-0 items-center gap-2">
          <Select items={periodItems} defaultValue="1w">
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
