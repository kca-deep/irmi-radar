/**
 * 기분석 기사 재분석 + 비교 스크립트
 * 기존 분석 결과를 백업한 후 개선된 프롬프트로 재분석하고 결과를 비교
 *
 * Usage: npx tsx scripts/reanalyze-compare.ts [--limit N] [--concurrency N]
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Database from "better-sqlite3";
import { join } from "path";
import { readFileSync } from "fs";

// ai-client를 직접 import 할 수 없으므로 OpenAI 직접 호출
import OpenAI from "openai";

const DB_PATH = join(process.cwd(), "data/irmi.db");

// -- 타입 --

interface OldAnalysis {
  article_id: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: string;
  category_label: string | null;
  risk_score: number;
  severity: string;
  key_factors: string;
  ai_summary: string;
}

interface NewResult {
  keywords: string[];
  risk_score: number;
  severity: string;
  key_factors: string[];
  impact_region: string | null;
  summary: string;
}

// -- 설정 --

const args = process.argv.slice(2);
function getArg(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? parseInt(args[idx + 1], 10) : defaultVal;
}

const LIMIT = getArg("limit", 120);
const CONCURRENCY = getArg("concurrency", 5);

// -- OpenAI 클라이언트 --

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";

// -- 프롬프트 로드 --

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), "lib/analysis/prompts/article-analysis.md"),
  "utf-8"
);

// -- LLM 호출 --

async function callLLM(system: string, user: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });
  return response.choices[0]?.message?.content || "";
}

// -- 단건 분석 --

async function analyzeOne(article: OldAnalysis): Promise<NewResult> {
  const contentSnippet = article.content
    ? `\n본문(발췌): ${article.content.slice(0, 500)}`
    : "";

  const userPrompt = `카테고리: ${article.category_label || article.category} (${article.category})
제목: ${article.title}
요약: ${article.summary || ""}${contentSnippet}`;

  const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  const riskScore = Math.max(0, Math.min(100, Number(parsed.risk_score) || 0));
  let severity = "safe";
  if (riskScore >= 80) severity = "critical";
  else if (riskScore >= 60) severity = "warning";
  else if (riskScore >= 40) severity = "caution";

  return {
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === "string").slice(0, 10)
      : [],
    risk_score: riskScore,
    severity,
    key_factors: Array.isArray(parsed.key_factors)
      ? parsed.key_factors.filter((k: unknown) => typeof k === "string").slice(0, 5)
      : [],
    impact_region: typeof parsed.impact_region === "string" ? parsed.impact_region : null,
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 150) : "",
  };
}

// -- 동시성 제어 --

async function runConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<(R | Error)[]> {
  const results: (R | Error)[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        results[i] = err as Error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

// -- 메인 --

async function main() {
  const db = new Database(DB_PATH);

  // 1. 기존 분석 결과 + 기사 정보 조회
  const oldResults = db.prepare(`
    SELECT a.id as article_id, a.title, a.summary, a.content, a.category, a.category_label,
           an.risk_score, an.severity, an.key_factors, an.ai_summary
    FROM articles a
    JOIN analysis an ON a.id = an.article_id
    ORDER BY a.published_at DESC
    LIMIT ?
  `).all(LIMIT) as OldAnalysis[];

  console.log(`\n[재분석] 대상: ${oldResults.length}건 | 모델: ${MODEL} | 동시성: ${CONCURRENCY}\n`);

  // 2. 재분석 실행
  const start = Date.now();
  let success = 0;
  let failed = 0;

  const newResults = await runConcurrent(
    oldResults,
    async (old) => {
      const result = await analyzeOne(old);
      success++;
      process.stdout.write(`\r  진행: ${success + failed}/${oldResults.length} (성공: ${success}, 실패: ${failed})`);
      return result;
    },
    CONCURRENCY
  );

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n\n[완료] ${elapsed}초 | 성공: ${success} | 실패: ${failed}\n`);

  // 3. 비교 분석
  console.log("=" .repeat(100));
  console.log("                              [비교 분석 결과]");
  console.log("=" .repeat(100));

  const comparisons: {
    id: string;
    title: string;
    oldSummary: string;
    newSummary: string;
    oldScore: number;
    newScore: number;
    oldFactors: string[];
    newFactors: string[];
  }[] = [];

  let scoreDiffSum = 0;
  let scoreDiffCount = 0;
  let improvedCount = 0;

  for (let i = 0; i < oldResults.length; i++) {
    const old = oldResults[i];
    const newRes = newResults[i];
    if (newRes instanceof Error) continue;

    const oldFactors = JSON.parse(old.key_factors || "[]") as string[];
    const scoreDiff = newRes.risk_score - old.risk_score;
    scoreDiffSum += Math.abs(scoreDiff);
    scoreDiffCount++;

    // 새 요약에 숫자가 포함되면 개선된 것으로 판정
    const hasNumbers = /\d/.test(newRes.summary);
    if (hasNumbers) improvedCount++;

    comparisons.push({
      id: old.article_id,
      title: old.title.slice(0, 40),
      oldSummary: old.ai_summary,
      newSummary: newRes.summary,
      oldScore: old.risk_score,
      newScore: newRes.risk_score,
      oldFactors,
      newFactors: newRes.key_factors,
    });
  }

  // 상위 10건 상세 출력
  console.log("\n[상세 비교 - 상위 10건]\n");
  for (const comp of comparisons.slice(0, 10)) {
    console.log(`--- ${comp.id}: ${comp.title} ---`);
    console.log(`  [기존] 점수: ${comp.oldScore} | 요약: ${comp.oldSummary}`);
    console.log(`  [개선] 점수: ${comp.newScore} | 요약: ${comp.newSummary}`);
    console.log(`  [기존 요인] ${comp.oldFactors.join(" / ")}`);
    console.log(`  [개선 요인] ${comp.newFactors.join(" / ")}`);
    console.log();
  }

  // 통계 요약
  console.log("=" .repeat(100));
  console.log("[통계 요약]");
  console.log(`  총 비교 건수: ${scoreDiffCount}`);
  console.log(`  평균 점수 변동 폭: ${(scoreDiffSum / scoreDiffCount).toFixed(1)}`);
  console.log(`  구체적 수치 포함 요약: ${improvedCount}/${scoreDiffCount} (${((improvedCount / scoreDiffCount) * 100).toFixed(1)}%)`);

  const oldAvg = comparisons.reduce((s, c) => s + c.oldScore, 0) / comparisons.length;
  const newAvg = comparisons.reduce((s, c) => s + c.newScore, 0) / comparisons.length;
  console.log(`  기존 평균 점수: ${oldAvg.toFixed(1)}`);
  console.log(`  개선 평균 점수: ${newAvg.toFixed(1)}`);
  console.log("=" .repeat(100));

  // 4. DB 업데이트 여부 확인
  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question("\n개선된 결과로 DB를 업데이트하시겠습니까? (y/N): ", resolve);
  });
  rl.close();

  if (answer.toLowerCase() === "y") {
    const updateStmt = db.prepare(`
      UPDATE analysis SET risk_score = ?, severity = ?, key_factors = ?, ai_summary = ?, analyzed_at = datetime('now')
      WHERE article_id = ?
    `);
    const updateKeywords = db.prepare(`
      UPDATE articles SET keywords = ? WHERE id = ?
    `);

    const txn = db.transaction(() => {
      for (let i = 0; i < oldResults.length; i++) {
        const newRes = newResults[i];
        if (newRes instanceof Error) continue;
        const old = oldResults[i];

        updateStmt.run(
          newRes.risk_score,
          newRes.severity,
          JSON.stringify(newRes.key_factors),
          newRes.summary,
          old.article_id
        );
        if (newRes.keywords.length > 0) {
          updateKeywords.run(JSON.stringify(newRes.keywords), old.article_id);
        }
      }
    });
    txn();
    console.log(`\nDB 업데이트 완료: ${success}건`);
  } else {
    console.log("\nDB 업데이트를 건너뛰었습니다.");
  }

  db.close();
}

main().catch(console.error);
