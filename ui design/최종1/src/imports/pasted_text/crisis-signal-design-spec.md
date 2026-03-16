# 이르미 위기신호 화면 — 상세 디자인 명세

## 캔버스 설정
- 프레임 크기: 1440 × 1000px
- 배경색: #F5F5F5
- 폰트: Pretendard

---

## 1. 네비게이션 바
대시보드와 동일. "위기신호" 탭이 활성 상태.

---

## 2. 페이지 헤드

네비 아래 12px, margin-bottom 12px
display flex, align-items flex-end, justify-content space-between

**좌측**
- "감지된 민생 위기 신호를 확인하고 대응 방안을 알아보세요": font-size 11px, color #AAAAAA, margin-bottom 3px
- "위기 신호": font-size 22px, font-weight 900, letter-spacing -0.5px, color #1A1A1A

**우측** display flex, gap 8px, align-items center
건수 pill 배지 3개:
- "긴급 0": background #FEF0F0, color #E24B4A, font-size 11px, font-weight 700, padding 5px 14px, border-radius 20px
- "주의 3": background #FFF3EC, color #E8521A, font-size 11px, font-weight 700, padding 5px 14px, border-radius 20px
- "관찰 0": background #F5F5F5, color #888888, font-size 11px, font-weight 700, padding 5px 14px, border-radius 20px

---

## 3. 필터 바

height 42px, background #FFFFFF, border-radius 10px
box-shadow 0 2px 10px rgba(0,0,0,0.05)
padding 0 16px
display flex, align-items center, gap 4px
margin-bottom 10px

**분야 탭** (텍스트 탭 스타일)
각 탭: font-size 11px, padding 5px 12px, border-radius 8px, border none, background transparent, cursor pointer
- 활성("전체"): background #1A1A1A, color #FFFFFF, font-weight 700
- 비활성: color #BBBBBB
탭 목록: 전체 / 물가 / 고용 / 자영업 / 금융 / 부동산

**구분선**: width 0.5px, height 18px, background #EEEEEE, margin 0 8px

**지역 드롭다운**:
background #F5F5F5, border none, border-radius 8px
padding 5px 12px, font-size 11px, color #555555
옵션: "지역 전체"

**등급 드롭다운**: 동일 스타일, 옵션: "등급 전체"

**우측** margin-left auto
- "3건": font-size 11px, color #AAAAAA

---

## 4. 메인 레이아웃

display grid, grid-template-columns 1fr 280px, gap 12px

---

## 5. 좌측: 인터랙티브 지도 + 막대그래프

background #FFFFFF, border-radius 14px
box-shadow 0 2px 12px rgba(0,0,0,0.06)
padding 16px

**카드 상단**
display flex, align-items center, justify-content space-between, margin-bottom 14px
- 좌측:
  · "지역별 위험도": font-size 12px, font-weight 700, color #1A1A1A
  · 활성 필터 배지 (필터 선택 시 표시): background #E8521A, color #FFFFFF, font-size 10px, font-weight 700, padding 2px 10px, border-radius 10px, margin-left 8px
- 우측: "지역 클릭 시 상세 확인": font-size 10px, color #CCCCCC

