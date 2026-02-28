import type {
  DashboardData,
  BriefingData,
  CrisisChainData,
  Signal,
  NewsArticle,
  Policy,
  ChatData,
  CategoryKey,
  Severity,
} from "@/lib/types";

// Mock JSON imports
import dashboardJson from "@/data/mock/dashboard.json";
import briefingJson from "@/data/mock/briefing.json";
import crisisChainJson from "@/data/mock/crisis-chain.json";
import signalsJson from "@/data/mock/signals.json";
import newsJson from "@/data/mock/news.json";
import policiesJson from "@/data/mock/policies.json";
import chatJson from "@/data/mock/chat-examples.json";

// -- Dashboard --
export function loadDashboard(): DashboardData {
  return dashboardJson as DashboardData;
}

// -- Briefing --
export function loadBriefing(): BriefingData {
  return briefingJson as BriefingData;
}

// -- Crisis Chain --
export function loadCrisisChain(): CrisisChainData {
  return crisisChainJson as CrisisChainData;
}

// -- Signals --
export function loadSignals(filters?: {
  category?: CategoryKey;
  region?: string;
  severity?: Severity;
}): Signal[] {
  let signals = signalsJson as Signal[];

  if (filters?.category) {
    signals = signals.filter((s) => s.category === filters.category);
  }
  if (filters?.region) {
    signals = signals.filter((s) => s.region === filters.region);
  }
  if (filters?.severity) {
    signals = signals.filter((s) => s.severity === filters.severity);
  }

  return signals;
}

export function loadSignalById(id: string): Signal | null {
  const signals = signalsJson as Signal[];
  return signals.find((s) => s.id === id) ?? null;
}

// -- News --
export function loadNews(filters?: {
  keyword?: string;
  category?: CategoryKey;
}): NewsArticle[] {
  let news = newsJson as NewsArticle[];

  if (filters?.category) {
    news = news.filter((n) => n.category === filters.category);
  }
  if (filters?.keyword) {
    const keyword = filters.keyword.toLowerCase();
    news = news.filter(
      (n) =>
        n.title.toLowerCase().includes(keyword) ||
        n.summary.toLowerCase().includes(keyword) ||
        n.keywords.some((k) => k.toLowerCase().includes(keyword))
    );
  }

  return news;
}

// -- Policies --
export function loadPolicies(filters?: {
  category?: CategoryKey;
  region?: string;
  signalId?: string;
}): Policy[] {
  let policies = policiesJson as Policy[];

  if (filters?.category) {
    policies = policies.filter((p) =>
      p.targetCategories.includes(filters.category!)
    );
  }
  if (filters?.region) {
    policies = policies.filter(
      (p) =>
        p.targetRegions.includes(filters.region!) ||
        p.targetRegions.includes("전국")
    );
  }
  if (filters?.signalId) {
    policies = policies.filter((p) =>
      p.relatedSignals.includes(filters.signalId!)
    );
  }

  return policies;
}

// -- Chat --
export function loadChatData(): ChatData {
  return chatJson as ChatData;
}

export function findChatResponse(message: string): {
  answer: string;
  relatedSignals: string[];
} {
  const chatData = loadChatData();
  const lowerMessage = message.toLowerCase();

  // 키워드 매칭
  for (const example of chatData.examples) {
    const questionKeywords = example.question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const matchCount = questionKeywords.filter((keyword) =>
      lowerMessage.includes(keyword)
    ).length;

    if (matchCount >= 2 || lowerMessage.includes(example.question.slice(0, 10).toLowerCase())) {
      return {
        answer: example.answer,
        relatedSignals: example.relatedSignals,
      };
    }
  }

  // 기본 응답
  return {
    answer:
      "죄송합니다, 해당 질문에 대한 정보를 찾지 못했습니다. 다른 질문을 해주시거나, 위기 신호 탭에서 직접 확인해 보세요.",
    relatedSignals: [],
  };
}
