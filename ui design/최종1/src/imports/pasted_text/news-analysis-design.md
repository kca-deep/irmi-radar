# 이르미 뉴스분석 화면 — 상세 디자인 명세

## ⚠ 중요 원칙
이 화면은 기존 개발된 UI를 최대한 유지합니다.
아래 명시된 3가지만 변경하고 나머지는 절대 건드리지 마세요.

**변경사항 3가지만**
1. 페이지 배경: 흰색 → #F5F5F5
2. 카드: 테두리(border) 제거 → box-shadow 0 2px 10px rgba(0,0,0,0.06) 로 대체
3. 네비게이션: 공통 네비 스타일 적용 (대시보드와 동일)

**절대 변경 금지**
- 카드 내부 구성 (카테고리 파스텔 배지 + 아이콘 + 위험도 배지)
- 필터 바 구성 및 위치
- 레이아웃 구조 (카드 그리드 방식)
- 기사 상세 팝업 모달
- AI 분석 실행 모달
- 분석 초기화 버튼

---

## 캔버스 설정
- 프레임 크기: 1440 × 1000px
- 배경색: #F5F5F5 (변경)
- 폰트: Pretendard

---

## 1. 네비게이션 바
대시보드와 동일. "뉴스분석" 탭이 활성 상태.

---

## 2. 페이지 헤드

네비 아래 12px, margin-bottom 12px
display flex, align-items flex-end, justify-content space-between

**좌측**
- "뉴스 기사를 AI로 분석하고 위험도를 확인하세요": font-size 11px, color #AAAAAA, margin-bottom 3px
- "뉴스 분석": font-size 22px, font-weight 900, letter-spacing -0.5px, color #1A1A1A

**우측** display flex, gap 8px, align-items center
- "분석 초기화" 버튼:
  background #FFFFFF, border none, border-radius 8px
  box-shadow 0 1px 6px rgba(0,0,0,0.08)
  padding 7px 14px, font-size 11px, color #888888, cursor pointer

- "AI 분석 시작하기" 버튼:
  background #1A1A1A, border none, border-radius 8px
  padding 7px 16px, font-size 11px, color #FFFFFF, font-weight 700
  좌측에 ▶ 아이콘 (font-size 10px), gap 5px

---

## 3. 분석 결과 요약 스트립

height 40px, background #FFFFFF, border-radius 10px
box-shadow 0 2px 10px rgba(0,0,0,0.05)
border-left 3px solid #E8521A
padding 0 18px
display flex, align-items center, gap 18px
margin-bottom 10px

