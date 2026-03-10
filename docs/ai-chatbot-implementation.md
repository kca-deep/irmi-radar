# AI 챗봇 프로덕션 구현 계획서

> 이르미(IRMI) 민생위기 조기경보 레이더 - AI 어시스턴트 "이르미에게 물어보기"

---

## 1. 현황 분석

### 1.1 현재 구현 상태

| 구분 | 파일 | 상태 | 설명 |
|------|------|------|------|
| FAB 버튼 | `components/chat/chat-fab.tsx` | 완성 | 플로팅 버튼 + 패널 토글 |
| 채팅 패널 | `components/chat/chat-panel.tsx` | Mock | 키워드 매칭 기반 Mock 응답 |
| 메시지 UI | `components/chat/chat-message.tsx` | 기본 | 텍스트만 렌더링, 마크다운 미지원 |
| 입력 UI | `components/chat/chat-input.tsx` | 기본 | 단일 줄 Input, 중단 기능 없음 |
| 추천 질문 | `components/chat/suggested-questions.tsx` | 정적 | JSON에서 고정 질문 4개 로드 |
| API Route | `app/api/chat/route.ts` | 스캐폴딩 | generateChatResponse 호출, 미사용 |
| AI 함수 | `lib/api/anthropic.ts` | 단순 | JSON 응답 요구, 컨텍스트 없음 |
| Mock 데이터 | `data/mock/chat-examples.json` | 완성 | 3개 예시 + 4개 추천 질문 |

### 1.2 핵심 문제점

1. **API Route 미연결**: 프론트엔드가 `/api/chat`을 호출하지 않고 클라이언트에서 직접 키워드 매칭
2. **컨텍스트 부재**: DB의 실시간 데이터(대시보드, 신호, 뉴스 분석결과, 정책)를 전혀 참조하지 않음
3. **스트리밍 미지원**: 타이핑 효과는 `setInterval` 기반 시뮬레이션 (실제 SSE 아님)
4. **마크다운 미지원**: 응답이 plain text로만 렌더링
5. **관련 데이터 미연결**: `relatedSignals`가 Mock ID만 반환, 실제 DB 데이터와 연결 안됨
6. **시스템 프롬프트 빈약**: 이르미 시스템의 풍부한 데이터를 활용하지 못하는 단순 프롬프트

---

## 2. 목표 아키텍처

### 2.1 핵심 차별점

**"실시간 민생 데이터 기반 맥락 인식 대화"** - RAG(Retrieval-Augmented Generation) 패턴 적용

### 2.2 사용자 시나리오

| 사용자 | 질문 예시 | 활용 데이터 |
|--------|----------|------------|
| 지자체 담당자 | "우리 지역 현재 위기 상황 브리핑해줘" | regions, signals, dashboard_cache |
| 소상공인 | "카페 운영자인데 지금 뭘 조심해야 해?" | signals(자영업) + policies + gov_services |
| 일반 시민 | "물가랑 자영업 위험이 왜 동시에 높아?" | crisis_chain + category scores |
| 정책 담당자 | "고용 관련 국회 동향은?" | assembly_petitions + assembly_legislations |

### 2.3 데이터 플로우

```
사용자 질문 입력
  |
  v
[프론트엔드] useChat 훅 --> POST /api/chat (SSE 스트림 요청)
  |
  v
[API Route] /api/chat/route.ts
  |
  +-- 1. 의도 분류 (Intent Classification)
  |     규칙 기반 키워드 매칭 (LLM 호출 없음, 비용 절감)
  |     --> IntentType + 추출된 카테고리/지역/키워드
  |
  +-- 2. 컨텍스트 검색 (Retrieval)
  |     의도에 따라 DB에서 관련 데이터 로드
  |     - getDashboardCache() --> 종합 점수, 브리핑
  |     - getSignals(filters)  --> 관련 위기 신호
  |     - searchArticles(keyword) --> FTS 기사 검색
  |     - getRegionData(region) --> 지역별 현황
  |     - getPolicies(category) --> 관련 지원 정책
  |     - getScoreHistory() --> 점수 추이
  |
  +-- 3. 프롬프트 구성 (Augmentation)
  |     시스템 프롬프트 + 검색된 컨텍스트 + 대화 히스토리 + 사용자 질문
  |
  +-- 4. LLM 스트리밍 호출 (Generation)
  |     callLLMStream() --> 토큰 단위 SSE 전송
  |
  +-- 5. 응답 후처리
        관련 데이터 참조 메타데이터 전송
  |
  v
[프론트엔드] SSE 수신 --> 실시간 메시지 렌더링 + 참조 카드 표시
```

