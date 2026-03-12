# UI 스타일 개선 계획서

> 참고 사이트: [KOSIS 국가통계포털](https://kosis.kr/index/index.do), [ECOS 한국은행경제통계시스템](https://ecos.bok.or.kr/#/)
> 작성일: 2026-03-12

---

## 1. 핵심 디자인 원칙 (KOSIS/ECOS 공통 분석)

| 원칙 | ECOS 사례 | KOSIS 사례 | 현재 이르미 문제 |
|------|-----------|------------|-----------------|
| **숫자가 주인공** | GDP -0.2% 카드, 큰 볼드 숫자 | 추계인구 5,161만명, 큰 숫자 | AI 브리핑 텍스트가 주인공, 숫자가 묻힘 |
| **비교 가능한 구조** | 5개 지표 카드 가로 동일 패턴 | 27개 카테고리 아이콘 그리드 | 불규칙 벤토 그리드, 비교 어려움 |
| **절제된 색상** | 흰 배경 + 빨강/파랑 포인트만 | 녹색 포인트 + 나머지 중립 | 원색 심각도 배지가 과다 |

---

## 2. 마스코트 "이르미" 활용 전략

### 2-1. 캐릭터 개요

- 캐릭터: 미어캣(Meerkat) - "망보기" 습성이 민생위기 조기경보와 콘셉트 매치
- 의상: 파란색 안전 조끼 (공공기관/안전 이미지)
- 특징: 머리 위 레이더 안테나 + 신호 파동 (레이더 시스템 상징)
- 핵심 차별점: KOSIS는 마스코트가 단순 장식이지만, 이르미는 **위기 등급에 따라 포즈가 변화** (정보 전달 + 감성 전달 이중 역할)

### 2-2. 보유 에셋 (3장 시트, 추가 제작 불필요)

**시트 1 - Multi-Angle Views** (`docs/meerkat/Gemini_Generated_Image_vywhh8vywhh8vywh.jpg`)

| 포즈 | 파일명 | 주요 용도 |
|------|--------|----------|
| Left Profile | `irmi-left-profile.png` | 지도 영역 장식 (지도를 바라보는 방향) |
| Front 3/4 Left | `irmi-front-3-4-left.png` | 예비 |
| Front | `irmi-front.png` | 기본 브랜딩 |
| Right Profile (망보기) | `irmi-right-profile.png` | 주의 등급 브리핑, 빈 상태 |
| Close-Up | `irmi-close-up.png` | 헤더 로고, ChatFab, 채팅 아바타 |
| Top-Down | `irmi-top-down.png` | 예비 |
| Bottom-Up | `irmi-bottom-up.png` | 예비 |
| Back View x2 | `irmi-back-view.png` | 예비 |

**시트 2 - Expression Pack** (`docs/meerkat/Gemini_Generated_Image_7p822c7p822c7p82.jpg`)

| 표정 | 파일명 | 주요 용도 |
|------|--------|----------|
| Happy (미소) | `irmi-happy.png` | 안전 등급, 분석 완료 |
| Focused (집중) | `irmi-focused.png` | 분석 진행 중 |
| Surprised (놀람) x2 | `irmi-surprised.png` | 급격한 등급 변화 알림 |
| Confused (혼란) | `irmi-confused.png` | 검색결과 없음 |
| Sad (슬픔) | `irmi-sad.png` | 404 페이지 |
| Silly/Wink (익살) | `irmi-silly.png` | 이스터에그 |
| Stern (엄격) | `irmi-stern.png` | 예비 |
| Brown (엄격) | `irmi-brown.png` | 예비 |
| Panicked (공황) | `irmi-panicked.png` | 시스템 에러, 500 에러 |

**시트 3 - Expanded Expression & Pose Pack** (`docs/meerkat/Gemini_Generated_Image_o1keo1o1keo1o1ke.jpg`)

| 포즈/표정 | 파일명 | 주요 용도 |
|-----------|--------|----------|
| Happy (미소) | 시트2와 동일 | 안전 등급 |
| Focused (집중) | 시트2와 동일 | 분석 중 |
| Surprised (놀람) x2 | 시트2와 동일 | 급변 알림 |
| Confused (혼란) | 시트2와 동일 | 빈 상태 |
| **Urgent (긴급/경고)** | `irmi-urgent.png` | 긴급 등급(80~100) 브리핑 |
| **Guide/Point (안내/가리키기)** | `irmi-guide.png` | 핵심 제언, 온보딩 투어 |
| **Analyzing (분석 중)** | `irmi-analyzing.png` | AI 분석 진행 모달 |
| **Thumbs Up (엄지척/축하)** | `irmi-thumbs-up.png` | 분석 완료, 안전 달성 |
| **Sleeping/Standby (잠자기/대기)** | `irmi-sleeping.png` | 미실행 상태, 대기 |

### 2-3. 에셋-사용처 최종 매핑

```
[헤더 로고]              -> Close-Up (시트1)
[ChatFab 버튼]           -> Close-Up (시트1)
[채팅창 아바타]           -> Close-Up (시트1)

[브리핑 - 안전 0~39]     -> Happy (시트3)
[브리핑 - 관찰 40~59]    -> Focused (시트3)
[브리핑 - 주의 60~79]    -> Right Profile 망보기 (시트1)
[브리핑 - 긴급 80~100]   -> Urgent 긴급/경고 (시트3)

[핵심 제언 안내]          -> Guide/Point 가리키기 (시트3)
[지도 영역 장식]          -> Left Profile (시트1)

[로딩 중]                -> Focused (시트2) + CSS pulse 애니메이션
[검색결과 없음]           -> Confused (시트2)
[에러 상태]              -> Panicked (시트2)
[404 페이지]             -> Sad (시트2)

[분석 대기/미실행]        -> Sleeping (시트3)
[분석 진행 중]            -> Analyzing 돋보기 (시트3)
[분석 완료]              -> Thumbs Up (시트3)
[온보딩 투어]             -> Guide/Point (시트3)
```

### 2-4. 에셋 저장 구조

```
public/mascot/
  irmi-close-up.png        -> 헤더 로고, ChatFab, 채팅 아바타
  irmi-front.png            -> 기본 브랜딩
  irmi-right-profile.png    -> 주의 등급 브리핑, 빈 상태
  irmi-left-profile.png     -> 지도 영역 장식
  irmi-happy.png            -> 안전 등급, 분석 완료
  irmi-focused.png          -> 분석 중, 관찰 등급
  irmi-surprised.png        -> 급변 알림
  irmi-confused.png         -> 검색결과 없음
  irmi-sad.png              -> 404 페이지
  irmi-panicked.png         -> 시스템 에러
  irmi-urgent.png           -> 긴급 등급 브리핑
  irmi-guide.png            -> 핵심 제언, 온보딩
  irmi-analyzing.png        -> AI 분석 진행 모달
  irmi-thumbs-up.png        -> 분석 완료 축하
  irmi-sleeping.png         -> 대기/미실행 상태
```

---

## 3. 구현 Phase별 상세 계획

### Phase 1: 즉시 실행 (Low Effort / High Impact)

#### 1-1. 라이트 모드 기본값 전환

- **대상 파일**: `app/layout.tsx`, `app/globals.css`
- **이유**: KOSIS/ECOS 모두 라이트 기본. 공공 데이터 서비스는 라이트 모드가 가독성과 신뢰감 우수
- **변경 내용**:
  - FOUC 방지 스크립트의 기본값을 `light`로 변경
  - 다크 모드 토글은 유지

#### 1-2. 핵심 수치 타이포그래피 강화

- **대상 파일**: `risk-gauge.tsx`, `category-risk-bar.tsx`, `news-card.tsx`, `signal-card.tsx`
- **참고**: ECOS의 "GDP -0.2%" 표현 - 숫자 `text-3xl font-bold`, 단위 `text-sm text-muted-foreground`
- **변경 내용**:
  - 리스크 점수, 심각도 수치를 `text-2xl~3xl font-bold`로 확대
  - 라벨/단위는 `text-xs text-muted-foreground`로 축소
  - 숫자에만 `font-mono` 적용 (tabular figures)

#### 1-3. 키워드 태그 축약

- **대상 파일**: `components/news/news-card.tsx`
- **변경 내용**:
  - 기본 3개만 표시 + "+N개" 배지로 나머지 축약
  - 현재 4~6개 태그 노출 -> 시각 노이즈 감소

#### 1-4. 심각도 색상 톤 절제

- **대상 파일**: `app/globals.css` (`--danger`, `--warning`, `--caution`, `--safe` 변수)
- **참고**: ECOS는 빨강/파랑 2색 체계로 절제
- **변경 내용**:
  - 현재 원색(OKLCH 고채도) -> 채도를 20~30% 낮춰 공공기관 톤
  - 배경색에 사용할 때 더 연한 변형 추가 (예: `--danger-muted`)

#### 1-5. 마스코트 에셋 준비

- **작업**: 3장 시트에서 포즈별 개별 PNG 분리
- **저장 위치**: `public/mascot/` (15종)
- **규격**: 원본 해상도 유지 + Next.js Image 컴포넌트로 자동 최적화

#### 1-6. 헤더 로고 마스코트화

- **대상 파일**: `components/layout/app-header.tsx`
- **변경 내용**:
  - 기존 레이더 SVG 아이콘 -> Close-Up 미어캣 얼굴 (32px)
  - `next/image`로 최적화 로딩

#### 1-7. ChatFab 버튼 마스코트화

- **대상 파일**: ChatFab 컴포넌트
- **변경 내용**:
  - FAB 아이콘 -> Close-Up 미어캣 얼굴 (48px 원형)
  - hover 시 약간 커지는 `scale-105` 트랜지션
  - 채팅창 열렸을 때 상단에 Close-Up + "이르미에게 물어보기" 타이틀

---

### Phase 2: 핵심 개선 (Medium Effort / High Impact)

#### 2-1. 대시보드 상단 "핵심 지표 카드 바" 추가

- **참고**: ECOS 메인 상단의 GDP/소비자물가/생산자물가/경상수지/통화량 5개 카드 가로 배열
- **신규 파일**: `components/dashboard/category-indicator-bar.tsx`
- **구현 내용**:
  - 종합 점수 카드(좌측, 약간 더 큼) + 5대 카테고리 카드 가로 나열
  - 각 카드 구성: 카테고리 아이콘 + 이름 / 점수(큰 숫자) / 등급 배지 / 전주대비 변화량(상승 빨강 + 상승 화살표, 하락 파랑 + 하락 화살표)
  - 기준일시 표시 (`text-xs text-muted-foreground`)
  - 카드 클릭 시 하단 차트 영역 전환
  - 반응형: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (모바일 2열)

#### 2-2. AI 브리핑 패널 축소 리팩터링

- **대상 파일**: `components/dashboard/ai-briefing-panel.tsx`
- **변경 내용**:
  - 현재 80/20 split (텍스트 80% + 게이지 20%) -> 게이지를 상단 카드 바로 이동
  - 브리핑 텍스트를 2~3줄 요약으로 축소 + "전체 보기" 접기/펼치기
  - 분석된 뉴스 캐러셀은 별도 섹션으로 분리
  - 핵심 제언(추천 박스)만 눈에 띄게 유지

#### 2-3. 폰트 시스템 교체

- **대상 파일**: `app/layout.tsx`, `app/globals.css`
- **변경 내용**:
  - 본문/UI: Pretendard 또는 SUIT (한국어 최적화 산세리프)
  - 숫자/데이터: JetBrains Mono 유지 (tabular figures)
  - `.font-mono`를 데이터 수치에만 선택적 적용

#### 2-4. 카드 스타일 통일

- **대상 파일**: 모든 카드 컴포넌트
- **참고**: ECOS 카드 스타일 = 흰 배경 + `1px border-border` + `shadow-sm` + `rounded-lg`
- **변경 내용**:
  - 모든 카드에 `border` 추가 (현재 일부 카드에 border 없음)
  - 내부 패딩 `p-4` -> `p-5` 또는 `p-6` 으로 여유 확보
  - 카드 간 갭 `gap-4` -> `gap-5` 통일
  - hover 시 `shadow-md` 승격

#### 2-5. 뉴스 카드 그리드 균일화

- **대상 파일**: `components/news/news-list.tsx`, `components/news/news-card.tsx`
- **참고**: ECOS 보도자료 리스트의 균일한 구조
- **변경 내용**:
  - 벤토(불규칙) 그리드 -> 균일한 3열 그리드 (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
  - 모든 카드 동일 높이 (`h-full` + flex column)
  - Featured 카드를 없애거나, 상단 1줄만 Featured (2열 colspan)

#### 2-6. IrmiMascot 공통 컴포넌트 생성

- **신규 파일**: `components/mascot/irmi-mascot.tsx`
- **구현 내용**:

```tsx
interface IrmiMascotProps {
  pose: 'front' | 'close-up' | 'right-profile' | 'left-profile'
  expression?: 'happy' | 'focused' | 'surprised' | 'confused' | 'sad'
    | 'panicked' | 'urgent' | 'guide' | 'analyzing' | 'thumbs-up' | 'sleeping'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'  // 24, 32, 48, 80, 120px
  animate?: 'pulse' | 'bounce' | 'wave'
  className?: string
}
```

- `expression` 우선, `pose`는 앵글이 필요할 때만 사용
- 위기 등급 -> 표정 자동 매핑 유틸 함수 포함 (`getSeverityExpression()`)

#### 2-7. AI 브리핑 패널 마스코트 통합

- **대상 파일**: `components/dashboard/ai-briefing-panel.tsx`
- **변경 내용**:
  - 브리핑 카드 좌측에 80~120px 마스코트 배치
  - 종합 등급별 자동 포즈 변화:
    - 안전(0~39): Happy
    - 관찰(40~59): Focused
    - 주의(60~79): Right Profile 망보기
    - 긴급(80~100): Urgent

#### 2-8. 빈 상태/로딩 마스코트 일러스트

- **대상 파일**: 각 리스트/데이터 컴포넌트
- **변경 내용**:
  - 검색결과 없음: Confused + "검색 결과가 없어요"
  - 데이터 로딩 중: Focused + CSS pulse 애니메이션
  - 분석 미실행: Sleeping + "분석을 시작해주세요"
  - 시스템 에러: Panicked + "잠시 문제가 발생했어요"

---

### Phase 3: 중장기 개선 (High Effort / High Impact)

#### 3-1. 시계열 트렌드 차트 추가

- **참고**: ECOS 메인의 GDP 라인 차트 (전기대비/전년동기대비 토글)
- **신규 파일**: `components/dashboard/trend-chart.tsx`
- **구현 내용**:
  - 상단 카테고리 카드 클릭 시 해당 카테고리의 주간 추이 라인 차트
  - recharts `LineChart` 또는 SVG 기반 스파크라인
  - "전주대비" / "전월대비" 토글 버튼

#### 3-2. 위기 신호 탭 레이아웃 재구성

- **대상 파일**: `components/signals/signals-page.tsx`
- **참고**: ECOS 하단 3열 구조 (일정/보도자료/일일지표)
- **변경 내용**:
  - 상단: 요약 카드 바 (총 신호수, 카테고리별 분포, 전주대비 변화)
  - 지도: 높이 축소 (300px) 또는 좌측 너비 축소 (280px)
  - 필터바: 시각적 구분 (배경색 다르게)
  - 리스트 영역 확대

#### 3-3. 변화량/트렌드 표시 공통 컴포넌트

- **신규 파일**: `components/ui/change-indicator.tsx`
- **참고**: ECOS의 빨강(상승)/파랑(하락) + 화살표 패턴
- **구현 내용**:

```tsx
<ChangeIndicator value={+2.3} label="전주대비" />
// 양수: 빨강/주황 텍스트 + 상승 화살표
// 음수: 파랑 텍스트 + 하락 화살표
// 0: 회색 + 횡보 표시
```

#### 3-4. AI 분석 진행 모달 마스코트 가이드

- **대상 파일**: `components/news/analysis-progress-modal.tsx`
- **변경 내용**:
  - 분석 대기: Sleeping
  - 분석 진행: Analyzing (돋보기) + CSS pulse
  - 분석 완료: Thumbs Up
  - 단계 전환 시 fade 트랜지션

#### 3-5. 등급 변화 마스코트 전환 애니메이션

- **대상 파일**: `components/mascot/irmi-mascot.tsx`
- **변경 내용**:
  - 등급 변경 시 포즈 간 fade/slide 트랜지션
  - `framer-motion` 또는 CSS `transition` 기반

---

### Phase 4: 선택적 개선

| # | 항목 | 대상 | 설명 |
|---|------|------|------|
| 4-1 | 헤더 활성 탭 언더라인 | `app-header.tsx` | ECOS 스타일 하단 바 인디케이터 |
| 4-2 | 섹션 간 배경색 구분 | 레이아웃 전반 | KOSIS처럼 연회색 `bg-muted/30` 교대 배치 |
| 4-3 | 지원정책 리스트형 전환 | `policy-carousel.tsx` | 캐러셀 -> ECOS 공지사항 스타일 리스트 |
| 4-4 | 온보딩 투어 가이드 | 신규 컴포넌트 | 첫 방문 시 Guide/Point 포즈로 각 섹션 안내 |
| 4-5 | 404/에러 페이지 | `app/not-found.tsx` 등 | Sad/Panicked 포즈 + 안내 메시지 |

---

## 4. 변경 대상 파일 전체 요약

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `app/globals.css` | 1-1, 1-4 | 기본 테마 light, 심각도 색상 톤 조정 |
| `app/layout.tsx` | 1-1, 2-3 | 기본 테마 light, 폰트 변경 |
| `components/layout/app-header.tsx` | 1-6, 4-1 | 로고 마스코트화, 탭 언더라인 |
| ChatFab 컴포넌트 | 1-7 | FAB 마스코트화 |
| `components/dashboard/dashboard-page.tsx` | 2-1, 2-2 | 레이아웃 재구성 |
| `components/dashboard/ai-briefing-panel.tsx` | 2-2, 2-7 | 축소 + 마스코트 통합 |
| `components/dashboard/risk-gauge.tsx` | 1-2 | 숫자 크기 강화 |
| `components/dashboard/category-risk-bar.tsx` | 1-2 | 타이포 강화 |
| `components/news/news-card.tsx` | 1-2, 1-3 | 숫자 강조, 태그 축약 |
| `components/news/news-list.tsx` | 2-5 | 그리드 균일화 |
| `components/news/analysis-progress-modal.tsx` | 3-4 | 마스코트 가이드 |
| `components/signals/signal-card.tsx` | 1-2 | 수치 강조 |
| `components/signals/signals-page.tsx` | 3-2 | 레이아웃 재구성 |
| **신규** `components/dashboard/category-indicator-bar.tsx` | 2-1 | ECOS 스타일 지표 카드 바 |
| **신규** `components/mascot/irmi-mascot.tsx` | 2-6 | 마스코트 공통 컴포넌트 |
| **신규** `components/dashboard/trend-chart.tsx` | 3-1 | 시계열 차트 |
| **신규** `components/ui/change-indicator.tsx` | 3-3 | 변화량 표시 공통 컴포넌트 |

---

## 5. 마스코트 CSS 애니메이션

`globals.css`에 추가할 애니메이션:

```css
/* 안테나 레이더 파동 - 분석 중, 긴급 상태 */
@keyframes radar-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* 가벼운 바운스 - hover, 등장 */
@keyframes mascot-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* 좌우 미세 흔들림 - 로딩 중 */
@keyframes mascot-wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
```

---

## 6. 대시보드 레이아웃 변경 비교

### 변경 전 (현재)

```
+------------------------------------------------------------------+
| [AI 브리핑 패널 (텍스트 80%)]                     [게이지 20%]    |
| 종합 민생위기지수 73점(경계). 물가 54점, ...                       |
| [분석 뉴스 캐러셀]                                                |
| [핵심 제언 박스]                                                  |
+------------------------------------------------------------------+
| [위기 연쇄 현황 (네트워크 그래프)]    | [카테고리별 위험도 (리스트)] |
+------------------------------------------------------------------+
```

### 변경 후 (Phase 2 완료 시)

```
+------------------------------------------------------------------+
| [종합 62] [물가 54] [고용 50.6] [자영업 47.3] [금융 49.2] [부동산 69.9] |  <- ECOS 스타일 카드 바
+------------------------------------------------------------------+
| (마스코트)  [AI 브리핑 요약 2~3줄]                [전체보기 >]     |  <- 축소된 브리핑
|  주의 포즈   [핵심 제언 박스]                                      |
+------------------------------------------------------------------+
| [트렌드 차트 (선택된 카테고리)]                                    |  <- ECOS 스타일 차트
+------------------------------------------------------------------+
| [위기 연쇄 현황 (네트워크 그래프)]    | [카테고리별 위험도 (리스트)] |
+------------------------------------------------------------------+
```
