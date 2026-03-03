import { DashboardPage } from "@/components/dashboard/dashboard-page";

import type { DashboardData, BriefingData, CrisisChainData, NewsArticle } from "@/lib/types";

import dashboardJson from "@/data/mock/dashboard.json";
import briefingJson from "@/data/mock/briefing.json";
import crisisChainJson from "@/data/mock/crisis-chain.json";
import newsJson from "@/data/mock/news.json";

const dashboard = dashboardJson as DashboardData;
const briefing = briefingJson as BriefingData;
const crisisChain = crisisChainJson as CrisisChainData;
const articles = newsJson as NewsArticle[];

export default function Page() {
  return (
    <DashboardPage
      dashboard={dashboard}
      briefing={briefing}
      crisisChain={crisisChain}
      articles={articles}
    />
  );
}