**좌측** display flex, gap 18px, align-items center
- 오렌지 원형 도트: width 8px, height 8px, border-radius 50%, background #E8521A
- 항목들 (각각 display flex, align-items center, gap 6px):
  · "종합 리스크" (font-size 10px color #AAAAAA) + "65점" (font-size 13px font-weight 700 color #E8521A)
  · 구분선 (width 0.5px height 16px background #EEEEEE)
  · "위기신호" + "4건" (font-weight 700 color #1A1A1A)
  · 구분선
  · "분석 완료" + "50건" (font-weight 700 color #1A1A1A)
  · 구분선
  · "대시보드 반영" + "✓ 완료" (font-weight 700 color #5DAA30)

**우측** margin-left auto
- "마지막 분석 10:07": font-size 10px, color #CCCCCC

---

## 4. 필터/검색 바

height 44px, background #FFFFFF, border-radius 10px
box-shadow 0 2px 10px rgba(0,0,0,0.05)
padding 0 16px
display flex, align-items center, gap 8px
margin-bottom 14px

**검색 영역** display flex, align-items center, gap 8px
- 돋보기 아이콘 (Hugeicons search, 14px, color #CCCCCC)
- 검색 인풋: border none, outline none, font-size 11px, color #333333, placeholder color #CCCCCC, placeholder "기사 검색...", width 150px

**구분선**: width 0.5px, height 18px, background #EEEEEE

**카테고리 탭** display flex, gap 2px
각 탭: font-size 11px, padding 5px 11px, border-radius 8px, border none, background transparent, cursor pointer
- 활성("전체"): background #F5F5F5, color #1A1A1A, font-weight 700
- 비활성: color #BBBBBB
탭 목록: 전체 / 물가 / 고용 / 자영업 / 금융 / 부동산

**구분선**

**분석완료 토글** display flex, align-items center, gap 6px
- 토글 스위치: width 28px height 16px, border-radius 8px, background #E8521A (ON 상태)
  내부 원: width 12px height 12px, background #FFFFFF, position right
- "분석 완료만": font-size 11px, color #888888

**우측** margin-left auto
- "50건": font-size 11px, color #AAAAAA

---

## 5. 피처 기사 (상단, 가장 위험한 기사)

background #FFFFFF, border-radius 14px
box-shadow 0 4px 20px rgba(0,0,0,0.08)
padding 22px 26px
margin-bottom 10px
display grid, grid-template-columns 1fr auto, gap 24px, align-items center
cursor pointer
hover: box-shadow 0 8px 28px rgba(0,0,0,0.12), translateY(-2px)
border-left: 4px solid #E24B4A

**좌측**
상단 행 (display flex, align-items center, gap 8px, margin-bottom 12px):
- 카테고리 배지: "🛒 물가" — background #FFF3CD, color #856404, font-size 10px, font-weight 600, padding 3px 10px, border-radius 8px
- 위험도 배지: "긴급" — background #FEF0F0, color #E24B4A, font-size 10px, font-weight 800, padding 4px 12px, border-radius 20px
- 날짜: "12월 29일" — font-size 11px, color #CCCCCC
- 기자명: "이혜훈 기자" — font-size 11px, color #AAAAAA

제목:
"이혜훈 \"한국경제 회색코뿔소 상황…성장에 과감히 투자\""
font-size 18px, font-weight 900, color #1A1A1A, line-height 1.4, letter-spacing -0.4px, margin-bottom 12px

키워드 태그들 (display flex, gap 6px, flex-wrap wrap):
각 태그: background #F5F5F5, color #888888, font-size 10px, padding 4px 12px, border-radius 20px
태그: 고물가 / 고환율 / 회색코뿔소 / 인구위기 / 기후위기

**우측** (flex-shrink 0, display flex, flex-direction column, align-items center, gap 4px)
- 점수 숫자: "85" — font-size 44px, font-weight 900, color #E24B4A, line-height 1
- 레이블: "위험도 점수" — font-size 10px, color #AAAAAA

---

## 6. 기사 카드 그리드

grid-template-columns: repeat(3, 1fr)
gap: 10px

**카드 공통 스타일** (기존 유지, 테두리만 제거)
- background #FFFFFF
- border-radius 12px
- box-shadow 0 2px 10px rgba(0,0,0,0.06) ← (변경: 기존 border 제거, shadow 추가)
- padding 14px 16px
- cursor pointer
- hover: box-shadow 0 5px 18px rgba(0,0,0,0.10), translateY(-2px)

**카드 내부 구성 (기존 그대로 유지)**

상단 행 (display flex, align-items center, gap 6px, margin-bottom 10px):
- 카테고리 배지 (파스텔 배지, 기존 스타일 그대로)
- 위험도 배지 (기존 스타일 그대로)
- 날짜 (margin-left auto, font-size 10px, color #CCCCCC)

제목:
font-size 12px, font-weight 700, color #1A1A1A, line-height 1.55, margin-bottom 8px, letter-spacing -0.1px

키워드 태그 (display flex, gap 4px, flex-wrap wrap):
background #F5F5F5, color #999999, font-size 10px, padding 2px 8px, border-radius 10px

**카드 6개 데이터**

카드 1:
- 카테고리: "🏦 금융" (파란 파스텔)
- 위험도: "긴급 85" (레드)
- 날짜: 12월 29일
- 제목: "생산 줄이는데 관세까지 첩첩산중…치솟는 구리값"
- 키워드: 구리 가격 / 관세 / 산업 금속

카드 2:
- 카테고리: "🏦 금융" (파란 파스텔)
- 위험도: "긴급 85" (레드)
- 날짜: 12월 29일
- 제목: "\"내년에도 내집마련 꿈도 꾸지말라네요\"…당국, 벌써부터 대출자제령"
- 키워드: 가계대출 / 금융위원회

카드 3:
- 카테고리: "🏠 부동산" (초록 파스텔)
- 위험도: "주의 78" (오렌지)
- 날짜: 12월 29일
- 제목: "10억 오른 올해…교통망 확충에 들쑤이는 수서 부동산"
- 키워드: 수서 / 올림픽훼밀리타운

카드 4:
- 카테고리: "🛒 물가" (노란 파스텔)
- 위험도: "주의 78" (오렌지)
- 날짜: 12월 28일
- 제목: "\"초기대응 미흡\" 한달만에 사과한 김법석…국회 청문회는 또 불출석"
- 키워드: 개인정보 유출 / 쿠팡

카드 5:
- 카테고리: "🏠 부동산" (초록 파스텔)
- 위험도: "주의 78" (오렌지)
- 날짜: 12월 28일
- 제목: "서울아파트 샀다가 취소…계약 해제율 5년새 최고"
- 키워드: 계약 해제 / 서울 아파트

카드 6:
- 카테고리: "🏪 자영업" (빨간 파스텔)
- 위험도: "주의 75" (앰버)
- 날짜: 12월 28일
- 제목: "불났는데 건물주·임차인 '화재보험 같다'…대법 \"세입자에 배상 요구 못해\""
- 키워드: 화재보험 / 임차인

---

## 7. 더 보기 버튼

margin-top 12px, text-align center
- 버튼: background #FFFFFF, border none, border-radius 8px
  box-shadow 0 2px 8px rgba(0,0,0,0.06)
  padding 10px 28px, font-size 11px, color #888888, cursor pointer
  텍스트: "더 보기 · 41건 남음"