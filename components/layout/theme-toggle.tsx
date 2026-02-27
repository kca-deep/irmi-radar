"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={toggleTheme}
    >
      <HugeiconsIcon
        icon={theme === "dark" ? Sun01Icon : Moon02Icon}
        size={16}
        strokeWidth={2}
        className="text-muted-foreground"
      />
      <span className="sr-only">
        {theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      </span>
    </Button>
  );
}