**지도 영역** (height 400px, background #F5F3EE, border-radius 10px, overflow hidden)
한국 지도 전체 표시 (SVG):
- 각 지역 배경색 = 해당 지역 종합 위험도 색
  · 서울/경기: #EF9F27 (주의, 오렌지)
  · 강원: #5DAA30 (안전, 초록)
  · 충청: #5DAA30
  · 경상: #5DAA30
  · 전라: #5DAA30
  · 제주: #5DAA30
- 지역 경계: stroke #FFFFFF, stroke-width 2px
- 지역 클릭 시: 해당 지역 강조 (opacity 올리기)

각 지역 위에 막대그래프 오버레이:
- 막대 배치: 지역 중앙 위쪽에 수직 막대들 나란히
- 막대 너비: 10px, border-radius 3px top
- 막대 높이: 위험도 점수에 비례 (최대 60px = 100점)
- 막대 색상 = 위험도 색 시스템:
  · 긴급(80+): #E24B4A
  · 주의(60~79): #E8521A
  · 관찰(40~59): #C47A1A
  · 안전(~39): #5DAA30
- 막대 위: 점수 숫자 (font-size 8px, font-weight 700, 해당 색상)
- 각 막대 = 분야 1개 (물가/자영업/부동산/고용/금융 순서)

서울/경기 지역 막대 예시 (가장 위험):
물가 78pt(레드) / 자영업 67pt(오렌지) / 부동산 63pt(오렌지) / 고용 54pt(앰버) / 금융 41pt(초록)

**막대 범례** (지도 하단, display flex, gap 14px, margin-top 10px)
좌측: 막대 색 범례 (분야별)
- 각 항목: 색 사각형(8×8px, border-radius 2px) + 분야명(font-size 10px, color #888888)
- 물가: #E24B4A / 자영업: #E8521A / 부동산: #C47A1A / 고용: #888888 / 금융: #5DAA30

우측: 배경 범례 (지역 위험도 등급)
- 안전(초록) / 관찰(앰버) / 주의(오렌지) / 긴급(레드)
- "막대 높이 = 위험도 점수": font-size 9px, color #BBBBBB, margin-left auto

---

## 6. 우측: 선택 지역 요약 + 신호 카드

display flex, flex-direction column, gap 10px

**선택 지역 요약 카드**
background #1A1A1A, border-radius 12px, padding 14px 16px

- "현재 선택 지역": font-size 10px, color #666666, font-weight 600, letter-spacing 0.3px, margin-bottom 6px
- "전국 평균" (또는 선택된 지역명): font-size 16px, font-weight 800, color #FFFFFF, margin-bottom 12px

분야별 바 차트 5개 (각 행 height 18px, margin-bottom 6px):
구성: 분야명(width 32px, font-size 10px, color #888888) + 바 배경(flex:1, height 4px, background #333333, border-radius 2px) + 점수(width 22px, font-size 10px, font-weight 700, text-align right)
- 물가 72: fill #E24B4A
- 자영업 67: fill #E8521A
- 부동산 58: fill #C47A1A
- 고용 45: fill #888888
- 금융 41: fill #5DAA30

**위기신호 카드 목록** (flex:1, display flex, flex-direction column, gap 8px)

카드 공통:
- background #FFFFFF, border-radius 10px
- box-shadow 0 2px 10px rgba(0,0,0,0.06)
- padding 13px 15px, cursor pointer
- hover: box-shadow 0 4px 16px rgba(0,0,0,0.10), translateY(-1px)

각 카드 내부:

**상단 행** (display flex, align-items center, gap 6px, margin-bottom 8px):
- 위험도 배지: font-size 9px, font-weight 800, padding 3px 8px, border-radius 6px
- 카테고리 파스텔 배지: 기존 스타일
- 지역 배지: background #F5F5F5, color #888888, font-size 9px, padding 2px 7px, border-radius 5px
- 날짜: margin-left auto, font-size 10px, color #CCCCCC

**제목**: font-size 12px, font-weight 700, color #1A1A1A, line-height 1.5, margin-bottom 8px

**하단 행** (display flex, align-items center):
- "관련 기사 N건": font-size 10px, color #CCCCCC
- "상세 분석 →": margin-left auto, font-size 10px, color #E8521A, font-weight 700

**카드 3개 데이터**

카드 1:
- 위험도: "주의" (#FFF3EC bg, #E8521A text)
- 카테고리: "🏠 부동산" (초록 파스텔)
- 지역: "서울"
- 날짜: 3월 13일
- 제목: "서울 아파트 계약 해제율 7.45%, 5년새 최고치 기록"
- 관련 기사: 3건

카드 2:
- 위험도: "주의" (#FFF3EC bg, #E8521A text)
- 카테고리: "🏠 부동산" (초록 파스텔)
- 지역: "수서"
- 날짜: 3월 13일
- 제목: "수서 올림픽훼밀리타운 재건축 기대감으로 부동산 가격 급등"
- 관련 기사: 2건

카드 3:
- 위험도: "주의" (#FFF3EC bg, #E8521A text)
- 카테고리: "💼 고용" (회색 파스텔)
- 지역: 없음
- 날짜: 3월 13일
- 제목: "전국 고용법률 혼란 우려, 법적 분쟁 가능성 높아"
- 관련 기사: 3건