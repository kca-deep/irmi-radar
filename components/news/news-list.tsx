"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { NewsCard } from "./news-card";

import type { NewsArticle } from "@/lib/types";

interface NewsListProps {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
}

export function NewsList({ articles, onArticleClick }: NewsListProps) {
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(160px,auto)]">
      {articles.map((article, index) => (
        <div
          key={article.id}
          className={cn(index === 0 && "sm:col-span-2 lg:col-span-3")}
        >
          <NewsCard
            article={article}
            featured={index === 0}
            onClick={onArticleClick}
          />
        </div>
      ))}
    </div>
  );
}
