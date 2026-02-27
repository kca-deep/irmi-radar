import { AppHeader } from "@/components/layout/app-header";
import { PeriodProvider } from "@/contexts/period-context";
import { ChatFab } from "@/components/chat/chat-fab";
import chatData from "@/data/mock/chat-examples.json";

import type { ChatData } from "@/lib/types";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PeriodProvider>
      <div className="relative min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
        {/* AI 채팅 플로팅 버튼 */}
        <ChatFab chatData={chatData as ChatData} />
      </div>
    </PeriodProvider>
  );
}
