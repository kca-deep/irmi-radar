# 전일대비(DailyDelta) 대시보드 표시 구현계획

> 작성일: 2026-03-14
> 상태: 검토 중

---

## 1. 배경 및 목적

### 현재 상황
- `analysis_runs` 중심의 이력 관리 체계가 구축됨 (run_id 기반 모든 분석 결과 버전 관리)
- 파이프라인이 `dailyDelta`를 계산하여 `dashboard_snapshots`에 저장함
- `DashboardData.dailyDelta` 필드로 프론트엔드까지 전달 경로가 마련됨
- **그러나 실제 UI 컴포넌트에서 `dailyDelta`를 활용하지 않고 있음**

### 목적
민생 담당자가 대시보드를 열었을 때 **"어제 대비 뭐가 변했는지"** 즉시 파악할 수 있도록, 전일대비 변화 정보를 대시보드 전반에 걸쳐 표시한다.

### DailyDelta 데이터 구조 (lib/types.ts)
```typescript
interface DailyDelta {
  previousDate: string | null;
  previousRunId: string | null;
  overall: {
    delta: number | null;           // 종합점수 변화량
    direction: "up" | "down" | "unchanged";
    severityChanged: boolean;       // 등급 변경 여부
    previousSeverity: Severity | null;
  };
  categories: Record<CategoryKey, {
    delta: number | null;           // 카테고리별 변화량
    direction: "up" | "down" | "unchanged";
    previousScore: number | null;
  }>;
  signals: {
    totalDelta: number | null;      // 총 신호수 변화
    newCount: number;               // 신규 감지 신호
    resolvedCount: number;          // 해소된 신호
    upgradedCount: number;          // 등급 상향 신호
    downgradedCount: number;        // 등급 하향 신호
  };
  aiSummary: string | null;         // AI 비교 분석 요약
}
```

---

## 2. 설계 원칙

### "글랜스 + 드릴다운" 2단계 정보 구조

| 단계 | 목적 | 위치 | 정보 밀도 |
|------|------|------|----------|
| **글랜스** | 대시보드를 열자마자 변화 인지 | 기존 컴포넌트 내 인라인 | 최소 (delta 수치, 방향 화살표) |
| **드릴다운** | 상세 변화 내역 확인 | BriefingCompact 탭 확장 | 풀 (테이블, 신호 목록, AI 요약) |

### null 처리 원칙
- `dailyDelta === null` (첫 분석, 이전 데이터 없음) -> delta 관련 UI 숨김, 기존 UI 그대로 유지
- `dailyDelta.overall.delta === 0` -> "변동 없음" 표시 (회색)
- 각 카테고리별로도 독립적 null 처리

---

## 3. 현재 대시보드 레이아웃

```
+----------------------------------------------+
| DashboardHeader                              |
+----------------------------------------------+
| Row 1                                        |
| +---------------------------+  +----------+  |
| | HeroKpiTile (3/5)        |  | Category |  |
| | - 종합 게이지 + 점수delta |  | RiskList |  |
| | - 위기신호 통계           |  | (2/5)    |  |
| | - 카테고리 분포 바        |  |          |  |
| | - 최근 신호 피드          |  |          |  |
| +---------------------------+  +----------+  |
+----------------------------------------------+
| Row 2: NewsTickerStrip (full)                |
+----------------------------------------------+
| Row 3                                        |
| +----------+  +---------------------------+  |
| | Briefing |  | UnifiedCrisisPanel (3/5)  |  |
| | Compact  |  | - 위기 연쇄 그래프        |  |
| | (2/5)    |  | - 신호 사이드바           |  |
| +----------+  +---------------------------+  |
+----------------------------------------------+
```

---

## 4. 구현 상세

### 4-1. 글랜스: HeroKpiTile 강화

**파일:** `components/dashboard/hero-kpi-tile.tsx`

#### 변경 1: Props 확장

