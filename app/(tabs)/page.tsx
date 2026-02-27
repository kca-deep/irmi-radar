import { DashboardPage } from "@/components/dashboard/dashboard-page";

import type { DashboardData, BriefingData, CrisisChainData } from "@/lib/types";

import dashboardJson from "@/data/mock/dashboard.json";
import briefingJson from "@/data/mock/briefing.json";
import crisisChainJson from "@/data/mock/crisis-chain.json";

const dashboard = dashboardJson as DashboardData;
const briefing = briefingJson as BriefingData;
const crisisChain = crisisChainJson as CrisisChainData;

export default function Page() {
  return (
    <DashboardPage
      dashboard={dashboard}
      briefing={briefing}
      crisisChain={crisisChain}
    />
  );
}
