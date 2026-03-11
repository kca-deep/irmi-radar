# AI 분석 품질 향상 체크리스트

> 진단 기준일: 2026-03-10 / 분석 대상: DB 내 1,050건 분석 + 14개 위기 신호 + 대시보드 캐시

---

## 현황 진단 요약

| 지표 | 현재 값 | 문제 |
|------|---------|------|
| 점수 고유값 개수 | ~10개 (85, 70, 55, 20 등) | 0~100 연속 점수 체계 무의미 |
| critical 중 민생 무관 비율 | ~30% (형사, 마약, 해외) | false positive 과다 |
| 1건 기사 기반 위기 신호 | 8/14건 (57%) | 프롬프트 규칙 위반 |
| 종합점수 vs 카테고리 평균 괴리 | 85 vs 58.6 (+45%) | AI 자유재량의 과도한 상향 |
| 14개 신호 severity 분포 | 전부 critical 85 | 등급 다양성 0 |

---

## Phase 1: 프롬프트 수정 (비용 0, 코드 변경 없음)

### [P1-1] 기사 분석 점수 세분화

- **대상 파일**: `lib/analysis/prompts/article-analysis.md`
- **위치**: `## risk_score` 섹션 하단에 추가

**추가 내용:**

```markdown
## risk_score 세분화 규칙 (필수 준수)
- 80, 85, 70, 55, 50, 20 같은 5단위 라운드 넘버 사용 금지
- 반드시 1점 단위의 구체적 점수 부여 (예: 73, 82, 47, 31, 66)
- severity와 risk_score는 독립 평가. 같은 critical이라도 81과 97은 다르다

점수 앵커 (참고 기준):
- 95~100: 국민 다수에게 즉각적 금전 피해 (전국 전기요금 20% 인상, 기준금리 1%p 인상)
- 80~94: 특정 계층/지역에 심각한 피해 (수도권 전세 30% 급등, 대규모 구조조정)
- 65~79: 뚜렷한 부정적 추세 (자영업 폐업률 3개월 연속 상승, 청년 실업률 상승)
- 45~64: 잠재적 위험 신호 (특정 업종 채용 감소, 일부 지역 부동산 하락)
- 25~44: 간접적 영향 (기업 실적 악화, 해외 경제 동향)
- 0~24: 민생 무관 또는 긍정적 (인사 공시, 제품 출시, 시상식)
```

- [ ] 프롬프트 파일에 위 내용 추가
- [ ] 검증: 50건 재분석 후 고유 점수값 개수 확인 (목표: 30개 이상)

---

### [P1-2] 민생 관련도 판단 기준

- **대상 파일**: `lib/analysis/prompts/article-analysis.md`
- **위치**: `## risk_score` 섹션 상단에 추가 (점수 산정 전 확인하도록)

**추가 내용:**

```markdown
## 민생 관련도 판단 (risk_score 산정 전 필수 확인)

아래 유형은 한국 민생 경제와 직접 관련 없으므로 반드시 safe(0~24) 부여:
- 형사 사건 (살인, 폭행, 마약 투약/밀수, 성범죄)
  - 예외: 보이스피싱, 금융사기, 임금체불 등 경제범죄는 해당 카테고리로 분석
- 해외 뉴스 (이란, 미국, 중국, 일본 등 타국 국내 상황)
  - 예외: 한국 수출입/환율/공급망에 직접 영향을 미치는 경우
- 연예, 스포츠, 문화 행사
- 단순 인사 공시, 기업 홍보, 신제품 출시, 수상 소식
- 정치 단신 (인선, 외교 등) - 예외: 민생 정책 변경(최저임금, 금리, 세제)

카테고리 적합성도 반드시 검증:
- 기사 내용이 배정된 카테고리(물가/고용/자영업/금융/부동산)의 핵심 주제와 무관하면 safe(0~15) 부여
- 예: 살인 사건이 부동산 카테고리에 배정된 경우 → 부동산 위기와 무관하므로 safe(0~10)
```

- [ ] 프롬프트 파일에 위 내용 추가
- [ ] 검증: critical 기사 20건 수동 검토, 민생 무관 비율 (목표: 10% 이하)

---

### [P1-3] 위기 신호 severity 다양성

- **대상 파일**: `lib/analysis/prompts/signal-detection.md`
- **위치**: `## signals` 규칙 섹션에 추가

**추가 내용:**

```markdown
## severity 배분 규칙 (필수 준수)
- 생성하는 신호들이 모두 같은 severity여서는 안 된다
- 카테고리당 1~3개 신호 중, 반드시 2개 이상의 severity 등급을 사용
- score도 신호마다 다른 구체적 값 부여 (예: 88, 72, 53). 모두 같은 점수 금지
- 데이터에서 critical 수준 신호가 없으면 가장 높은 것을 warning으로 설정

## score 세분화 규칙
- 85, 70, 55 같은 라운드 넘버 사용 금지
- 구체적 1점 단위 점수 부여 (예: 83, 67, 48)
```

- [ ] 프롬프트 파일에 위 내용 추가
- [ ] 검증: 재분석 후 신호 severity 분포 확인 (목표: 최소 2개 등급 존재)

---

## Phase 2: 코드 후처리 (소규모 변경)

### [P2-1] 1건 기사 위기 신호 자동 제거

- **대상 파일**: `lib/analysis/signal-detector.ts`
- **위치**: 신호 DB 저장 직전

**변경 내용:**

신호 저장 전 `articleIds.length >= 2` 검증 로직 추가:

