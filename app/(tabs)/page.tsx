import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { loadDashboard, loadBriefing, loadCrisisChain, loadNews } from "@/lib/api/data-source";

export const dynamic = "force-dynamic";

export default function Page() {
  const dashboard = loadDashboard();
  const briefing = loadBriefing();
  const crisisChain = loadCrisisChain();
  const articles = loadNews();

  return (
    <DashboardPage
      dashboard={dashboard}
      briefing={briefing}
      crisisChain={crisisChain}
      articles={articles}
    />
  );
}