```typescript
// 현재
interface HeroKpiTileProps {
  score: number;
  lastUpdated: string;
  scoreHistory: ScoreHistoryEntry[];
  stats: SignalStats;
  recentSignals: SignalPreview[];
  categoryDist: CategorySeverityDist[];
  signalDelta: number | null;
}

// 변경 후
interface HeroKpiTileProps {
  score: number;
  lastUpdated: string;
  scoreHistory: ScoreHistoryEntry[];
  stats: SignalStats;
  recentSignals: SignalPreview[];
  categoryDist: CategorySeverityDist[];
  signalDelta: number | null;
  dailyDelta?: DailyDelta | null;       // 추가
}
```

#### 변경 2: scoreDelta 데이터 소스 교체

```typescript
// 현재 (scoreHistory 기반 단순 계산)
const scoreDelta = useMemo(() => {
  if (scoreHistory.length < 2) return null;
  return score - scoreHistory[scoreHistory.length - 2].score;
}, [scoreHistory, score]);

// 변경 후 (dailyDelta 우선, fallback으로 기존 방식)
const scoreDelta = useMemo(() => {
  if (dailyDelta?.overall.delta != null) return dailyDelta.overall.delta;
  if (scoreHistory.length < 2) return null;
  return score - scoreHistory[scoreHistory.length - 2].score;
}, [dailyDelta, scoreHistory, score]);
```

#### 변경 3: severity 변경 뱃지 추가

게이지 하단의 "전일대비" 영역에 severity 변경 표시를 추가한다.

```
현재:  +5 전일대비
변경:  +5 전일대비  관찰 -> 주의     (severityChanged가 true일 때만 표시)
```

위치: 기존 scoreDelta 표시 영역 (line 311~316 부근)

```tsx
{scoreDelta !== null && (
  <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
    <span className="tabular-nums">{scoreDelta > 0 ? "+" : ""}{scoreDelta}</span>
    <span className="text-[10px] font-medium text-white/70">전일대비</span>
  </div>
)}
{/* 신규: severity 변경 뱃지 */}
{dailyDelta?.overall.severityChanged && dailyDelta.overall.previousSeverity && (
  <div className="flex items-center gap-1 text-[10px] font-bold text-white/80">
    <span>{SEVERITY_LABEL_MAP[dailyDelta.overall.previousSeverity]}</span>
    <span className="text-white/50">-></span>
    <span>{SEVERITY_LABEL_MAP[getSeverityByScore(score)]}</span>
  </div>
)}
```

#### 변경 4: signalDelta를 dailyDelta 기반으로 보강

위기 신호 헤더 영역 (line 338~350)에서 신규/해소 정보를 추가한다.

```
현재:  +3  12건 감지
변경:  +3  12건 감지  (신규 4 / 해소 1)    (dailyDelta가 있을 때만 괄호 부분 추가)
```

---

### 4-2. 글랜스: CategoryRiskBar 강화

**파일:** `components/dashboard/category-risk-bar.tsx`

#### 변경 1: Props 확장

```typescript
// 현재
interface CategoryRiskBarProps {
  categoryKey: CategoryKey;
  label: string;
  score: number;
  trend: Trend;
  keyIssues?: string[];
  index?: number;
  isOpen?: boolean;
  isLast?: boolean;
  onToggle?: () => void;
}

// 변경 후
interface CategoryRiskBarProps {
  categoryKey: CategoryKey;
  label: string;
  score: number;
  trend: Trend;
  keyIssues?: string[];
  index?: number;
  isOpen?: boolean;
  isLast?: boolean;
  onToggle?: () => void;
  delta?: number | null;                 // 추가: 전일대비 점수 변화
  previousScore?: number | null;         // 추가: 전일 점수
}
```

#### 변경 2: 접힌 헤더에 delta 뱃지 추가

score와 severity badge 사이에 delta 수치를 표시한다.

```
현재:  [아이콘] 물가  38.2  관찰  ↗           [V]
변경:  [아이콘] 물가  38.2  +3.2  관찰  ↗     [V]
```

delta 뱃지 스타일:
- 양수 (+3.2): `text-danger` (빨강)
- 음수 (-1.5): `text-safe` (초록)
- 0: `text-muted-foreground` (회색)
- null: 표시하지 않음

위치: score 태그 바로 뒤 (line 122~123 이후)

