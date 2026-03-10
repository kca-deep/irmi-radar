# 뉴스분석 AI 분석 실제 구현 체크리스트

"AI 분석 시작하기" 버튼 클릭 후 실제 파이프라인 연동을 위한 구현 계획.
현재 상태: UI 완성 (모달/설정/진행률), 서버 파이프라인 완성 (CLI 검증 완료), **둘을 잇는 연결이 없음**.

---

## 현황 요약

| 구분 | 상태 | 비고 |
|------|------|------|
| 모달 UI (설정/진행률/완료) | 완성 | `analysis-progress-modal.tsx` |
| 기간/카테고리/외부데이터 설정 | 완성 | 필터 UI 정상 동작 |
| 대상 기사 건수 실시간 계산 | 완성 | 기간+카테고리 기반 |
| 분석 파이프라인 (`runPipeline`) | 완성 | CLI(`scripts/analyze-news.ts`)로 검증 완료 |
| 기사 분석기 (`article-analyzer`) | 완성 | 배치 처리, 재시도, DB 저장 |
| 신호 탐지기 (`signal-detector`) | 완성 | 카테고리별 LLM 호출 |
| 대시보드 빌더 (`dashboard-builder`) | 완성 | AI 종합 + 캐시 + 점수 이력 |
| API 라우트 (`/api/analyze`) | **완성** | SSE 스트리밍 + runPipeline 연동 |
| 프론트 -> 서버 호출 | **완성** | `startRealAnalysis()` + mock fallback |
| 서버 -> 프론트 진행률 전달 | **완성** | SSE ReadableStream 방식 |
| 분석 결과 활용 | **완성** | 파이프라인 실제 결과 반영 |

---

## Phase A: API 라우트 개선 (`/api/analyze`)

### A-1. 분석 요청 수신 구조

- [x] `app/api/analyze/route.ts` 요청 body 스키마 확장
  - [ ] `period`: AnalysisPeriodPreset (1w/1m/3m/6m/1y/all/custom)
  - [ ] `customStartDate`, `customEndDate`: string (custom일 때)
  - [x] `categories`: CategoryKey[] (선택 카테고리)
  - [ ] `externalData`: { includeAssembly, includeGovServices }
- [ ] 요청 파라미터 유효성 검증 (잘못된 카테고리키, 날짜 형식 등)

### A-2. 대상 기사 필터링

- [ ] period -> dateFrom/dateTo 변환 로직 (`getDateRange()` 서버 버전)
- [ ] DB에서 기간 + 카테고리 조건으로 대상 기사 조회
- [ ] 이미 분석된 기사 제외 옵션 (재분석 여부 파라미터)

### A-3. 파이프라인 호출

- [x] `runPipeline()` 호출 (lib/analysis/pipeline.ts)
  - [x] `categories` 파라미터 전달 (선택 카테고리만 분석)
  - [x] `onProgress` 콜백 연결 (진행률 수집)
  - [x] `concurrency`, `batchSize` 옵션 전달

---

## Phase B: 진행률 스트리밍 (서버 -> 클라이언트)

### B-1. SSE(Server-Sent Events) 엔드포인트

- [ ] ~~`app/api/analyze/stream/route.ts` 생성 (GET, SSE 스트림)~~
- [x] 기존 `/api/analyze` POST에서 `ReadableStream` 반환 방식 선택
- [x] SSE 이벤트 타입 정의:
  - [x] `progress`: { stepId, processed, total, failed, percent }
  - [x] `step-complete`: { stepId, detail, currentStepIndex, totalSteps, percent }
  - [x] `complete`: { overallScore, severity, signalCount, elapsedSeconds }
  - [x] `error`: { message }

### B-2. 파이프라인 콜백 -> SSE 연결

- [x] `runPipeline({ onProgress })` 콜백에서 SSE 이벤트 발행
- [x] 단계별 실제 소요시간 반영 (고정 배분이 아닌 실측)
- [x] 기사 처리 건수 실시간 업데이트

