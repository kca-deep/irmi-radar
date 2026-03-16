# 이르미 맞춤분석 화면 — 상세 디자인 명세

## 캔버스 설정
- 프레임 크기: 1440 × 1000px
- 배경색: #F5F5F5
- 폰트: Pretendard

---

## 1. 네비게이션 바
대시보드와 동일. "맞춤분석 ★" 탭이 활성 상태.

---

## 2. 상단 프로필 바

네비 아래 12px 여백, height 40px
좌측 24px에서 시작, flex row, align-items center, gap 10px

- 직업 드롭다운:
  width 130px, height 34px, background #FFFFFF
  border 0.5px solid #E0D0C0, border-radius 8px
  font-size 11px, color #333333, padding 0 12px
  우측에 chevron-down 아이콘(Hugeicons), 옵션 "직장인" 선택됨

- 연령 드롭다운:
  width 110px, height 34px, 동일 스타일
  옵션 "30대" 선택됨

- "분석하기" 버튼:
  height 34px, padding 0 18px
  background #E8521A, color #FFFFFF
  font-size 11px, font-weight 700, border-radius 8px
  border: none

---

## 3. 페이지 전체 레이아웃

프로필 바 아래 14px 여백
**전체 구조**: 좌측 메인 + 우측 사이드바
- 메인: 좌측 24px ~ 사이드바 왼쪽
- 사이드바: width 185px, 우측 24px
- 간격: 16px
- 섹션 간격: 10px

---

## 4. 헤드라인

메인 영역 상단, margin-bottom 14px

- 메인 타이틀:
  "30대 직장인, 지금 당장 이것만 하세요."
  font-size 22px, font-weight 900, letter-spacing -0.5px, line-height 1.3
  "30대 직장인" 부분만 color #E8521A
  나머지 color #1A1A1A

- 부제:
  "1년 뉴스 흐름 + 오늘 데이터 기반 · 카드를 클릭하면 이유와 신청 방법을 확인할 수 있어요"
  font-size 11px, color #AAAAAA, margin-top 4px

---

## 5. 액션 카드 6개 — 3×2 그리드

grid-template-columns: 1fr 1fr 1fr
gap: 10px
각 카드 height: 148px

**카드 공통 스타일**
- border-radius: 12px
- overflow: hidden
- padding: 14px 15px
- display: flex, flex-direction: column, justify-content: space-between
- hover: translateY(-2px), box-shadow 0 8px 24px rgba(0,0,0,0.15)
- cursor: pointer

**카드 내부 구성 (위→아래)**

[상단]
- 우상단: 순위 숫자 (position absolute, top 12px, right 14px)
  font-size 24px, font-weight 900, color rgba(255,255,255,0.18)

- 위험도+분야 배지:
  background rgba(255,255,255,0.22), color #FFFFFF
  font-size 9px, font-weight 700, padding 3px 10px, border-radius 20px
  width fit-content, margin-bottom 8px

[중앙]
- 행동 문장: color #FFFFFF, font-size 13px, font-weight 800, line-height 1.45

[하단] display flex, align-items center, margin-top 10px
- 좌측 부가설명: font-size 9px, color rgba(255,255,255,0.65)
- 우측 꺾쇠 "›": font-size 18px, color rgba(255,255,255,0.5)

[배경 아이콘] position absolute, bottom -6px, right 8px
- font-size 64px (또는 Hugeicons SVG 64px)
- opacity 0.10~0.12
- color #FFFFFF

**카드 6개 상세**

카드 1 — background #C84040
- 순위: 1
- 배지: "긴급 · 고용"
- 행동 문장: "고용유지지원금\n내 업종 해당 여부\n지금 확인"
- 부가설명: "휴업수당 70% 지원"
- 아이콘: briefcase (Hugeicons)

카드 2 — background #D05520
- 순위: 2
- 배지: "주의 · 부동산"
- 행동 문장: "전세 계약 전\n등기부등본 + HUG\n반환보증 가입"
- 부가설명: "전세사기 예방"
- 아이콘: home (Hugeicons)

카드 3 — background #B87020
- 순위: 3
- 배지: "주의 · 물가"
- 행동 문장: "통신비 알뜰폰 전환\n월 2~3만원\n고정비 절약"
- 부가설명: "연 최대 36만원"
- 아이콘: smartphone (Hugeicons)