---

## 3. 타입 설계

### 3.1 신규 타입 (`lib/types.ts`에 추가)

```typescript
// -- 채팅 의도 분류 --
export type ChatIntentType =
  | "category_query"   // 특정 카테고리 질문 (물가, 고용 등)
  | "region_query"     // 특정 지역 질문
  | "signal_query"     // 위기 신호 관련 질문
  | "policy_query"     // 지원 정책/대응 관련 질문
  | "general_query"    // 종합 현황/브리핑
  | "comparison"       // 비교/인과관계 질문
  | "assembly_query";  // 국회/입법 동향 질문

export interface ChatIntent {
  type: ChatIntentType;
  categories?: CategoryKey[];   // 감지된 카테고리
  regions?: string[];           // 감지된 지역
  keywords?: string[];          // 추출된 키워드
}

// -- 채팅 컨텍스트 (RAG 검색 결과) --
export interface ChatContext {
  dashboard?: {
    overallScore: number;
    severity: Severity;
    categoryScores: Record<CategoryKey, number>;
    summary?: string;
  };
  signals?: {
    id: string;
    title: string;
    severity: Severity;
    score: number;
    category: string;
    description?: string;
  }[];
  articles?: {
    id: string;
    title: string;
    riskScore: number;
    category: string;
  }[];
  policies?: {
    id: string;
    title: string;
    target: string;
    benefit: string;
  }[];
  regions?: {
    name: string;
    score: number;
    topCategory: string;
  }[];
  assembly?: {
    title: string;
    status: string;
    proposer: string;
  }[];
}

// -- 채팅 SSE 이벤트 --
export type ChatStreamEvent =
  | { type: "token"; content: string }
  | { type: "references"; data: ChatReferences }
  | { type: "done"; usage?: { inputTokens: number; outputTokens: number } }
  | { type: "error"; message: string };

// -- 응답에 첨부되는 참조 데이터 --
export interface ChatReferences {
  signals?: { id: string; title: string; severity: Severity; score: number }[];
  articles?: { id: string; title: string; riskScore: number }[];
  policies?: { id: string; title: string; benefit: string }[];
}
```

### 3.2 기존 타입 확장

```typescript
// ChatMessage 확장
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  relatedSignals?: string[];
  references?: ChatReferences;  // 신규: 관련 데이터 카드 렌더링용
}
```

---

## 4. 백엔드 구현

### 4.1 의도 분류기 (`lib/chat/context-retriever.ts`)

LLM 호출 없이 규칙 기반으로 의도를 분류하여 비용과 지연을 절감한다.

```typescript
// 의도 분류 로직
export function classifyIntent(question: string): ChatIntent {
  // 1. 카테고리 키워드 매칭
  //    CATEGORIES + CATEGORY_KEYWORDS (lib/constants.ts) 활용
  //    예: "물가", "식료품", "공공요금" --> prices
  //    예: "자영업", "소상공인", "폐업" --> selfEmployed

  // 2. 지역 키워드 매칭
  //    REGIONS (lib/constants.ts) 활용
  //    예: "서울", "경기도", "부산" --> 해당 지역

  // 3. 의도 키워드 매칭
  //    정책/지원: "정책", "지원", "보조금", "대출" --> policy_query
  //    국회/법안: "국회", "법안", "입법", "청원" --> assembly_query
  //    비교/원인: "왜", "원인", "관계", "동시에" --> comparison
  //    신호/위험: "위험", "위기", "신호", "긴급" --> signal_query
  //    지역 포함: region이 감지되면 --> region_query
  //    카테고리만: category가 감지되면 --> category_query
  //    그 외: --> general_query

  // 4. 복합 의도 시 우선순위
  //    region + category --> region_query (카테고리 정보 포함)
  //    policy + category --> policy_query (카테고리 정보 포함)
}

// DB 컨텍스트 검색
export async function retrieveContext(intent: ChatIntent): Promise<ChatContext> {
  // 의도별로 필요한 DB 쿼리 조합 실행
  // queries.ts의 기존 함수 재활용
  // 컨텍스트 크기를 3000 토큰 이내로 제한
}
```