```typescript
// 프롬프트 규칙: 최소 2건 이상의 기사가 뒷받침하는 신호만 유효
const validSignals = detectedSignals.filter(signal =>
  signal.articleIds && signal.articleIds.length >= 2
);
```

- [ ] signal-detector.ts에 필터 로직 추가
- [ ] 기존 DB의 1건 기사 신호 정리 쿼리 실행
- [ ] 검증: `SELECT COUNT(*) FROM signals s WHERE (SELECT COUNT(*) FROM signal_articles sa WHERE sa.signal_id = s.id) < 2` 결과 0

---

### [P2-2] 종합점수 가중 평균 공식 도입

- **대상 파일**: `lib/analysis/dashboard-builder.ts`
- **위치**: overall_score를 AI 응답에서 가져오는 부분

**변경 내용:**

AI의 overall_score 대신 카테고리 점수 기반 공식 적용:

```typescript
function calculateOverallScore(categoryScores: number[]): number {
  const sorted = [...categoryScores].sort((a, b) => b - a);
  const max = sorted[0];
  const top2Avg = (sorted[0] + sorted[1]) / 2;
  const avg = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;

  // 최고 카테고리 35% + 상위 2개 평균 35% + 전체 평균 30%
  return Math.round(max * 0.35 + top2Avg * 0.35 + avg * 0.30);
}
```

현재 데이터 기준 시뮬레이션:
- 카테고리 점수: [63, 61.9, 60.8, 55.2, 51.9]
- max=63, top2Avg=62.45, avg=58.56
- 결과: 63*0.35 + 62.45*0.35 + 58.56*0.30 = **61** (현재 85 대비 합리적)

AI 응답의 summary, key_risks, outlook, crisis_chain은 그대로 사용하되, overall_score와 severity만 공식으로 대체.

- [ ] dashboard-builder.ts에 공식 함수 추가
- [ ] AI 응답의 overall_score 대신 공식 결과 사용하도록 변경
- [ ] severity는 공식 점수 기준으로 재산정 (80~100:critical, 60~79:warning ...)
- [ ] 검증: 재분석 후 종합점수와 카테고리 평균 괴리율 (목표: 15% 이내)

---

## Phase 3: 모델 선택 (비용 검토 후 결정)

### [P3-1] 분석 모델 업그레이드 검토

- **대상 파일**: `lib/api/ai-client.ts`
- **현재 모델**: `gpt-4.1-nano` (input: $0.10/1M, output: $0.40/1M)

| 모델 | Input/1M | Output/1M | 1,050건 예상 비용 | 지침 준수력 |
|------|----------|-----------|------------------|------------|
| gpt-4.1-nano | $0.10 | $0.40 | ~$0.15 | 낮음 |
| gpt-4.1-mini | $0.40 | $1.60 | ~$0.60 | 중간 |
| claude-haiku-4-5 | $0.80 | $4.00 | ~$1.50 | 높음 |

Phase 1~2 적용 후에도 품질이 부족하면:
- [ ] gpt-4.1-mini로 50건 테스트 분석 실행
- [ ] nano 대비 점수 분포/민생 관련도 비교
- [ ] 비용 대비 품질 향상이 충분하면 기본 모델 변경

---

## 검증 쿼리

적용 전후 비교에 사용할 SQL:

```sql
-- 1. 점수 고유값 개수 (목표: 30개 이상)
SELECT COUNT(DISTINCT risk_score) as unique_scores FROM analysis;

-- 2. 점수 분포 히스토그램
SELECT
  CASE
    WHEN risk_score >= 80 THEN 'critical(80-100)'
    WHEN risk_score >= 60 THEN 'warning(60-79)'
    WHEN risk_score >= 40 THEN 'caution(40-59)'
    ELSE 'safe(0-39)'
  END as band,
  COUNT(*) as cnt,
  ROUND(AVG(risk_score), 1) as avg,
  MIN(risk_score) as min,
  MAX(risk_score) as max
FROM analysis GROUP BY band;

-- 3. 1건 기사 신호 수 (목표: 0)
SELECT COUNT(*) as invalid_signals
FROM signals s
WHERE (SELECT COUNT(*) FROM signal_articles sa WHERE sa.signal_id = s.id) < 2;

-- 4. 신호 severity 분포 (목표: 최소 2개 등급)
SELECT severity, COUNT(*) as cnt FROM signals GROUP BY severity;

-- 5. 종합점수 vs 카테고리 평균 괴리율
SELECT
  json_extract(value, '$.overallScore') as overall,
  (json_extract(value, '$.categories[0].score') +
   json_extract(value, '$.categories[1].score') +
   json_extract(value, '$.categories[2].score') +
   json_extract(value, '$.categories[3].score') +
   json_extract(value, '$.categories[4].score')) / 5.0 as cat_avg
FROM dashboard_cache WHERE key = 'dashboard';
```

---

## 실행 순서 요약

```
Phase 1 (프롬프트, 즉시)
  P1-1 점수 세분화 ──┐
  P1-2 민생 관련도  ──┼─→ 50건 테스트 재분석 → 효과 검증
  P1-3 신호 다양성  ──┘

Phase 2 (코드, Phase 1 검증 후)
  P2-1 신호 필터 ─────→ 즉시 적용 가능
  P2-2 종합점수 공식 ──→ 전체 재분석 시 적용

Phase 3 (모델, Phase 1~2 부족 시)
  P3-1 모델 변경 ─────→ 비용 승인 후 테스트
```
