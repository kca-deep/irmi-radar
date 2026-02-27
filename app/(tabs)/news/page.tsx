import { NewsPage } from "@/components/news/news-page";
import newsData from "@/data/mock/news.json";

import type { NewsArticle } from "@/lib/types";

export default function NewsRoute() {
  const articles = newsData as NewsArticle[];

  return <NewsPage articles={articles} />;
}