### B-3. 분석 세션 관리

- [ ] 분석 ID 발급 (UUID)
- [x] 동시 분석 방지 (서버 단일 분석 세션)
- [x] 분석 취소 지원 (AbortController 또는 세션 플래그)

---

## Phase C: 프론트엔드 연동 (`news-page.tsx`)

### C-1. `startMockAnalysis()` -> `startRealAnalysis()` 전환

- [x] `startRealAnalysis()` 함수 신규 작성
  - [x] 필터 조건 수집 (period, categories, externalData, dateRange)
  - [x] `POST /api/analyze` 호출 (fetch)
  - [x] SSE 스트림 리스너 연결 (`ReadableStream` reader)
- [x] 기존 `startMockAnalysis()` 보존 (fallback 또는 개발용)
- [x] 환경변수/조건에 따라 mock/real 분기 (API 실패 시 mock fallback)

### C-2. 진행률 상태 업데이트

- [x] SSE `progress` 이벤트 -> `setProgress()` 상태 반영
- [x] SSE `step-complete` 이벤트 -> 해당 step status를 "completed"로 변경
- [x] SSE `complete` 이벤트 -> `setAnalysisState("completed")` + `setResult()`
- [x] SSE `error` 이벤트 -> `setAnalysisState("error")` + 에러 메시지 표시

### C-3. 분석 취소

- [x] "분석 취소" 버튼 클릭 시 SSE 연결 종료 (AbortController.abort())
- [ ] 서버에 취소 요청 전송 (DELETE 또는 별도 엔드포인트)
- [x] UI 상태 초기화 (idle로 복귀)

### C-4. 에러 처리 UI

- [x] API 호출 실패 시 mock fallback 자동 전환
- [ ] 네트워크 오류, 타임아웃, 서버 에러 분기 처리
- [ ] "다시 시도" 버튼 제공

---

## Phase D: 외부 데이터 연계

### D-1. 국회 입법 동향

- [ ] `includeAssembly=true` 시 파이프라인에 국회 API 데이터 주입
- [ ] `fetchLegislationByKeywords()` 호출 -> 분석 컨텍스트에 포함
- [ ] 진행률 모달에 "국회 입법 동향" 단계 실제 반영

### D-2. 보조금24 정책

- [ ] `includeGovServices=true` 시 파이프라인에 정책 데이터 주입
- [ ] `fetchPoliciesByCategory()` 호출 -> 분석 컨텍스트에 포함
- [ ] 진행률 모달에 "보조금24 정책" 단계 실제 반영

### D-3. 외부 데이터 없을 때

- [ ] API 키 미설정 시 해당 단계 스킵 (에러 아닌 경고)
- [ ] 스킵된 단계 UI 표시 ("건너뜀" 또는 회색 처리)

---

## Phase E: 분석 결과 저장 및 활용

### E-1. 결과 DB 저장

- [x] 파이프라인 완료 시 `dashboard_cache` 자동 갱신 (기존 로직 재활용 - pipeline 내 buildDashboard)
- [x] `signals` 테이블에 신규 신호 저장 (기존 로직 재활용 - pipeline 내 detectSignals)
- [x] `score_history` 테이블에 점수 이력 추가 (기존 로직 재활용 - pipeline 내 buildDashboard)
- [ ] `api_usage` 캐시 갱신 (기존 로직 재활용)

### E-2. 완료 모달 결과 표시

- [x] 하드코딩 `{score:67, severity:"warning", signals:12}` 제거
- [x] 파이프라인 실제 결과로 교체:
  - [x] `overallScore`: 대시보드 빌더 결과
  - [x] `severity`: 점수 기반 등급
  - [x] `signalCount`: 탐지된 신호 수
  - [x] `elapsedSeconds`: 실제 소요 시간

### E-3. 대시보드 연동

