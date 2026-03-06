# 데이터 구조 설명서

> 이르미 프로젝트에서 사용하는 데이터의 구조와 의미를 비전공자 눈높이로 설명합니다.

---

## 전체 데이터 흐름

```
[뉴스 기사]                    [Claude AI 분석]              [화면 표시]
 매경 뉴스 JSON    ------>    카테고리 분류          ------>   대시보드
                              위험도 점수 산출                 위기 신호
                              위기 신호 감지                   뉴스 분석
                              요약/키워드 추출
```

```
[외부 API]                                                  [화면 표시]
 보조금24 API      ------>   관련 정부 지원정책     ------>   정책 목록
 국회 오픈API      ------>   관련 입법/청원 동향    ------>   국회 동향
```

---

## JSON 파일별 역할

| 파일명 | 위치 | 역할 | 사용 화면 |
|--------|------|------|----------|
| `dashboard.json` | data/mock/ | 대시보드 종합 데이터 | 대시보드 탭 전체 |
| `signals.json` | data/mock/ | 위기 신호 목록 | 위기 신호 탭 |
| `news.json` | data/mock/ | 뉴스 기사 목록 | 뉴스 분석 탭 |
| `briefing.json` | data/mock/ | AI 브리핑 데이터 | 대시보드 AI 브리핑 |
| `crisis-chain.json` | data/mock/ | 위기 연쇄 관계 | 대시보드 연쇄 맵 |
| `policies.json` | data/mock/ | 정부 지원 정책 | 위기 신호 상세 |
| `regions.json` | data/mock/ | 지역별 위기 현황 | 위기 신호 지도 |
| `chat-examples.json` | data/mock/ | AI 채팅 예시 | AI 채팅 패널 |

---

## 핵심 데이터 구조 상세

### 1. 대시보드 데이터 (dashboard.json)

대시보드 탭에 표시되는 종합 데이터입니다.

```
DashboardData
+-- lastUpdated          마지막 업데이트 시각
|                        예: "2026-01-19T14:00:00+09:00"
|
+-- overallScore         종합 리스크 점수 (0~100)
|                        예: 67 -> 화면의 원형 게이지에 표시
|
+-- categories           5대 카테고리별 위험도
|   +-- prices           물가
|   |   +-- label        표시 이름: "물가"
|   |   +-- score        위험도 점수: 72
|   |   +-- trend        추세: "rising" (상승) / "stable" (보합) / "falling" (하락)
|   |   +-- keyIssues    주요 이슈 목록: ["소비자물가 4개월 연속 상승", ...]
|   +-- employment       고용 (동일 구조)
|   +-- selfEmployed     자영업 (동일 구조)
|   +-- finance          금융 (동일 구조)
|   +-- realEstate       부동산 (동일 구조)
|
+-- signalStats          신호 통계 (숫자)
|   +-- critical         긴급 신호 수: 2
|   +-- warning          주의 신호 수: 5
|   +-- caution          관찰 신호 수: 8
|   +-- surging          급상승 신호 수: 2
|
+-- recentSignals        최근 감지된 신호 미리보기 (4건)
|   +-- [0]
|       +-- id           신호 고유 번호
|       +-- title        신호 제목
|       +-- severity     등급: "critical" / "warning" / "caution" / "safe"
|       +-- score        점수
|       +-- category     카테고리 키
|       +-- date         감지 날짜
|
+-- scoreHistory         점수 이력 (그래프용, 약 90일분)
|   +-- [0]
|       +-- date         날짜: "10.22"
|       +-- score        해당일 점수: 48
|
+-- categoryScoreHistory 카테고리별 점수 이력 (스파크라인 그래프용)
    +-- [0]
        +-- date         날짜
        +-- prices       물가 점수
        +-- employment   고용 점수
        +-- selfEmployed 자영업 점수
        +-- finance      금융 점수
        +-- realEstate   부동산 점수
```

### 2. 위기 신호 (signals.json)

감지된 위기 신호 하나하나의 상세 정보입니다.

