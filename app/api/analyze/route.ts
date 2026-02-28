import { successResponse, errorResponse } from "@/lib/api/response";
import { loadNews } from "@/lib/api/mock-data";
import { analyzeNews, type AnalysisResult } from "@/lib/api/anthropic";

interface AnalyzeRequest {
  newsIds?: string[];
  category?: string;
  prompt?: string;
}

/**
 * POST /api/analyze
 * 뉴스 기사 AI 분석
 *
 * Body:
 * - newsIds: string[] (선택) - 분석할 뉴스 ID 목록
 * - category: string (선택) - 카테고리별 전체 분석
 * - prompt: string (선택) - 추가 분석 지시
 */
export async function POST(request: Request) {
  try {
    const body: AnalyzeRequest = await request.json();

    const { newsIds, category, prompt } = body;

    // 최소 하나의 필터 필요
    if (!newsIds?.length && !category) {
      return errorResponse(
        "Either newsIds or category is required",
        400
      );
    }

    // 뉴스 기사 로드
    let articles = loadNews();

    if (newsIds?.length) {
      articles = articles.filter((a) => newsIds.includes(a.id));
    }

    if (category) {
      articles = articles.filter((a) => a.category === category);
    }

    if (articles.length === 0) {
      return errorResponse("No articles found for analysis", 404);
    }

    // AI 분석 수행 (현재 Mock)
    const result: AnalysisResult = await analyzeNews(articles, prompt);

    return successResponse(result);
  } catch (error) {
    console.error("Analyze API error:", error);

    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }

    return errorResponse("Failed to analyze news", 500);
  }
}