- [ ] "대시보드 보기" 클릭 시 `router.push("/")` + 페이지 데이터 리프레시
- [ ] 대시보드가 갱신된 `dashboard_cache`에서 최신 데이터 로드
- [ ] 분석 완료 후 뉴스 목록에서 분석 결과 반영 (analysis 필드 갱신)

### E-4. API 사용량 표시

- [ ] 분석 완료 모달에 API 사용량 요약 추가 (토큰 수, 비용)
- [ ] `usageTracker.getSummary()` 결과를 SSE `complete` 이벤트에 포함

---

## Phase F: 안정화 및 테스트

### F-1. 통합 테스트

- [ ] 소량 테스트 (기사 10건) -> 전체 플로우 정상 동작 확인
- [ ] 대량 테스트 (기사 100건+) -> 진행률/타임아웃 확인
- [ ] 외부 데이터 포함/미포함 양쪽 테스트
- [ ] 분석 중 취소 테스트
- [ ] 네트워크 에러 시뮬레이션

### F-2. 성능 최적화

- [ ] 배치 크기 조정 (동시 LLM 호출 수)
- [ ] API rate limit 대응 (429 재시도 로직 확인)
- [ ] SSE 연결 안정성 (재연결 로직)

### F-3. UX 개선

- [ ] 분석 중 페이지 이탈 경고 (`beforeunload`)
- [ ] 분석 완료 후 뉴스 캐러셀 자동 갱신
- [ ] 브라우저 탭 제목에 진행률 표시 (선택)

### F-4. mock 모드 유지

- [x] `DATA_SOURCE=mock` 또는 API 키 미설정 시 기존 mock 시뮬레이션 동작 (API 실패 시 자동 fallback)
- [x] 시연/발표 시 mock 모드로 안전한 데모 가능

---

## 구현 순서 권장

```
Phase A (API 라우트)  ──→  Phase B (SSE 스트리밍)  ──→  Phase C (프론트 연동)
                                                            │
Phase D (외부 데이터)  ←──────────────────────────────────────┘
                                                            │
Phase E (결과 저장/활용)  ←─────────────────────────────────────┘
                                                            │
Phase F (안정화/테스트)  ←─────────────────────────────────────┘
```

**최소 동작 버전 (MVP)**: A-1 + A-2 + A-3 + C-1 + E-2
- API 호출 -> 파이프라인 실행 -> 결과 반환 (진행률은 mock 유지)
- 예상 작업량: 중간

**완전 구현**: A + B + C + D + E + F
- SSE 실시간 진행률 + 외부 데이터 + 결과 저장 + 테스트
- 예상 작업량: 큼

---

## 재활용 가능한 기존 코드

| 모듈 | 경로 | 용도 |
|------|------|------|
| 분석 파이프라인 | `lib/analysis/pipeline.ts` | 전체 오케스트레이션 |
| 기사 분석기 | `lib/analysis/article-analyzer.ts` | 개별 기사 AI 분석 |
| 신호 탐지기 | `lib/analysis/signal-detector.ts` | 카테고리별 위기 신호 |
| 대시보드 빌더 | `lib/analysis/dashboard-builder.ts` | AI 종합 + 캐시 |
| 카테고리 집계 | `lib/analysis/category-aggregator.ts` | SQL 기반 집계 |
| 지역 집계 | `lib/analysis/region-aggregator.ts` | 지역별 점수 |
| LLM 클라이언트 | `lib/api/ai-client.ts` | OpenAI/Anthropic 호환 |
| 사용량 추적 | `lib/api/ai-client.ts` (`usageTracker`) | 토큰/비용 추적 |
| 국회 API | `lib/api/assembly.ts` | 입법/청원/의안 |
| 보조금24 API | `lib/api/gov-service.ts` | 공공서비스 조회 |
| 분석 프롬프트 | `lib/analysis/prompts/*.md` | 3종 프롬프트 |
| CLI 참조 구현 | `scripts/analyze-news.ts` | 동작 검증된 호출 예시 |
