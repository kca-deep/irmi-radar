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
  return process.env.OPENAI_MODEL || "gpt-4o-nano";
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
 */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const { system, user, maxTokens = 1024, temperature = 0.3 } = options;
  const provider = getProvider();
  const model = getModel();

  if (provider === "openai") {
    return callOpenAI({ system, user, maxTokens, temperature, model });
  }
  return callAnthropic({ system, user, maxTokens, temperature, model });
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

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
