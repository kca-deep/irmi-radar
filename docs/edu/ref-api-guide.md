# API 설명서

> 이르미 프로젝트에서 사용하는 API(내부 + 외부)를 비전공자 눈높이로 설명합니다.

---

## API란?

```
비유: 음식점 주문 시스템

손님(웹앱)         주문서(요청)         주방(서버/외부 서비스)
  "물가 데이터       -------->         데이터를 찾아서
   보여주세요"                          정리한 다음
                    <--------
                   음식(응답)           결과를 돌려줌
                   물가 점수: 72
                   추세: 상승 중
```

- 요청(Request): "이런 데이터를 주세요"
- 응답(Response): "여기 데이터 있습니다"
- 모든 통신은 이 요청-응답 패턴으로 동작

---

## 내부 API Route (우리 서버)

웹앱 내부에서 데이터를 처리하는 통로입니다. `app/api/` 폴더에 있습니다.

### GET /api/dashboard

**역할**: 대시보드 탭에 표시할 종합 데이터 조회

**요청 예시**
```
GET /api/dashboard?period=1w
```

| 파라미터 | 설명 | 값 |
|---------|------|-----|
| period | 조회 기간 | `1w` (1주), `1m` (1개월), `3m` (3개월) |

**응답 예시 (핵심 부분)**
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "overallScore": 67,
      "categories": {
        "prices": { "label": "물가", "score": 72, "trend": "rising" },
        "employment": { "label": "고용", "score": 58, "trend": "stable" }
      },
      "signalStats": { "critical": 2, "warning": 5, "caution": 8 }
    },
    "briefing": { "summary": "..." },
    "crisisChain": { "nodes": [...], "edges": [...] }
  }
}
```

---

### GET /api/signals

**역할**: 위기 신호 목록 조회 (필터 가능)

**요청 예시**
```
GET /api/signals?category=selfEmployed&severity=critical
```

| 파라미터 | 설명 | 값 |
|---------|------|-----|
| category | 카테고리 필터 | `prices`, `employment`, `selfEmployed`, `finance`, `realEstate` |
| severity | 등급 필터 | `critical`, `warning`, `caution`, `safe` |
| region | 지역 필터 | `seoul`, `gyeonggi` 등 |

**응답 예시**
```json
{
  "success": true,
  "data": [
    {
      "id": "sig-001",
      "title": "배달앱 수수료 인상에 따른 자영업 위기",
      "severity": "critical",
      "score": 85,
      "category": "selfEmployed",
      "region": "전국"
    }
  ],
  "meta": { "total": 10 }
}
```

---

### GET /api/signals/[id]

**역할**: 특정 위기 신호의 상세 정보 조회

**요청 예시**
```
GET /api/signals/sig-001
```

**응답**: Signal 객체 1건 (evidence, analysis 포함)

---

### GET /api/news

**역할**: 뉴스 기사 목록 조회 (검색/필터 가능)

**요청 예시**
```
GET /api/news?keyword=배달앱&category=selfEmployed
```

| 파라미터 | 설명 | 값 |
|---------|------|-----|
| keyword | 검색어 | 제목/요약/키워드에서 검색 |
| category | 카테고리 필터 | `prices` 등 |

---

### GET /api/briefing

**역할**: AI 브리핑 데이터 조회

**요청 예시**
```
GET /api/briefing?period=1w
```

**응답**: 요약, 하이라이트, 권고사항, 전망 포함

---

### POST /api/chat

**역할**: AI 채팅 응답 생성

**요청 예시**
```json
{
  "message": "현재 물가 상황은 어때?",
  "history": []
}
```

| 필드 | 설명 |
|------|------|
| message | 사용자가 입력한 질문 |
| history | 이전 대화 내역 (연속 대화용) |

**응답 예시**
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "현재 물가 위험도는 72점으로 '주의' 등급입니다...",
      "relatedSignals": ["sig-002"]
    }
  }
}
```

---

### POST /api/analyze

**역할**: 뉴스 기사를 AI로 분석

**요청 예시**
```json
{
  "newsIds": ["news-001", "news-002"],
  "category": "selfEmployed"
}
```

**분석 과정 (7단계)**
```
1. 데이터 수집    -> 뉴스 기사 로드
2. 물가 분석      -> 물가 관련 기사 분석
3. 고용 분석      -> 고용 관련 기사 분석
4. 자영업 분석    -> 자영업 관련 기사 분석
5. 금융 분석      -> 금융 관련 기사 분석
6. 부동산 분석    -> 부동산 관련 기사 분석
7. 종합 산출      -> 전체 리스크 점수 계산
```

---

### GET /api/policies

**역할**: 정부 지원 정책 조회 (보조금24 API 활용)

**요청 예시**
```
GET /api/policies?category=selfEmployed&limit=5
```

| 파라미터 | 설명 |
|---------|------|
| category | 카테고리 필터 |
| region | 지역 필터 |
| signalId | 관련 위기 신호로 필터 |
| limit | 최대 조회 건수 (기본 5) |

---

### GET /api/assembly

**역할**: 국회 입법/청원 동향 조회

**요청 예시**
```
GET /api/assembly?type=legislation&category=selfEmployed
```

| 파라미터 | 설명 | 값 |
|---------|------|-----|
| type | 데이터 유형 | `petitions` (청원), `legislation` (입법예고), `bills` (의안) |
| category | 카테고리 필터 | 카테고리별 관련 키워드로 자동 검색 |
| keyword | 직접 키워드 검색 | 자유 입력 |
| limit | 최대 건수 | 기본 10 |

---

## 외부 API (연동 서비스)

### 1. Claude AI API (Anthropic)

