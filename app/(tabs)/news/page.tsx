import { NewsPage } from "@/components/news/news-page";
import { loadNews, loadNewsCount } from "@/lib/api/data-source";
import { NEWS_PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function NewsRoute() {
  const articles = loadNews({ limit: NEWS_PAGE_SIZE, offset: 0 });
  const totalCount = loadNewsCount();

  return <NewsPage initialArticles={articles} totalCount={totalCount} pageSize={NEWS_PAGE_SIZE} />;
}