```
Signal (신호 1건)
+-- id                   고유 번호: "sig-001"
+-- title                제목: "배달앱 수수료 인상에 따른 자영업 위기"
+-- description          상세 설명 (2~3문장)
+-- severity             위기 등급
|                        "critical" = 긴급 (80~100점)
|                        "warning"  = 주의 (60~79점)
|                        "caution"  = 관찰 (40~59점)
|                        "safe"     = 안전 (0~39점)
+-- score                위험도 점수: 85
+-- category             카테고리 키: "selfEmployed"
+-- categoryLabel        카테고리 한글명: "자영업"
+-- region               관련 지역: "전국" / "서울" / "경기" 등
+-- relatedArticleIds    관련 뉴스 기사 ID 목록: ["news-001", "news-005"]
+-- detectedAt           감지 일시: "2026-01-19T10:00:00+09:00"
+-- evidence             근거 자료 목록
|                        ["배달앱 3사 수수료 평균 5%p 인상",
|                         "자영업자 폐업 신고 전월 대비 12% 증가"]
+-- analysis             AI 분석 결과
    +-- cause            원인: "플랫폼 독점에 따른 수수료 인상 구조"
    +-- impact           영향: "영세 자영업자 수익률 악화"
    +-- actionPoints     대응 방안 목록
                         ["수수료 상한제 논의 필요",
                          "소상공인 긴급 지원금 검토"]
```

### 3. 뉴스 기사 (news.json)

분석 대상 뉴스 기사의 정보입니다.

```
NewsArticle (기사 1건)
+-- id                   고유 번호: "news-001"
+-- title                제목: "배달앱 수수료 또 인상...자영업자 '한숨'"
+-- summary              요약 (1~2문장)
+-- category             카테고리 키: "selfEmployed"
+-- categoryLabel        카테고리 한글명: "자영업"
+-- keywords             키워드 목록: ["배달앱", "수수료", "자영업자"]
+-- publishedAt          발행일시: "2026-01-19T09:00:00+09:00"
+-- section              뉴스 섹션: "경제"
+-- content              기사 본문 (선택, 길 수 있음)
+-- source               출처: "매일경제"
+-- region               관련 지역 (선택)
+-- analysis             AI 분석 결과 (선택, 분석 실행 후 추가됨)
    +-- riskScore        위험도 점수: 78
    +-- severity         등급: "warning"
    +-- signalId         관련 위기 신호 ID
    +-- signalTitle      관련 위기 신호 제목
    +-- keyFactors       핵심 요인: ["수수료 인상폭 5%p", "영세 자영업자 타격"]
    +-- relatedCategories 관련 카테고리: ["selfEmployed", "prices"]
    +-- impactRegion     영향 지역: "전국"
    +-- summary          분석 요약
```

### 4. AI 브리핑 (briefing.json)

AI가 생성한 오늘의 브리핑 데이터입니다.

```
BriefingData
+-- generatedAt          생성 시각
+-- summary              종합 요약 (3~5문장)
+-- highlights           주요 하이라이트 (카테고리별 핵심 메시지)
|   +-- [0]
|       +-- category     카테고리 키: "selfEmployed"
|       +-- message      "배달앱 수수료 인상으로 자영업 위기 심화"
+-- recommendation       대응 권고사항
+-- forecast             전망
    +-- period           전망 기간: "향후 1개월"
    +-- outlook          전망 요약
    +-- scenarios        시나리오 비교
        +-- [0]
            +-- type     "current" (현행 유지) / "withResponse" (대응 시)
            +-- label    라벨
            +-- overallScore  예상 점수
            +-- description   설명
```

### 5. 위기 연쇄 관계 (crisis-chain.json)

카테고리 간 위기가 어떻게 연결되는지 보여주는 데이터입니다.

```
CrisisChainData
+-- nodes                카테고리 노드 (5개)
|   +-- [0]
|       +-- id           카테고리 키: "prices"
|       +-- label        한글명: "물가"
|       +-- score        점수: 72
|
+-- edges                카테고리 간 연결선
|   +-- [0]
|       +-- from         출발 카테고리: "prices"
|       +-- to           도착 카테고리: "selfEmployed"
|       +-- label        관계 설명: "원가 상승 -> 자영업 수익 악화"
|       +-- strength     연결 강도: "strong" / "moderate" / "weak"
|
+-- chains               연쇄 반응 경로
    +-- [0]
        +-- id           고유 번호
        +-- name         이름: "물가-자영업 연쇄 위기"
        +-- description  설명
        +-- path         경로: ["prices", "selfEmployed", "employment"]
        +-- currentlyActive  현재 활성 여부: true/false
```

