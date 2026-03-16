# 이르미 대시보드 화면 — 상세 디자인 명세

## 캔버스 설정
- 프레임 크기: 1440 × 1000px
- 배경색: #F5F5F5
- 폰트: Pretendard

---

## 1. 네비게이션 바

**크기**: width 1440px, height 48px, position 최상단 고정
**배경**: #FFFFFF
**그림자**: box-shadow 0 2px 12px rgba(0,0,0,0.06)
**내부 좌우 패딩**: 24px

**좌측 (왼쪽에서 24px)**
- 로고: 22×22px 원형, 배경 #E8521A, 중앙에 흰 원(8×8px)
- "이르미" 텍스트: font-size 13px, font-weight 800, color #1A1A1A, 로고 오른쪽 8px
- "민생위기 조기경보 레이더": font-size 10px, color #AAAAAA, "이르미" 아래

**중앙 탭 (로고에서 24px 오른쪽)**
탭 5개, 높이 48px에 수직 중앙 정렬, 탭 간격 0 (각 탭 좌우 패딩 12px)
- "대시보드" — 활성 탭: color #1A1A1A, font-weight 700, 하단 border 2px solid #1A1A1A
- "맞춤분석 ★" — color #E8521A, font-weight 700
- "위기신호" — color #BBBBBB
- "뉴스분석" — color #BBBBBB
- "기자의 시선" — color #BBBBBB
모든 탭: font-size 11px

**우측 (오른쪽에서 24px)**
- "2026.03.13 기준": font-size 10px, color #BBBBBB
- "↺ 리포트 다운로드" 버튼: font-size 10px, color #378ADD, background #F0F6FF, border 0.5px solid #C0D8F0, border-radius 6px, padding 4px 10px

---

## 2. 페이지 전체 레이아웃

네비 아래 12px 여백부터 시작
**전체 구조**: 좌측 메인 + 우측 사이드바
- 메인 영역: 좌측에서 24px ~ 사이드바 왼쪽까지
- 사이드바: width 185px, 우측에서 24px
- 메인과 사이드바 간격: 16px
- 각 섹션 간격: 12px

---

## 3. Hero 영역

메인 영역 상단, height 155px, 2열 구조

**좌측 점수 카드** (width 160px, height 155px)
- 배경: #E8521A
- border-radius: 12px
- padding: 20px
- 내용 (위에서 아래):
  · "종합 민생위기 지수": font-size 10px, color rgba(255,255,255,0.7), margin-bottom 8px
  · "65": font-size 52px, font-weight 900, color #FFFFFF, line-height 1, letter-spacing -2px
  · "주의 단계" 배지: background rgba(255,255,255,0.2), color #FFFFFF, font-size 11px, font-weight 600, padding 4px 12px, border-radius 20px, margin-top 8px
  · "전일 대비 +2 ▲": font-size 11px, color rgba(255,255,255,0.65), margin-top 6px

**우측 AI 브리핑 카드** (나머지 너비, height 155px)
- 배경: #FFFFFF
- border-radius: 12px
- box-shadow: 0 2px 10px rgba(0,0,0,0.06)
- padding: 18px 20px
- 내부 2열: 좌측 텍스트 영역 + 우측 일러스트(width 100px)

좌측 텍스트:
  · "Claude AI · 10:07 실시간 분석" 태그:
    background #FFF3EC, color #E8521A, font-size 10px, font-weight 600,
    border 0.5px solid #F0C8A0, border-radius 6px, padding 3px 10px,
    좌측에 지름 6px 오렌지 원 아이콘, margin-bottom 10px
  · 브리핑 문장: "\"금융은 안정세지만, 물가·자영업 부담이 커지고 있어요.\""
    font-size 14px, font-weight 700, color #1A1A1A, line-height 1.5, margin-bottom 8px
  · 본문: "물가 72점 최고 위험. 자영업 67점 상승 지속. 부동산 58점 3주 연속 상승."
    font-size 11px, color #999999, line-height 1.7
  · "2026.03.13 10:07 · 매일경제 뉴스 기반"
    font-size 10px, color #CCCCCC, position 카드 하단