**역할**: 뉴스 분석, 채팅 응답, 브리핑 생성 등 AI 기능

**동작 방식**
```
우리 서버 (API Route)                  Claude AI 서버
   |                                      |
   |-- System Prompt 전달 ------------>   |
   |   "당신은 민생 위기 분석             |
   |    전문가입니다..."                  |
   |                                      |
   |-- User Message 전달 ------------>    |
   |   "이 뉴스를 분석해줘: ..."          |
   |                                      |
   |<-- 분석 결과 응답 ---------------    |
   |   "위험도 78점, 자영업 카테고리..."   |
```

**환경변수**: `ANTHROPIC_API_KEY`

**사용 위치**: `lib/api/anthropic.ts`

**핵심 함수**
| 함수 | 역할 |
|------|------|
| `analyzeNews()` | 뉴스 기사 분석 (카테고리, 위험도, 키워드) |
| `generateChatResponse()` | 채팅 질문에 대한 AI 답변 생성 |
| `generateBriefing()` | 일일 브리핑 요약 생성 |

**System Prompt 예시**
```
당신은 한국의 민생 위기를 분석하는 전문가입니다.
뉴스 기사를 분석하여 물가, 고용, 자영업, 금융, 부동산
5대 카테고리에서의 위기 신호를 감지하고,
0~100 사이의 위험도 점수를 산출하세요.
```

---

### 2. 보조금24 API (행정안전부)

**역할**: 정부 지원 정책/서비스 검색

**데이터 출처**: 공공데이터포털 (data.go.kr) > 보조금24

**검색 방식**
- 카테고리별로 미리 정의된 키워드로 검색
  - 물가: "물가", "생활비", "에너지", "바우처", "긴급복지"
  - 고용: "고용", "취업", "일자리", "실업", "청년"
  - 자영업: "소상공인", "자영업", "창업", "폐업", "상가"
  - 금융: "금융", "대출", "서민금융", "장려금", "채무"
  - 부동산: "주거", "전세", "임대", "주택", "월세"

**환경변수**: `DATA_GO_KR_API_KEY`

**사용 위치**: `lib/api/gov-service.ts`

**응답 데이터 예시**
```json
{
  "serviceId": "WLF00001",
  "serviceName": "긴급복지지원",
  "servicePurpose": "위기상황에 처한 저소득 가구 긴급 지원",
  "supportType": "현금/현물",
  "targetAudience": "기준중위소득 75% 이하",
  "applyMethod": "주민센터 신청",
  "orgName": "보건복지부"
}
```

---

### 3. 국회 오픈API

**역할**: 국회 입법/청원 동향 조회

**3가지 데이터 유형**

| 유형 | 설명 | 예시 |
|------|------|------|
| 청원(petitions) | 국민이 제출한 청원 | "소상공인 보호법 제정 청원" |
| 입법예고(legislation) | 진행 중인 입법 예고 | "배달앱 수수료 상한제 법안" |
| 의안(bills) | 국회에 접수된 법안 | "가계부채 관리 특별법안" |

**검색 방식**
- 카테고리별 키워드 목록으로 자동 검색
  - 물가: "물가", "소비자", "식료품", "공공요금" 등
  - 자영업: "자영업", "소상공인", "폐업", "배달" 등

**환경변수**: `ASSEMBLY_API_KEY`

**사용 위치**: `lib/api/assembly.ts`

**응답 데이터 예시**
```json
{
  "billNo": "2100001",
  "name": "소상공인 보호 및 지원에 관한 법률 일부개정법률안",
  "proposer": "홍길동 의원 등 15인",
  "proposeDt": "2026-01-15",
  "committee": "산업통상자원중소벤처기업위원회",
  "linkUrl": "https://likms.assembly.go.kr/bill/..."
}
```

---

## 환경변수 설정 방법

### .env.local 파일 위치
```
irmi-radar/
  .env.local     <-- 이 파일
  .env.example   <-- 양식 참고용
  app/
  components/
  ...
```

### 설정해야 할 환경변수

```bash
# Claude AI API 키 (필수)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# 보조금24 API 키 (정부 정책 조회용)
DATA_GO_KR_API_KEY=xxxxxxxxxxxxx

# 국회 오픈API 키 (입법 동향 조회용)
ASSEMBLY_API_KEY=xxxxxxxxxxxxx

# 앱 이름 (화면에 표시)
NEXT_PUBLIC_APP_NAME=이르미 민생위기 조기경보 레이더
```

### API 키 발급 방법

| API | 발급처 | 링크 |
|-----|--------|------|
| Claude AI | Anthropic Console | console.anthropic.com |
| 보조금24 | 공공데이터포털 | data.go.kr |
| 국회 오픈API | 열린국회정보 | open.assembly.go.kr |

### 주의사항
- API 키는 절대 코드 파일에 직접 작성하지 않는다
- `.env.local` 파일은 Git에 올라가지 않는다 (안전)
- 해커톤 당일 교육자가 API 키를 제공할 예정

---

## API 목업(Mock) vs 실제(Real) 전환

### 현재 상태: 목업 모드
```
브라우저 --> API Route --> data/mock/*.json 파일 읽기
             (목업 데이터 반환)
```

### 해커톤 당일: 실제 모드
```
브라우저 --> API Route --> Claude API / 보조금24 / 국회 API
             (실제 데이터 반환)
```

### 전환 방법
1. `.env.local`에 API 키 설정
2. `lib/api/anthropic.ts`에서 목업 함수를 실제 API 호출로 교체
3. 클로드 코드 프롬프트 예시:
   ```
   lib/api/anthropic.ts에서 analyzeNews 함수의
   목업 응답 대신 실제 Claude API를 호출하도록 변경해줘.
   ```