### 6. 정부 지원 정책 (policies.json)

위기 신호에 대응하는 정부 지원 정책입니다.

```
Policy (정책 1건)
+-- id                   고유 번호
+-- title                정책명: "소상공인 긴급 경영안정자금"
+-- description          정책 설명
+-- provider             제공 기관: "중소벤처기업부"
+-- contact              연락처
+-- url                  상세 페이지 링크
+-- targetCategories     대상 카테고리: ["selfEmployed"]
+-- targetRegions        대상 지역: ["전국"]
+-- relatedSignals       관련 위기 신호 ID
+-- eligibility          자격 요건: "매출 감소 20% 이상 소상공인"
+-- benefit              지원 내용: "최대 3천만원 저금리 대출"
```

### 7. 지역 데이터 (regions.json)

17개 시도별 위기 현황입니다.

```
RegionRisk (지역 1건)
+-- id                   지역 코드: "seoul"
+-- name                 지역명: "서울"
+-- score                종합 위험도: 71
+-- trend                추세: "rising"
+-- categories           카테고리별 점수
|   +-- prices           물가 점수: 75
|   +-- employment       고용 점수: 62
|   +-- selfEmployed     자영업 점수: 80
|   +-- finance          금융 점수: 68
|   +-- realEstate       부동산 점수: 58
+-- topIssue             최대 이슈: "자영업 폐업률 급증"
```

---

## 5대 카테고리 상세

| 카테고리 | 영문 키 | 감지 대상 | 예시 뉴스 |
|---------|---------|----------|----------|
| 물가 | `prices` | 소비자물가, 식료품, 공공요금, 생활비 | "계란값 20% 급등" |
| 고용 | `employment` | 실업률, 구조조정, 채용, 청년고용 | "대기업 구조조정 발표" |
| 자영업 | `selfEmployed` | 폐업률, 소상공인, 배달앱, 임대료 | "배달앱 수수료 인상" |
| 금융 | `finance` | 금리, 가계부채, 연체율, 서민금융 | "신용카드 연체율 상승" |
| 부동산 | `realEstate` | 집값, 전세, 월세, 주거비 | "전세사기 피해 급증" |

---

## 4단계 위기 등급

| 등급 | 영문 키 | 점수 범위 | 색상 | 의미 |
|------|---------|----------|------|------|
| 긴급 | `critical` | 80~100 | 빨간색 (--danger) | 즉각 대응 필요 |
| 주의 | `warning` | 60~79 | 주황색 (--warning) | 주의 깊은 모니터링 |
| 관찰 | `caution` | 40~59 | 노란색 (--caution) | 추이 관찰 필요 |
| 안전 | `safe` | 0~39 | 초록색 (--safe) | 정상 범위 |

---

## 추세 표시

| 추세 | 영문 키 | 의미 | 화면 표시 |
|------|---------|------|----------|
| 상승 | `rising` | 위험도 증가 중 | 위쪽 화살표 (빨간) |
| 보합 | `stable` | 변화 없음 | 가로줄 (회색) |
| 하락 | `falling` | 위험도 감소 중 | 아래쪽 화살표 (초록) |

---

## 데이터 수정 시 주의사항

1. **JSON 형식 유지**: 쉼표, 중괄호, 대괄호 위치 정확히
2. **필드명 정확히**: `"overallScore"` (O) / `"overall_score"` (X)
3. **값 타입 유지**: 숫자는 숫자로, 문자열은 따옴표로 감싸서
4. **카테고리 키 5개 고정**: `prices`, `employment`, `selfEmployed`, `finance`, `realEstate`
5. **등급 키 4개 고정**: `critical`, `warning`, `caution`, `safe`
6. **날짜 형식**: ISO 8601 (`"2026-01-19T14:00:00+09:00"`)
