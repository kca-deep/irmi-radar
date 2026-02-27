"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { NewsCard } from "./news-card";

import type { NewsArticle } from "@/lib/types";

interface NewsListProps {
  articles: NewsArticle[];
}

export function NewsList({ articles }: NewsListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
          <HugeiconsIcon
            icon={Search01Icon}
            size={24}
            strokeWidth={2}
            className="text-muted-foreground"
          />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          검색 결과가 없습니다
        </p>
        <p className="text-xs text-muted-foreground">
          다른 검색어나 필터를 시도해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