우측 일러스트 (width 100px):
  Hugeicons 스타일 플랫 캐릭터 — 뉴스를 읽는 사람 + 오른쪽에 신호등 아이콘
  전체적으로 오렌지 포인트 컬러 사용

---

## 4. 차트 영역 3열

height 약 160px, 3열 균등 분할 (각 열 gap 12px)

**열 1 — 종합 지수 추이 꺾은선 차트**
카드: 배경 #FFFFFF, border-radius 12px, box-shadow 0 2px 10px rgba(0,0,0,0.06), padding 14px 16px
- 상단 레이블: "종합 지수 추이" font-size 10px font-weight 700 + "흐름" 배지 background #FFF0E8 color #E8521A font-size 9px padding 2px 8px border-radius 6px
- 차트 영역 height 110px:
  · Y축: 0, 50(안전선), 80(주의선) 3개 기준선
  · 안전선(50): 초록 점선, 라벨 "안전"
  · 주의선(80): 앰버 점선, 라벨 "주의"
  · 꺾은선: 오렌지(#E8521A), stroke-width 2px, stroke-linecap round
  · 선 아래 area fill: 오렌지 → 투명 그라디언트, opacity 15%
  · 현재 포인트(오늘): 흰 원 + 오렌지 테두리 4px
  · hover 툴팁: 다크(#1A1A1A) 배경, 흰 텍스트, border-radius 6px
  · X축: "10월", "11월", "오늘"(오렌지)

**열 2 — 분야별 위험도 가로 바 차트**
카드: 동일 스타일, padding 14px 16px
- 상단 레이블: "분야별 위험도" + "현황" 배지
- 바 차트 5개 (위에서 아래): 물가, 자영업, 부동산, 고용, 금융
  각 행: height 22px, 구성 — 분야명(width 32px, font-size 11px) + 바 배경(height 8px, background #F0EDE6, border-radius 4px) + 점수(width 22px, font-size 11px, font-weight 700) + 증감(width 28px, font-size 10px, font-weight 600)
  · 물가 72점: 바 fill #E24B4A (72%), 증감 "+5▲" color #E24B4A
  · 자영업 67점: 바 fill #E8521A (67%), 증감 "+6▲" color #E8521A
  · 부동산 58점: 바 fill #C47A1A (58%), 증감 "+4▲" color #C47A1A
  · 고용 45점: 바 fill #AAAAAA (45%), 증감 "-3▼" color #5DAA30
  · 금융 41점: 바 fill #5DAA30 (41%), 증감 "-4▼" color #5DAA30
- 하단 범례 (flex row, gap 8px, font-size 9px):
  🔴 긴급 80+ / 🟠 주의 60+ / 🟡 관찰 40+ / 🟢 안전

**열 3 — 분야별 기사건수 히트맵**
카드: 동일 스타일, padding 14px 16px
- 상단 레이블: "분야별 기사건수 7일" + "조기경보" 배지 background #F5EFE8 color #8B5E3C
- 색상 범례 (상단 우측): "적음 □□□□ 많음 — 기사량" font-size 9px
  색상 스케일: #F0E8DC → #D4B896 → #A67C52 → #4A2810
- 히트맵 그리드 (5행×7열):
  행: 물가 / 자영업 / 부동산 / 고용 / 금융 (왼쪽 레이블 font-size 10px color #888888)
  열: 3/7 ~ 3/13(오늘) (상단 날짜 레이블, 오늘은 #8B5E3C font-weight 700)
  각 셀: border-radius 3px, 셀 크기 약 22×14px, gap 2px
  물가 행: 오늘로 갈수록 진해짐 (최고 위험, 오늘 #4A2810)
  오늘 열 숫자: 각 행 오른쪽 끝에 흰색 숫자 표시 (물가:34, 자영업:25, 부동산:31, 고용:21, 금융:17)

---

## 5. 위기신호 섹션

카드: 배경 #FFFFFF, border-radius 12px, box-shadow 0 2px 10px rgba(0,0,0,0.06), padding 14px 16px
- 상단 레이블: "위기 신호 — 뉴스 근거" font-size 10px font-weight 700 + "왜 위험한가" 배지 background #FEF0F0 color #CC0000

**리스트 6개 항목** (각 항목 height 36px, border-bottom 0.5px solid #F8F8F8)
각 행 구성 (좌→우, 수직 중앙 정렬):
  · 위험도 배지: font-size 9px font-weight 700 padding 3px 8px border-radius 5px width 38px
  · 분야명: font-size 10px color #AAAAAA width 32px
  · 뉴스 제목: font-size 11px color #333333 flex:1 (말줄임 처리)
  · 날짜: font-size 10px color #CCCCCC

항목 데이터:
  1. 긴급(#E24B4A 배경, 흰글) / 자영업 / 배달앱 수수료 인상 관련 소상공인 부담 급증 / 03-13
  2. 긴급(#E24B4A) / 물가 / 연평균 환율 IMF보다 높다 1500원 육박 전망 / 03-13
  3. 주의(#E8521A) / 부동산 / 수도권 전세가격 3주 연속 상승 전환 / 03-13
  4. 주의(#E8521A) / 물가 / 소비자물가 상승률 4개월 연속 확대 / 03-12
  5. 주의(#E8521A) / 부동산 / 서울 아파트 계약 해제율 7.45% 역대 최고치 / 03-12
  6. 관찰(#C47A1A) / 고용 / 법적 불확실성으로 고용시장 불안 가능성 증가 / 03-11

하단: "전체 위기 신호 보기 → 위기신호 탭" font-size 10px color #E8521A text-align right margin-top 8px

---

## 6. 우측 사이드바 (width 185px)

**상단: 맞춤분석 입력 카드**
- 배경: #FFF8F3
- border: 1.5px solid #F0C8A0
- border-radius: 12px
- padding: 14px 14px
- "내 상황 맞춤 분석": font-size 11px font-weight 700 color #C44010 margin-bottom 10px
- 직업 드롭다운:
  width 100%, height 30px, background #FFFFFF, border 0.5px solid #E0D0C0, border-radius 6px
  font-size 11px color #333333, padding 0 10px
  옵션: "직장인" (선택됨)
- 연령 드롭다운: 동일 스타일, margin-top 6px, 옵션 "30대" (선택됨)
- "분석하기 →" 버튼:
  width 100%, height 32px, background #E8521A, color #FFFFFF
  font-size 11px font-weight 700, border-radius 8px, margin-top 10px

**하단: 이머징 이슈 TOP10**
- 배경: #FFFFFF, border-radius 12px, box-shadow 0 2px 10px rgba(0,0,0,0.06), padding 12px 14px
- 상단: "이머징 이슈" font-size 9px font-weight 600 color #BBBBBB letter-spacing 0.3px text-transform uppercase
- 부제: "7일간 없다가 오늘 새로 등장" font-size 10px color #AAAAAA margin-bottom 8px
- 리스트 10개 (각 항목 height 28px, border-bottom 0.5px solid #F8F8F5):
  구성: 순위(width 16px, font-size 11px font-weight 700) + 이슈명(flex:1, font-size 11px) + 건수(font-size 10px color #AAAAAA)
  1~3위: 순위 color #E8521A
  4~10위: 순위 color #DDDDDD
  데이터: 1.긴축재정 12건 / 2.디지털화폐 9건 / 3.공급망재편 8건 / 4.탄소국경세 7건 / 5.리쇼어링 6건 / 6.그린인플레 5건 / 7.무역적자 5건 / 8.AI실업 4건 / 9.스태그플레이션 4건 / 10.가계부실 3건