```tsx
{delta != null && (
  <span className={cn(
    "text-[10px] font-bold tabular-nums",
    delta > 0 ? "text-danger" : delta < 0 ? "text-safe" : "text-muted-foreground",
  )}>
    {delta > 0 ? "+" : ""}{delta.toFixed(1)}
  </span>
)}
```

#### 변경 3: 펼침 영역에 전일 비교 표시 (선택적)

expanded 상태에서 progress bar 위에 "전일 35.0 -> 금일 38.2" 텍스트를 작게 표시한다.

```tsx
{previousScore != null && (
  <div className="mb-1 text-[10px] text-muted-foreground tabular-nums">
    전일 {previousScore.toFixed(1)} -> 금일 {score.toFixed(1)}
  </div>
)}
```

---

### 4-3. 글랜스: CategoryRiskList 경유 전달

**파일:** `components/dashboard/category-risk-list.tsx`

#### 변경: dailyDelta.categories를 각 CategoryRiskBar에 전달

```typescript
// 현재
interface CategoryRiskListProps {
  categories: Record<CategoryKey, CategoryRisk>;
}

// 변경 후
interface CategoryRiskListProps {
  categories: Record<CategoryKey, CategoryRisk>;
  categoryDeltas?: DailyDelta["categories"] | null;   // 추가
}
```

```tsx
// CategoryRiskBar 렌더링 시
<CategoryRiskBar
  key={cat.key}
  categoryKey={cat.key}
  label={cat.label}
  score={risk.score}
  trend={risk.trend}
  keyIssues={risk.keyIssues}
  index={index}
  isOpen={openCategory === cat.key}
  isLast={index === CATEGORIES.length - 1}
  onToggle={() => handleToggle(cat.key)}
  delta={categoryDeltas?.[cat.key]?.delta}              // 추가
  previousScore={categoryDeltas?.[cat.key]?.previousScore}  // 추가
/>
```

---

### 4-4. 드릴다운: BriefingCompact 탭 확장

**파일:** `components/dashboard/briefing-compact.tsx`

#### 변경: 2탭 구조로 변경

현재 단일 "민생 브리핑" 콘텐츠를 **"AI 브리핑 | 전일대비"** 2탭으로 분리한다.

```
+------------------------------+
| [AI 브리핑] [전일대비]       |    <- 탭 버튼
+------------------------------+
| (선택된 탭 콘텐츠)           |
+------------------------------+
```

#### Props 확장

```typescript
// 현재
interface BriefingCompactProps {
  briefing: BriefingData;
}

// 변경 후
interface BriefingCompactProps {
  briefing: BriefingData;
  dailyDelta?: DailyDelta | null;        // 추가
  currentScore?: number;                 // 추가 (종합점수, severity 계산용)
}
```

#### "전일대비" 탭 내용 구성

```
+------------------------------+
| 종합 변화                    |
| 60점 (전일대비 +5, 주의)     |
| 관찰 -> 주의 등급 변경       |    <- severityChanged일 때만
+------------------------------+
| 카테고리별 변화              |
| 물가     35.0 -> 38.2  +3.2 |
| 고용     62.1 -> 66.8  +4.7 |
| 자영업   34.0 -> 32.4  -1.6 |
| 금융     39.5 -> 41.1  +1.6 |
| 부동산   58.0 -> 60.1  +2.1 |
+------------------------------+
| 신호 변화                    |
| 신규 감지 3건 / 해소 2건     |
| 등급 상향 1건 / 하향 0건     |
+------------------------------+
| AI 비교 분석                 |
| (dailyDelta.aiSummary 텍스트)|
+------------------------------+
```

#### null 처리

`dailyDelta === null`일 때:
- "전일대비" 탭 자체를 비활성화하거나 숨김
- 또는 탭은 표시하되, "다음 분석 후 전일대비 변화를 확인할 수 있습니다" 안내 표시

---

### 4-5. DashboardPage 데이터 전달 변경

**파일:** `components/dashboard/dashboard-page.tsx`