**의도별 DB 쿼리 매핑:**

| 의도 | 필수 쿼리 | 선택 쿼리 |
|------|----------|----------|
| `general_query` | dashboard_cache, 최근 signals(5건) | score_history |
| `category_query` | 해당 카테고리 signals, articles | dashboard(해당 카테고리) |
| `region_query` | regions(해당 지역), 지역 signals | policies(지역 필터) |
| `signal_query` | signals(상위 10건), 관련 articles | dashboard 요약 |
| `policy_query` | policies, gov_services | 관련 signals |
| `comparison` | dashboard_cache(전체), crisis_chain | score_history |
| `assembly_query` | assembly_petitions, assembly_legislations | 관련 signals |

### 4.2 시스템 프롬프트 (`lib/chat/prompts.ts`)

```typescript
export function buildSystemPrompt(): string {
  return `당신은 "이르미(IRMI)" 민생위기 조기경보 시스템의 AI 어시스턴트입니다.

## 역할
- 실시간 민생 위기 데이터를 기반으로 분석, 해석, 대응 방안을 제공합니다.
- 5대 민생 카테고리: 물가, 고용, 자영업, 금융, 부동산
- 4단계 위기 등급: 긴급(80~100), 주의(60~79), 관찰(40~59), 안전(0~39)

## 응답 원칙
1. 반드시 [현재 데이터] 섹션에 제공된 데이터만 기반으로 응답하세요.
2. 구체적 수치(점수, 등급, 건수)를 포함하여 답변하세요.
3. 실행 가능한 조언을 포함하세요 (관련 정책 안내, 대응 방안).
4. 데이터에 없는 내용은 "현재 데이터에서 확인되지 않습니다"라고 명시하세요.
5. 마크다운 형식으로 응답하세요 (제목, 목록, 강조 활용).
6. 간결하되 핵심을 놓치지 마세요 (300자 내외 권장).

## 응답에 관련 데이터를 인용할 때
- 위기 신호 인용: [signal:신호ID] 형식
- 뉴스 기사 인용: [article:기사ID] 형식
- 지원 정책 인용: [policy:정책ID] 형식
이 참조 태그는 시스템이 자동으로 카드 UI로 변환합니다.

## 제약
- 개인 금융/투자 조언은 제공하지 않습니다.
- 정치적 편향 없이 객관적 데이터만 전달합니다.
- 제공된 데이터 범위를 벗어난 예측은 자제합니다.`;
}

// 검색된 컨텍스트를 프롬프트 텍스트로 포맷팅
export function formatContextForPrompt(context: ChatContext): string {
  // [현재 민생 현황], [관련 위기 신호], [관련 뉴스], [가용 정책] 등
  // 각 섹션을 구조화된 텍스트로 변환
  // 3000 토큰 이내 제한
}
```

### 4.3 LLM 스트리밍 (`lib/api/ai-client.ts` 확장)

```typescript
// 기존 callLLM()에 스트리밍 버전 추가
export async function* callLLMStream(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<{ type: "token"; text: string } | { type: "done"; usage: TokenUsage }> {
  const provider = getProvider();

  if (provider === "anthropic") {
    // Anthropic SDK: client.messages.stream()
    // stream.on("text") --> yield { type: "token", text }
    // stream.finalMessage --> yield { type: "done", usage }
  } else {
    // OpenAI SDK: client.chat.completions.create({ stream: true })
    // for await (const chunk of stream) --> yield { type: "token", text }
  }
}
```

