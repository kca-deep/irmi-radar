import { DashboardPage } from "@/components/dashboard/dashboard-page";

import type { DashboardData, BriefingData } from "@/lib/types";

import dashboardJson from "@/data/mock/dashboard.json";
import briefingJson from "@/data/mock/briefing.json";

const dashboard = dashboardJson as DashboardData;
const briefing = briefingJson as BriefingData;

export default function Page() {
  return <DashboardPage dashboard={dashboard} briefing={briefing} />;
}