```tsx
// 현재
<HeroKpiTile
  score={dashboard.overallScore}
  lastUpdated={dashboard.lastUpdated}
  scoreHistory={dashboard.scoreHistory}
  stats={dashboard.signalStats}
  recentSignals={dashboard.recentSignals}
  categoryDist={dashboard.categoryDist}
  signalDelta={dashboard.signalDelta}
/>

// 변경 후
<HeroKpiTile
  score={dashboard.overallScore}
  lastUpdated={dashboard.lastUpdated}
  scoreHistory={dashboard.scoreHistory}
  stats={dashboard.signalStats}
  recentSignals={dashboard.recentSignals}
  categoryDist={dashboard.categoryDist}
  signalDelta={dashboard.signalDelta}
  dailyDelta={dashboard.dailyDelta}              // 추가
/>

// 현재
<CategoryRiskList categories={dashboard.categories} />

// 변경 후
<CategoryRiskList
  categories={dashboard.categories}
  categoryDeltas={dashboard.dailyDelta?.categories}  // 추가
/>

// 현재
<BriefingCompact briefing={briefing} />

// 변경 후
<BriefingCompact
  briefing={briefing}
  dailyDelta={dashboard.dailyDelta}              // 추가
  currentScore={dashboard.overallScore}          // 추가
/>
```

---

## 5. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `components/dashboard/dashboard-page.tsx` | 수정 | dailyDelta를 하위 컴포넌트에 전달 |
| `components/dashboard/hero-kpi-tile.tsx` | 수정 | scoreDelta 소스 교체, severity 변경 뱃지, 신호 변화 표시 |
| `components/dashboard/category-risk-bar.tsx` | 수정 | delta 뱃지 추가, 펼침 영역에 전일 비교 |
| `components/dashboard/category-risk-list.tsx` | 수정 | categoryDeltas를 각 bar에 전달 |
| `components/dashboard/briefing-compact.tsx` | 수정 | 2탭 구조로 변경, "전일대비" 탭 추가 |
| `lib/api/mock-data.ts` | 수정 | 샘플 dailyDelta 추가 (개발/테스트용) |

**신규 파일 없음** - 모든 변경은 기존 컴포넌트 수정으로 처리

---

## 6. 개발 순서

### Step 1: mock dailyDelta 준비
- `lib/api/mock-data.ts`에서 `dailyDelta: null`을 샘플 데이터로 교체
- UI 개발 및 검증에 사용

### Step 2: 글랜스 레벨 구현
1. `dashboard-page.tsx` - dailyDelta 전달 추가
2. `hero-kpi-tile.tsx` - scoreDelta 소스 교체 + severity 뱃지 + 신호 변화
3. `category-risk-list.tsx` - categoryDeltas 전달
4. `category-risk-bar.tsx` - delta 뱃지 + 펼침 영역 전일 비교

### Step 3: 드릴다운 패널 구현
1. `briefing-compact.tsx` - 2탭 구조로 리팩터링
2. "전일대비" 탭 내부 콘텐츠 구현 (종합 변화, 카테고리 테이블, 신호 변화, AI 요약)

### Step 4: null 처리 및 엣지 케이스
- dailyDelta가 null일 때 모든 컴포넌트의 graceful fallback 확인
- 개별 카테고리 delta가 null일 때 처리
- aiSummary가 null일 때 처리

### Step 5: 검증
- mock 데이터로 전체 UI 확인
- dailyDelta null 상태에서 기존 UI 유지 확인
- 반응형(모바일/태블릿) 레이아웃 확인

---

## 7. 주의사항

1. **기존 UI 파괴 방지**: dailyDelta가 없을 때(null) 현재 대시보드와 완전히 동일하게 동작해야 함
2. **하드코딩 금지**: 색상은 globals.css의 `--danger`, `--safe`, `--warning` 등 CSS 변수만 사용
3. **이모지 사용 금지**: 방향 표시는 HugeIcons 아이콘 또는 텍스트 화살표(->) 사용
4. **선택적 props**: 모든 새 props는 optional(`?`)로 추가하여 하위 호환성 유지
5. **타입 안전성**: `delta != null` 체크 시 `!== null && !== undefined` 처리 주의
