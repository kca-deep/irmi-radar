# 뉴스 기사 본문 줄바꿈 복원 및 가독성 개선 플랜

## 1. 문제 요약

뉴스 상세 모달에서 기사 본문이 문단 구분 없이 빼곡하게 표시되어 가독성이 매우 낮음.

## 2. 원인 분석

### 2-1. 근본 원인: 전처리 스크립트의 줄바꿈 제거

`scripts/preprocess-news.ts:163` 의 `stripHtml()` 함수:

```typescript
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // ... HTML 태그 제거 ...
    .replace(/\s+/g, " ")   // <-- 이 줄이 원인
    .trim();
}
```

`/\s+/g` 정규식이 `\n`, `\r` 등 줄바꿈 문자를 포함한 모든 공백을 단일 공백으로 치환.

### 2-2. 원본 데이터 확인 결과

원본 JSON (`article_body.body`)에는 줄바꿈이 존재함:

| 기사 ID    | 원본 `\n` 개수 | 원본 `\n\n` 개수 | DB `\n` 개수 |
|-----------|--------------|----------------|-------------|
| 11204838  | 13           | 1              | 0           |
| 11204831  | 27           | 3              | 0           |
| 11204839  | 26           | 2              | 0           |
| 11204845  | 36           | 2              | 0           |
| 11204852  | 59           | 4              | 0           |

원본에서는 `\n`으로 문장 구분, `\n\n`으로 문단 구분이 되어 있었으나 DB 마이그레이션 과정에서 전부 소실됨.

### 2-3. 모달 CSS 문제 (부차적)

`components/news/news-detail-modal.tsx:126`:

```tsx
<div className="text-xs leading-relaxed text-foreground whitespace-pre-line">
```

- `whitespace-pre-line`: 줄바꿈이 없으므로 효과 없음
- `text-xs` (12px): 장문 본문에 너무 작음
- `leading-relaxed` (1.625): 밀집된 한글에 부족

## 3. 수정 계획

### Step 1: stripHtml() 함수 수정

파일: `scripts/preprocess-news.ts`

변경 전:
```typescript
.replace(/\s+/g, " ")
```

변경 후:
```typescript
.replace(/[^\S\n]+/g, " ")    // 줄바꿈 제외 공백만 축소
.replace(/\n{3,}/g, "\n\n")   // 3개 이상 연속 줄바꿈 → 2개로 정리
.replace(/^\n+/, "")           // 시작 줄바꿈 제거
```

`[^\S\n]`은 "공백 문자 중 `\n`이 아닌 것"을 의미. 탭, 반복 공백 등은 축소하되 줄바꿈은 보존.

### Step 2: DB 재마이그레이션

```bash
npx tsx scripts/preprocess-news.ts \
  --data-dir "C:\Users\COMTREE\Downloads\drive-download-20260305T014251Z-1-001\01.매경뉴스json_2025\2025"
```

- 기존 DB를 삭제하고 전체 기사를 재처리
- 처리 후 샘플 기사의 `\n` 존재 여부 검증 필요

### Step 3: 모달 CSS 가독성 개선

파일: `components/news/news-detail-modal.tsx`

| 항목 | 현재 | 변경 |
|------|------|------|
| 글자 크기 | `text-xs` (12px) | `text-[13px]` |
| 줄간격 | `leading-relaxed` (1.625) | `leading-7` (28px) |
| 여백 | `p-4` | `px-5 py-4` |

`whitespace-pre-line`은 줄바꿈 복원 후 정상 동작하므로 유지.

### Step 4: AI 분석 재실행

- 기존 `analysis` 테이블의 데이터는 기사 ID 기준 JOIN이므로 영향 없음
- 단, `signals`, `signal_articles`, `dashboard_cache` 등 집계 데이터는 `analyze-news.ts` 재실행으로 갱신 필요

## 4. 검증 방법

```javascript
// DB 검증 스크립트
const db = new Database('./data/irmi.db', { readonly: true });
const rows = db.prepare(`
  SELECT id,
    CASE WHEN content LIKE '%' || char(10) || '%' THEN 'OK' ELSE 'FAIL' END as has_newline,
    length(content) as len
  FROM articles
  WHERE content IS NOT NULL
  LIMIT 10
`).all();
console.log(rows);
// 모든 행이 has_newline: 'OK' 이면 성공
```

## 5. 영향 범위

| 대상 | 영향 |
|------|------|
| `scripts/preprocess-news.ts` | stripHtml() 수정 |
| `data/irmi.db` | 전체 재생성 (articles 테이블) |
| `components/news/news-detail-modal.tsx` | CSS 클래스 수정 |
| `analysis` 테이블 | article_id JOIN이므로 구조 영향 없음, 재분석 권장 |
| `signals` / `dashboard_cache` | analyze-news.ts 재실행 필요 |

## 6. 작업 순서

1. `stripHtml()` 수정
2. DB 재마이그레이션 실행
3. DB 검증 (줄바꿈 존재 확인)
4. 모달 CSS 수정
5. 개발 서버에서 시각적 확인
6. AI 분석 재실행 (`npx tsx scripts/analyze-news.ts`)