### 4.4 SSE 스트리밍 헬퍼 (`lib/chat/stream.ts`)

```typescript
// ReadableStream 기반 SSE 응답 생성
export function createSSEStream(
  generator: () => AsyncGenerator<ChatStreamEvent>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of generator()) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        const errorEvent = `data: ${JSON.stringify({
          type: "error",
          message: "응답 생성 중 오류가 발생했습니다."
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### 4.5 API Route 리팩토링 (`app/api/chat/route.ts`)

```typescript
export async function POST(request: Request) {
  const { message, history } = await request.json();

  // 1. 입력 검증
  if (!message || message.length > 500) {
    return errorResponse("Invalid message", 400);
  }

  // 2. API 키 미설정 시 Mock 폴백
  if (!hasApiKey()) {
    return mockFallbackResponse(message);
  }

  // 3. SSE 스트리밍 파이프라인
  return createSSEStream(async function* () {
    // 3a. 의도 분류
    const intent = classifyIntent(message);

    // 3b. 컨텍스트 검색
    const context = await retrieveContext(intent);

    // 3c. 프롬프트 구성
    const system = buildSystemPrompt();
    const contextText = formatContextForPrompt(context);
    const historyText = formatHistory(history);
    const user = `${contextText}\n\n${historyText}\n\n사용자: ${message}`;

    // 3d. LLM 스트리밍 호출
    let fullContent = "";
    for await (const chunk of callLLMStream({ system, user })) {
      if (chunk.type === "token") {
        fullContent += chunk.text;
        yield { type: "token", content: chunk.text };
      }
      if (chunk.type === "done") {
        yield { type: "done", usage: chunk.usage };
      }
    }

    // 3e. 참조 데이터 전송
    const references = extractReferences(fullContent, context);
    if (references) {
      yield { type: "references", data: references };
    }
  });
}
```

---

## 5. 프론트엔드 구현

### 5.1 채팅 상태 관리 훅 (`hooks/useChat.ts`)

```typescript
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 메시지 전송 + SSE 수신
  const sendMessage = useCallback(async (content: string) => {
    // 1. 사용자 메시지 추가
    // 2. AbortController 생성
    // 3. fetch POST /api/chat (SSE)
    // 4. ReadableStream 리더로 토큰 수신
    // 5. 실시간으로 assistant 메시지 업데이트
    // 6. references 이벤트 수신 시 메시지에 첨부
    // 7. done 이벤트 수신 시 완료 처리
  }, [messages]);

  // 스트리밍 중단
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // 대화 초기화
  const resetChat = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setError(null);
  }, [stopStreaming]);

  return { messages, isStreaming, error, sendMessage, stopStreaming, resetChat };
}
```

### 5.2 채팅 패널 리팩토링 (`components/chat/chat-panel.tsx`)

**주요 변경:**
- `findMatchingExample()` 키워드 매칭 로직 전체 제거
- `DEFAULT_RESPONSE` 상수 제거
- `typeMessage()` setInterval 기반 타이핑 효과 제거
- `useChat()` 훅으로 교체
- Mock 폴백은 API Route 레벨에서 처리 (프론트엔드는 항상 API 호출)

```typescript
export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { messages, isStreaming, error, sendMessage, stopStreaming, resetChat } = useChat();

  return (
    <div className={cn(/* 기존 스타일 유지 */)}>
      <ChatHeader onClose={onClose} onReset={resetChat} hasMessages={messages.length > 0} />

      {messages.length === 0 ? (
        <SuggestedQuestions onSelect={sendMessage} />
      ) : (
        <ChatMessages messages={messages} isStreaming={isStreaming} />
      )}

      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={isStreaming}
      />
    </div>
  );
}
```

**변경으로 인한 영향:**
- `ChatFab`에서 `chatData` prop 제거 가능 (더 이상 Mock 데이터 주입 불필요)
- `app/(tabs)/layout.tsx`에서 `ChatFab` 사용부 단순화

### 5.3 메시지 마크다운 렌더링 (`components/chat/chat-message.tsx`)

**주요 변경:**
- plain text `<p>` 태그를 마크다운 렌더링으로 교체
- 기존 `lib/parse-markdown.ts` 재활용 (대시보드 브리핑에서 이미 사용 중)
- 참조 태그(`[signal:id]`, `[article:id]`, `[policy:id]`) 파싱 및 카드 렌더링
- `ChatReferences` 데이터를 하단에 카드 UI로 표시

### 5.4 참조 카드 컴포넌트 (`components/chat/chat-reference-card.tsx`)

응답에 첨부된 관련 데이터를 시각적 카드로 표시하는 신규 컴포넌트.

```
+------------------------------------------+
| [위기신호] 소상공인 부담 급증              |
| 긴급 | 자영업 | 85점                      |
+------------------------------------------+
| [지원정책] 소상공인 경영안정자금           |
| 대상: 연매출 3억 이하 소상공인             |
+------------------------------------------+
| [관련기사] 배달앱 수수료 인상 파장         |
| 위험도 78점 | 자영업                       |
+------------------------------------------+
```

- 신호 카드: 심각도 색상 배지(--danger/--warning/--caution/--safe) + 제목 + 카테고리 + 점수
- 정책 카드: 제목 + 대상 + 혜택 요약
- 기사 카드: 제목 + 위험도 점수 + 카테고리

### 5.5 입력 개선 (`components/chat/chat-input.tsx`)

**주요 변경:**
- `<Input>` --> `<Textarea>` 교체 (여러 줄 입력 지원)
- `Shift+Enter`: 줄바꿈 / `Enter`: 전송 (기존 동작 유지)
- 스트리밍 중: 전송 버튼 --> 중단 버튼(StopIcon)으로 전환
- `onStop` prop 추가

### 5.6 동적 추천 질문 (`components/chat/suggested-questions.tsx`)

**주요 변경:**
- 정적 JSON 질문 --> 현재 대시보드 상태 기반 동적 생성
- `/api/chat/suggestions` 엔드포인트 추가 또는 대시보드 데이터에서 파생

동적 질문 생성 규칙:

| 조건 | 생성되는 추천 질문 |
|------|-------------------|
| 특정 카테고리 점수 >= 80 | "현재 {카테고리} 긴급 상황에 대해 알려줘" |
| 긴급 신호 존재 | "{신호 제목}에 대해 자세히 설명해줘" |
| 특정 지역 점수 높음 | "{지역} 지역 민생 현황은?" |
| 지원 정책 존재 | "지금 받을 수 있는 지원 정책은?" |
| 기본 | "현재 종합 민생 현황 브리핑해줘" |

---

## 6. 파일 변경 목록

### 6.1 신규 파일 (6개)

| 파일 | 설명 |
|------|------|
| `lib/chat/context-retriever.ts` | 의도 분류 + DB 컨텍스트 검색 |
| `lib/chat/prompts.ts` | 시스템 프롬프트 + 컨텍스트 포맷팅 템플릿 |
| `lib/chat/stream.ts` | SSE ReadableStream 헬퍼 |
| `hooks/useChat.ts` | 채팅 상태 관리 + SSE 수신 훅 |
| `components/chat/chat-reference-card.tsx` | 관련 데이터 참조 카드 UI |
| `lib/chat/prompts/chat-system.md` | 시스템 프롬프트 마크다운 (선택적, 외부 파일로 관리 시) |

### 6.2 수정 파일 (7개)

| 파일 | 변경 내용 |
|------|----------|
| `lib/types.ts` | ChatIntent, ChatContext, ChatStreamEvent, ChatReferences 타입 추가, ChatMessage 확장 |
| `lib/api/ai-client.ts` | `callLLMStream()` AsyncGenerator 함수 추가 |
| `app/api/chat/route.ts` | SSE 스트리밍 파이프라인으로 전면 리팩토링 |
| `components/chat/chat-panel.tsx` | Mock 로직 제거, useChat 훅 사용, chatData prop 제거 |
| `components/chat/chat-message.tsx` | 마크다운 렌더링 + 참조 카드 표시 |
| `components/chat/chat-input.tsx` | Textarea 교체 + 중단 버튼 추가 |
| `components/chat/suggested-questions.tsx` | 동적 추천 질문 생성 |

### 6.3 영향받는 파일 (2개)

| 파일 | 변경 내용 |
|------|----------|
| `components/chat/chat-fab.tsx` | chatData prop 제거 (선택적) |
| `app/(tabs)/layout.tsx` | ChatFab에 chatData 전달 제거 (선택적) |

### 6.4 변경 없음

| 파일 | 사유 |
|------|------|
| `components/chat/chat-header.tsx` | 기존 UI 그대로 사용 |
| `components/chat/chat-messages.tsx` | 기존 리스트 렌더링 그대로 사용 |
| `lib/db/schema.ts` | 기존 테이블로 충분 (신규 테이블 불필요) |
| `lib/db/queries.ts` | 기존 쿼리 함수 재활용 |

---

## 7. 구현 단계 (Phase)

### Phase 1: 백엔드 기반

> 의존성: 없음 (독립 구현 가능)

| Step | 작업 | 파일 | 설명 |
|------|------|------|------|
| 1.1 | 타입 정의 | `lib/types.ts` | ChatIntent, ChatContext, ChatStreamEvent, ChatReferences 추가 |
| 1.2 | 스트리밍 LLM | `lib/api/ai-client.ts` | callLLMStream() AsyncGenerator 구현 |
| 1.3 | 의도 분류 + 컨텍스트 검색 | `lib/chat/context-retriever.ts` | classifyIntent() + retrieveContext() |
| 1.4 | 시스템 프롬프트 | `lib/chat/prompts.ts` | buildSystemPrompt() + formatContextForPrompt() |
| 1.5 | SSE 헬퍼 | `lib/chat/stream.ts` | createSSEStream() |
| 1.6 | API Route | `app/api/chat/route.ts` | SSE 스트리밍 파이프라인 통합 |

**Step 의존성:** 1.1 --> 1.2, 1.3, 1.4, 1.5 (병렬 가능) --> 1.6

### Phase 2: 프론트엔드 기반

> 의존성: Phase 1 완료

| Step | 작업 | 파일 | 설명 |
|------|------|------|------|
| 2.1 | 채팅 훅 | `hooks/useChat.ts` | SSE 연결 + 상태 관리 |
| 2.2 | 패널 리팩토링 | `components/chat/chat-panel.tsx` | Mock 제거, useChat 사용 |
| 2.3 | 메시지 마크다운 | `components/chat/chat-message.tsx` | 마크다운 렌더링 + 스트리밍 커서 |
| 2.4 | 참조 카드 | `components/chat/chat-reference-card.tsx` | 신호/기사/정책 카드 UI |
| 2.5 | 입력 개선 | `components/chat/chat-input.tsx` | Textarea + 중단 버튼 |

**Step 의존성:** 2.1 --> 2.2 --> 2.3 + 2.4 + 2.5 (병렬 가능)

### Phase 3: 고도화

> 의존성: Phase 2 완료

| Step | 작업 | 설명 |
|------|------|------|
| 3.1 | 동적 추천 질문 | 현재 대시보드 상태 기반 추천 질문 생성 |
| 3.2 | 대화 히스토리 최적화 | 토큰 절약을 위한 히스토리 압축/요약 |
| 3.3 | 에러 핸들링 강화 | 네트워크 끊김, 타임아웃, rate limit 대응 |
| 3.4 | 모바일 반응형 | 모바일에서 전체화면 채팅 패널 |

### Phase 4: 테스트 및 최적화

> 의존성: Phase 3 완료

| Step | 작업 | 설명 |
|------|------|------|
| 4.1 | E2E 시나리오 테스트 | 각 의도 유형별 질문-응답 검증 |
| 4.2 | 토큰 사용량 모니터링 | 컨텍스트 크기 최적화, 비용 추적 |
| 4.3 | 프롬프트 튜닝 | 실제 데이터 기반 응답 품질 개선 |

---

## 8. 의도 분류 키워드 사전

`lib/constants.ts`의 기존 `CATEGORY_KEYWORDS` 및 `REGIONS`를 재활용하며, 챗봇 전용 의도 키워드를 추가한다.

```typescript
// 의도 분류 키워드 매핑
export const CHAT_INTENT_KEYWORDS: Record<string, string[]> = {
  policy_query: ["정책", "지원", "보조금", "대출", "혜택", "신청", "자격", "도움", "받을 수 있"],
  assembly_query: ["국회", "법안", "입법", "청원", "의원", "위원회", "발의"],
  comparison: ["왜", "원인", "이유", "관계", "영향", "연결", "동시에", "함께", "비교", "차이"],
  signal_query: ["위험", "위기", "신호", "긴급", "주의", "경고", "감지", "알림"],
  region_query: [], // REGIONS 배열로 대체
  category_query: [], // CATEGORY_KEYWORDS로 대체
  general_query: ["현황", "종합", "브리핑", "요약", "전체", "전망", "추이"],
};
```

---

## 9. 기술적 고려사항

### 9.1 비용 관리

| 항목 | 제한 | 사유 |
|------|------|------|
| 컨텍스트 크기 | 최대 3,000 토큰 | API 비용 절감 |
| 대화 히스토리 | 최근 10턴 (사용자 5회 + 어시스턴트 5회) | 토큰 절약 |
| 모델 선택 | haiku / gpt-4.1-nano 우선 | 채팅은 경량 모델로 충분 |
| 의도 분류 | 규칙 기반 (LLM 호출 없음) | 호출 횟수 절감 |
| 사용자 입력 | 500자 제한 | 과도한 입력 방지 |

### 9.2 성능

| 항목 | 목표 | 방법 |
|------|------|------|
| 첫 토큰 응답 | 1.5초 이내 | SSE 스트리밍 + 경량 모델 |
| 컨텍스트 검색 | 100ms 이내 | SQLite 인덱스 (20+ 인덱스 기존 존재) |
| FTS 검색 | 50ms 이내 | FTS5 unicode61 토크나이저 |

### 9.3 보안

| 항목 | 대책 |
|------|------|
| API 키 보호 | 서버사이드 전용 (기존 패턴 유지) |
| XSS 방지 | 마크다운 렌더링 시 HTML 이스케이프 |
| 입력 검증 | 길이 제한 500자, 타입 검증 |
| Rate Limiting | 향후 세션당 분당 10회 제한 고려 |

### 9.4 폴백 전략

| 상황 | 대응 |
|------|------|
| API 키 미설정 | 기존 Mock 키워드 매칭 응답 유지 (하위 호환) |
| DB 데이터 없음 | 일반적인 민생 가이드 응답 (컨텍스트 없이 LLM 호출) |
| LLM 호출 오류 | "일시적 오류" 메시지 + 재시도 버튼 표시 |
| 네트워크 끊김 | 자동 재연결 시도 (최대 3회) |

### 9.5 기존 코드 호환성

| 항목 | 전략 |
|------|------|
| `ChatData` 타입 | 점진적 제거 (suggestedQuestions를 동적으로 전환) |
| `generateChatResponse()` | deprecated 처리 후 새 파이프라인으로 대체 |
| `chat-examples.json` | Mock 폴백용으로 유지 |
| `ChatFab` props | chatData prop을 선택적(optional)으로 변경 |

---

## 10. 향후 확장 가능성

| 기능 | 설명 | 우선순위 |
|------|------|---------|
| 대화 저장/내보내기 | 분석 대화를 PDF/텍스트로 내보내기 | 중 |
| 멀티모달 응답 | 차트/그래프 이미지 생성하여 응답에 포함 | 낮 |
| 질문 패턴 분석 | 사용자 질문 로그를 분석하여 추천 질문 개선 | 낮 |
| 알림 연동 | "이 신호가 변경되면 알려줘" 같은 구독 기능 | 낮 |
| 리포트 생성 | 대화 내용을 바탕으로 분석 리포트 자동 생성 | 중 |
| 음성 입력 | Web Speech API 활용 음성 질문 | 낮 |
