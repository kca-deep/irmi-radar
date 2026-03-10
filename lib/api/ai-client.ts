/**
 * 통합 AI 클라이언트
 * AI_PROVIDER 환경변수에 따라 OpenAI / Anthropic 분기
 *
 * 서버 컴포넌트 / API Route 전용 (클라이언트 사용 금지)
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// -- 프로바이더 타입 --

export type AIProvider = "openai" | "anthropic";

// -- 토큰 사용량 추적 --

export interface TokenUsage {
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: string;
}

export interface UsageSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  calls: TokenUsage[];
}

/** 모델별 토큰 단가 (USD per 1M tokens) */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4.1-nano": { input: 0.10, output: 0.40 },
  "gpt-4.1-mini": { input: 0.40, output: 1.60 },
  "gpt-4.1": { input: 2.00, output: 8.00 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  // Anthropic
  "claude-sonnet-4-6": { input: 3.00, output: 15.00 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.00 },
  "claude-opus-4-6": { input: 15.00, output: 75.00 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

class UsageTracker {
  private calls: TokenUsage[] = [];

  record(usage: TokenUsage) {
    this.calls.push(usage);
  }

  getSummary(): UsageSummary {
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    for (const c of this.calls) {
      totalInput += c.inputTokens;
      totalOutput += c.outputTokens;
      totalCost += c.estimatedCost;
    }
    return {
      totalCalls: this.calls.length,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      totalCost,
      calls: [...this.calls],
    };
  }

  reset() {
    this.calls = [];
  }
}

/** 전역 사용량 추적기 (세션/프로세스 단위) */
export const usageTracker = new UsageTracker();

// -- 설정 읽기 --

export function getProvider(): AIProvider {
  const env = process.env.AI_PROVIDER;
  if (env === "anthropic") return "anthropic";
  return "openai";
}

export function getModel(): string {
  const provider = getProvider();
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  }
  return process.env.OPENAI_MODEL || "gpt-4.1-nano";
}

// -- SDK 싱글턴 --

let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

// -- 통합 호출 인터페이스 --

export interface LLMCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * LLM API 통합 호출
 * AI_PROVIDER에 따라 OpenAI 또는 Anthropic SDK를 사용
 * 토큰 사용량은 usageTracker에 자동 누적
 */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const { system, user, maxTokens = 1024, temperature = 0.3 } = options;
  const provider = getProvider();
  const model = getModel();

  const userPreview = user.length > 100 ? user.slice(0, 100) + "..." : user;
  console.log(`[LLM] 호출 시작 - provider: ${provider}, model: ${model}, maxTokens: ${maxTokens}`);
  console.log(`[LLM] 프롬프트: ${userPreview}`);

  const startTime = Date.now();

  let result: string;
  if (provider === "openai") {
    result = await callOpenAI({ system, user, maxTokens, temperature, model });
  } else {
    result = await callAnthropic({ system, user, maxTokens, temperature, model });
  }

  const elapsed = Date.now() - startTime;
  const summary = usageTracker.getSummary();
  const lastCall = summary.calls[summary.calls.length - 1];
  console.log(`[LLM] 호출 완료 (${elapsed}ms) - 토큰: ${lastCall?.inputTokens ?? 0}in/${lastCall?.outputTokens ?? 0}out, 비용: $${(lastCall?.estimatedCost ?? 0).toFixed(6)}`);
  console.log(`[LLM] 누적: ${summary.totalCalls}회, ${summary.totalTokens}토큰, $${summary.totalCost.toFixed(4)}`);

  return result;
}

// -- OpenAI 호출 --

async function callOpenAI(params: {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  model: string;
}): Promise<string> {
  const client = getOpenAI();
  const response = await client.chat.completions.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  usageTracker.record({
    provider: "openai",
    model: params.model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: estimateCost(params.model, inputTokens, outputTokens),
    timestamp: new Date().toISOString(),
  });

  return response.choices[0]?.message?.content || "";
}

// -- Anthropic 호출 --

async function callAnthropic(params: {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  model: string;
}): Promise<string> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  usageTracker.record({
    provider: "anthropic",
    model: params.model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: estimateCost(params.model, inputTokens, outputTokens),
    timestamp: new Date().toISOString(),
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