카드 4 — background #B83838
- 순위: 4
- 배지: "긴급 · 금융"
- 행동 문장: "카드 연체 방지\n리볼빙 잔액\n조기 상환 검토"
- 부가설명: "신용점수 하락 방지"
- 아이콘: credit-card (Hugeicons)

카드 5 — background #C04C18
- 순위: 5
- 배지: "주의 · 고용"
- 행동 문장: "고용보험\n가입기간 180일\n충족 여부 확인"
- 부가설명: "실업급여 수급 요건"
- 아이콘: document (Hugeicons)

카드 6 — background #A86818
- 순위: 6
- 배지: "관찰 · 금융"
- 행동 문장: "햇살론·새희망홀씨\n저금리 대환\n신청 검토"
- 부가설명: "서민금융 상품"
- 아이콘: bank (Hugeicons)

---

## 6. 팝업 모달 (카드 클릭 시 — 별도 컴포넌트)

**오버레이**: background rgba(0,0,0,0.4), 전체 화면 덮음

**모달 카드**
- width: 480px
- background: #FFFFFF
- border-radius: 16px
- overflow: hidden
- box-shadow: 0 20px 60px rgba(0,0,0,0.2)
- position: center of screen

**Hero 영역** (해당 카드 배경색 그대로)
- padding: 20px 24px
- 배지: background rgba(255,255,255,0.25), color #FFFFFF, font-size 10px, font-weight 700, padding 3px 10px, border-radius 10px, margin-bottom 10px
- 행동 제목: font-size 17px, font-weight 800, color #FFFFFF, line-height 1.4

**본문** padding: 16px 24px 20px, display flex flex-direction column gap 14px

섹션 1 — "왜 지금인가"
- 레이블: font-size 9px, color #BBBBBB, font-weight 600, letter-spacing 0.3px, text-transform uppercase, margin-bottom 5px
- 내용: font-size 12px, color #444444, line-height 1.7

섹션 2 — "근거 뉴스"
- 레이블: 동일 스타일
- 뉴스 칩: background #F9F8F5, border-radius 8px, padding 9px 12px, border 0.5px solid #F0EDE6
  · 뉴스 제목: font-size 11px, color #555555, line-height 1.5, flex:1
  · 날짜: font-size 10px, color #CCCCCC, flex-shrink 0

섹션 3 — "신청 가능한 정부지원"
- 레이블: 동일 스타일
- 정부지원 칩: background #F9F8F5, border-radius 8px, padding 10px 12px, border 0.5px solid #F0EDE6
  display flex align-items center
  · 정책명: font-size 12px, font-weight 600, flex:1
  · 부처명: font-size 10px, color #AAAAAA
  · "신청하기" 버튼: background #E8521A, color #FFFFFF, font-size 11px, font-weight 700, padding 6px 14px, border-radius 8px, flex-shrink 0

**하단 닫기**
- border-top: 0.5px solid #F0EDE6
- padding: 12px
- "닫기" 텍스트: font-size 11px, color #AAAAAA, text-align center, cursor pointer

---

## 7. 우측 사이드바 (width 185px) — 카드 없이 배경에 직접

**상단: 종합 위험도**
padding: 0 0 16px 0
border-bottom: 0.5px solid #E8E4DC
margin-bottom: 16px

- "종합 위험도" 레이블: font-size 10px, color #AAAAAA, margin-bottom 6px
- "43" 숫자: font-size 38px, font-weight 900, color #E8521A, line-height 1
- "관찰 단계" 배지: background #E8521A, color #FFFFFF, font-size 10px, font-weight 600, padding 3px 10px, border-radius 20px, margin-top 5px, display inline-block
- "전일 대비 +1 ▲": font-size 10px, color #AAAAAA, margin-top 6px
- "1년치 뉴스 + 오늘 기준": font-size 9px, color #E8521A, margin-top 8px, line-height 1.5

**하단: 분야별 위험도**
- "분야별 위험도" 레이블: font-size 10px, color #AAAAAA, margin-bottom 10px
- 바 차트 5개 (각 행 height 20px, margin-bottom 8px):
  구성: 분야명(width 32px, font-size 10px, color #888888) + 바 배경(flex:1, height 5px, background #EEEEEE, border-radius 3px) + 점수(width 20px, font-size 10px, font-weight 700, text-align right)
  · 물가 72: fill #E24B4A
  · 자영업 67: fill #E8521A
  · 부동산 58: fill #C47A1A
  · 고용 45: fill #AAAAAA
  · 금융 41: fill #5DAA30