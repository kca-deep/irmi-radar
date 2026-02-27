"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { News01Icon } from "@hugeicons/core-free-icons";
import { NewsFilterBar } from "./news-filter-bar";
import { NewsList } from "./news-list";

import type { NewsArticle, CategoryKey } from "@/lib/types";

interface NewsPageProps {
  articles: NewsArticle[];
}

export function NewsPage({ articles }: NewsPageProps) {
  // 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey | "all">("all");

  // 필터링된 뉴스 목록
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // 카테고리 필터
      if (category !== "all" && article.category !== category) {
        return false;
      }

      // 검색어 필터 (제목, 요약, 키워드에서 검색)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = article.title.toLowerCase().includes(query);
        const matchSummary = article.summary.toLowerCase().includes(query);
        const matchKeywords = article.keywords.some((kw) =>
          kw.toLowerCase().includes(query)
        );

        if (!matchTitle && !matchSummary && !matchKeywords) {
          return false;
        }
      }

      return true;
    });
  }, [articles, category, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <HugeiconsIcon
            icon={News01Icon}
            size={24}
            strokeWidth={2}
            className="text-primary"
          />
          뉴스 분석
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI가 분석한 민생 관련 주요 뉴스를 카테고리별로 확인하세요.
        </p>
      </div>

      {/* 필터 바 */}
      <NewsFilterBar
        searchQuery={searchQuery}
        category={category}
        onSearchChange={setSearchQuery}
        onCategoryChange={setCategory}
      />

      {/* 결과 정보 */}
      <div className="text-sm text-muted-foreground">
        {filteredArticles.length}건의 뉴스가 검색되었습니다.
      </div>

      {/* 뉴스 목록 */}
      <NewsList articles={filteredArticles} />
    </div>
  );
}
