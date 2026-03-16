import React, { useState, useMemo } from "react";
import { ChevronDown, MousePointerClick, Building, Briefcase, Coins, Landmark, Store } from "lucide-react";
// @ts-ignore
import mapSvg from "../../imports/korea-map.svg?raw";
import logoImage from "figma:asset/e1ee2c70c87487ad23c9033fe13a21c1a3a52ca6.png";

import { CrisisSignalCard } from "../components/CrisisSignalCard";

const categories = ["전체", "물가", "고용", "자영업", "금융", "부동산"];

const signals = [
  {
    id: 1,
    risk: "주의",
    riskColor: "#FF6600",
    riskBg: "#FFF3EC",
    category: "🏠 부동산",
    catColor: "#14532D",
    catBg: "#F0FDF4",
    region: "서울",
    date: "3월 13일",
    title: "서울 아파트 계약 해제율 7.45%, 5년새 최고치 기록",
    summary: "금리 인상과 대출 규제 여파로 서울 지역의 아파트 매매 계약 해제 사례가 급증하고 있습니다.",
    articles: 3
  },
  {
    id: 2,
    risk: "주의",
    riskColor: "#FF6600",
    riskBg: "#FFF3EC",
    category: "🏠 부동산",
    catColor: "#14532D",
    catBg: "#F0FDF4",
    region: "경기",
    date: "3월 13일",
    title: "경기 전세보증 반환 거절 사례 급증, 갱신 거절도 늘어",
    summary: "전세 사기 우려와 깡통전세 위험이 맞물려 경기도 전역에서 보증금 반환 관련 분쟁이 확산 중입니다.",
    articles: 2
  },
  {
    id: 3,
    risk: "주의",
    riskColor: "#FF6600",
    riskBg: "#FFF3EC",
    category: "💼 고용",
    catColor: "#1F2937",
    catBg: "#F3F4F6",
    region: null,
    date: "3월 13일",
    title: "전국 고용법률 혼란 우려, 법적 분쟁 가능성 높아",
    summary: "노동법 개정안 시행을 앞두고 사업장 내 노사 갈등 및 부당해고 관련 법적 분쟁 조짐이 보입니다.",
    articles: 3
  },
  {
    id: 4,
    risk: "긴급",
    riskColor: "#E24B4A",
    riskBg: "#FEF0F0",
    category: "💰 물가",
    catColor: "#92400E",
    catBg: "#FEF3C7",
    region: "서울",
    date: "3월 13일",
    title: "외식물가 6개월 연속 상승, 서민 경제 타격",
    summary: "식자재 가격 폭등으로 서울권 주요 외식 품목 가격이 가파르게 상승하여 소비 심리가 위축되고 있습니다.",
    articles: 5
  },
  {
    id: 5,
    risk: "관찰",
    riskColor: "#FFAA00",
    riskBg: "#FFF8E0",
    category: "📊 금융",
    catColor: "#1E3A8A",
    catBg: "#DBEAFE",
    region: "대구",
    date: "3월 12일",
    title: "지역 중소기업 대출 연체율 소폭 상승세",
    summary: "경기 침체 장기화로 인해 대구 지역 중소기업 및 소상공인의 대출 연체율이 3개월 연속 상승하고 있습니다.",
    articles: 1
  },
  {
    id: 6,
    risk: "주의",
    riskColor: "#FF6600",
    riskBg: "#FFF3EC",
    category: "🏪 자영업",
    catColor: "#9D174D",
    catBg: "#FCE7F3",
    region: "부산",
    date: "3월 11일",
    title: "부산 주요 상권 폐업률 증가, 공실률 15% 돌파",
    summary: "원자재 가격 상승과 소비 침체 여파로 부산 핵심 상권의 폐업이 속출하며 빈 상가가 늘고 있습니다.",
    articles: 4
  }
];

const regions = [
  { id: 'seoul',     name: '서울',  x: 34, y: 25, color: '#E24B4A', bars: [82, 74, 78, 58, 51] },
  { id: 'incheon',   name: '인천',  x: 20, y: 29, color: '#FF6600', bars: [70, 62, 65, 48, 42] },
  { id: 'gyeonggi',  name: '경기',  x: 29, y: 33, color: '#EF9F27', bars: [75, 68, 71, 52, 46] },
  { id: 'gangwon',   name: '강원',  x: 63, y: 21, color: '#5DAA30', bars: [38, 32, 28, 24, 19] },
  { id: 'chungbuk',  name: '충북',  x: 49, y: 38, color: '#5DAA30', bars: [45, 38, 33, 27, 22] },
  { id: 'chungnam',  name: '충남',  x: 24, y: 42, color: '#5DAA30', bars: [42, 35, 30, 25, 20] },
  { id: 'daejeon',   name: '대전',  x: 39, y: 44, color: '#FFAA00', bars: [55, 48, 44, 36, 30] },
  { id: 'jeonbuk',   name: '전북',  x: 31, y: 54, color: '#5DAA30', bars: [40, 33, 28, 23, 18] },
  { id: 'jeonnam',   name: '전남',  x: 28, y: 70, color: '#5DAA30', bars: [37, 31, 26, 21, 17] },
  { id: 'gyeongbuk', name: '경북',  x: 62, y: 42, color: '#5DAA30', bars: [48, 42, 36, 30, 25] },
  { id: 'daegu',     name: '대구',  x: 58, y: 53, color: '#FFAA00', bars: [62, 55, 48, 40, 34] },
  { id: 'ulsan',     name: '울산',  x: 70, y: 58, color: '#5DAA30', bars: [44, 38, 32, 27, 22] },
  { id: 'busan',     name: '부산',  x: 64, y: 64, color: '#FF6600', bars: [68, 61, 54, 45, 38] },
  { id: 'gyeongnam', name: '경남',  x: 53, y: 65, color: '#5DAA30', bars: [46, 39, 34, 28, 23] },
  { id: 'gwangju',   name: '광주',  x: 31, y: 66, color: '#5DAA30', bars: [41, 35, 29, 24, 19] },
  { id: 'jeju',      name: '제주',  x: 33, y: 92, color: '#5DAA30', bars: [36, 30, 24, 19, 15] },
];

const getBarColor = (score: number) => {
  if (score >= 80) return '#E24B4A';
  if (score >= 60) return '#FF6600';
  if (score >= 40) return '#FFAA00';
  return '#5DAA30';
};

const barLabels = ['물', '자', '부', '고', '금'];

const scoreLabels = [
  { label: '물가',   color: '#E24B4A' },
  { label: '자영업', color: '#FF6600' },
  { label: '부동산', color: '#FFAA00' },
  { label: '고용',   color: '#5DAA30' },
  { label: '금융',   color: '#84CC16' },
];

const categoryBarIndex: Record<string, number> = {
  '물가': 0, '자영업': 1, '부동산': 2, '고용': 3, '금융': 4,
};

const defaultScores = [72, 67, 58, 45, 41];

const NATIONAL_COMPOSITE_SCORE = 53;

export function CrisisSignal() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState("전체");
  const [filterRisk, setFilterRisk] = useState("전체");
  const [visibleCount, setVisibleCount] = useState(4);

  const currentRegion = selectedRegion ? regions.find(r => r.id === selectedRegion) : null;
  const currentScores = currentRegion?.bars ?? defaultScores;

  const regionOptions = [
    "전체",
    ...Array.from(new Set([
      ...regions.map(r => r.name),
      ...signals.map(s => s.region).filter(Boolean) as string[],
    ])),
  ];
  const riskOptions = ["전체", "긴급", "주의", "관찰", "안전"];

  const filteredSignals = signals.filter(signal => {
    const matchCategory = activeCategory === "전체" || signal.category.includes(activeCategory);
    const matchRegion   = filterRegion === "전체"   || signal.region === filterRegion;
    const matchRisk     = filterRisk === "전체"     || signal.risk === filterRisk;
    return matchCategory && matchRegion && matchRisk;
  });

  const displayedSignals = filteredSignals.slice(0, visibleCount);

  const hasActiveFilter = filterRegion !== "전체" || filterRisk !== "전체";

  // 위기 신호 요약 카운트
  const emergencyCount = signals.filter(s => s.risk === "긴급").length;
  const cautionCount   = signals.filter(s => s.risk === "주의").length;
  const watchCount     = signals.filter(s => s.risk === "관찰").length;

  // 동적 헤드라인 계산: 최신 날짜 → 최고 위험 등급 → 지역·카테고리 추출
  const riskOrder = ["긴급", "주의", "관찰", "안전"];
  const riskColorMap: Record<string, string> = { "긴급": "#E24B4A", "주의": "#FF6600", "관찰": "#FFAA00" };
  const parseKorDate = (d: string) => { const [m, day] = d.replace("일", "").split("월 ").map(Number); return m * 100 + day; };
  const latestDate = signals.reduce((max, s) => parseKorDate(s.date) > parseKorDate(max) ? s.date : max, signals[0].date);
  const latestSignals = signals.filter(s => s.date === latestDate);
  const topRisk = riskOrder.find(r => latestSignals.some(s => s.risk === r)) ?? "관찰";
  const topSignals = latestSignals.filter(s => s.risk === topRisk);
  const headlineRegions = [...new Set(topSignals.map(s => s.region).filter(Boolean))].join("·");
  const headlineCategories = [...new Set(topSignals.map(s => s.category.replace(/^\S+\s*/, "")))].join("·");
  const headlineLabel = [headlineRegions, headlineCategories].filter(Boolean).join(" ");
  const headlineColor = riskColorMap[topRisk] ?? "#E8521A";

  const coloredMapSvg = useMemo(() => {
    const styleRules = regions.map(region => {
      const avg = Math.round(region.bars.reduce((a, b) => a + b, 0) / region.bars.length);
      const color = getBarColor(avg);
      const isDimmed = selectedRegion !== null && selectedRegion !== region.id;
      const alpha = isDimmed ? '20' : '50';
      return `[id="${region.name}"] { fill: ${color}${alpha}; }`;
    }).join(' ');
    const style = `<style>${styleRules}</style>`;
    return mapSvg.replace('</svg>', `${style}</svg>`);
  }, [selectedRegion]);

  return (
    <>
    <div className="px-[0px] pt-[0px] pb-[10px]">
      {/* Top Header (텍스트형) */}
      <div className="mt-[16px] mb-[20px] flex flex-col">
        <div className="flex items-center">
          <h1 className="text-[22px] font-[900] tracking-[-0.5px] text-[#1A1A1A]">
            <span style={{ color: headlineColor }}>{headlineLabel}</span>, 지금 가장 위험해요.
          </h1>
          <div className="ml-auto flex items-center gap-[10px]">
            <span className="text-[13px] font-[700] text-[#555555] mr-[6px]">위기 신호 요약</span>
            <div className="flex items-center gap-[6px] bg-[#FEF0F0] text-[#E24B4A] px-[14px] py-[8px] rounded-[10px] border border-[#FEE2E2] shadow-sm">
              <span className="w-[8px] h-[8px] rounded-full bg-[#E24B4A] animate-pulse"></span>
              <span className="text-[14px] font-[800]">긴급 {emergencyCount}</span>
            </div>
            <div className="flex items-center gap-[6px] bg-[#FFF3EC] text-[#FF6600] px-[14px] py-[8px] rounded-[10px] border border-[#FFEDD5] shadow-sm">
              <span className="w-[8px] h-[8px] rounded-full bg-[#FF6600]"></span>
              <span className="text-[14px] font-[800]">주의 {cautionCount}</span>
            </div>
            <div className="flex items-center gap-[6px] bg-[#FFF8E0] text-[#FFAA00] px-[14px] py-[8px] rounded-[10px] border border-[#FFE88A] shadow-sm">
              <span className="w-[8px] h-[8px] rounded-full bg-[#FFAA00]"></span>
              <span className="text-[14px] font-[800]">관찰 {watchCount}</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[#AAAAAA] mt-[4px]">
          감지된 위기 신호와 지역별 위험도를 확인하세요
        </p>
      </div>

      {/* Filter Bar */}
      <div className="h-[52px] bg-white rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-[20px] flex items-center gap-[6px] mb-[20px] relative overflow-hidden">
        {categories.map(category => {
          let Icon = null;
          if (category === '부동산') Icon = Building;
          if (category === '고용') Icon = Briefcase;
          if (category === '물가') Icon = Coins;
          if (category === '금융') Icon = Landmark;
          if (category === '자영업') Icon = Store;
          
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-[13px] px-[14px] py-[6px] rounded-[8px] border-none cursor-pointer transition-colors flex items-center gap-[6px] ${
                activeCategory === category
                  ? 'bg-[#FF6600] text-white font-[700]'
                  : 'bg-transparent text-[#666666] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]'
              }`}
            >
              {Icon && <Icon size={14} strokeWidth={2} />}
              <span>{category}</span>
            </button>
          );
        })}

        <div className="w-[1px] h-[20px] bg-[#EEEEEE] mx-[10px]" />

        <div className="relative">
          <select
            value={filterRegion}
            onChange={e => setFilterRegion(e.target.value)}
            className={`appearance-none border rounded-[8px] text-[13px] py-[6px] pl-[14px] pr-[32px] outline-none cursor-pointer transition-colors ${
              filterRegion !== "전체"
                ? "bg-[#FF6600] text-white font-[700] border-[#FF6600]"
                : "bg-[#F5F5F5] text-[#555555] border-transparent"
            }`}
          >
            {regionOptions.map(r => (
              <option key={r} value={r}>{r === "전체" ? "지역 전체" : r}</option>
            ))}
          </select>
          <ChevronDown className={`absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${filterRegion !== "전체" ? "text-white" : "text-[#555]"}`} />
        </div>

        <div className="relative ml-1">
          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className={`appearance-none border rounded-[8px] text-[13px] py-[6px] pl-[14px] pr-[32px] outline-none cursor-pointer transition-colors ${
              filterRisk !== "전체"
                ? "bg-[#FF6600] text-white font-[700] border-[#FF6600]"
                : "bg-[#F5F5F5] text-[#555555] border-transparent"
            }`}
          >
            {riskOptions.map(r => (
              <option key={r} value={r}>{r === "전체" ? "등급 전체" : r}</option>
            ))}
          </select>
          <ChevronDown className={`absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${filterRisk !== "전체" ? "text-white" : "text-[#555]"}`} />
        </div>

        {hasActiveFilter && (
          <button
            onClick={() => { setFilterRegion("전체"); setFilterRisk("전체"); }}
            className="ml-2 text-[12px] text-[#AAAAAA] hover:text-[#FF6600] transition-colors px-[8px] py-[6px] rounded-[6px] hover:bg-[#FFF3EC]"
          >
            ✕ 초기화
          </button>
        )}

        <div className="ml-auto pointer-events-none select-none w-[36px] h-[36px] shrink-0">
          <img
            src={logoImage}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-[660px_1fr] gap-[20px]">

        {/* Left: Map */}
        <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col h-full">
          <div className="flex items-center justify-between mb-[16px]">
            <div className="flex items-center gap-[8px]">
              <div className="w-[6px] h-[6px] bg-[#FF6600] rounded-full" />
              <h2 className="text-[16px] font-[700] text-[#1A1A1A]">지역별 위험도</h2>
            </div>
            <div className="text-[12px] text-[#AAAAAA]">지역 클릭 시 세부 확인</div>
          </div>

          <div className="bg-[#FAFAFA] rounded-[14px] overflow-hidden flex-shrink-0 cursor-pointer border border-[#EEEEEE] h-[560px] flex items-center justify-center">
            <div className="relative h-full" style={{ aspectRatio: '4 / 5' }}>
              <div
                className="absolute inset-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                dangerouslySetInnerHTML={{ __html: coloredMapSvg }}
              />

              {regions.map((region) => (
                <div
                  key={`marker-${region.id}`}
                  onClick={() => setSelectedRegion(region.id === selectedRegion ? null : region.id)}
                  className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-10"
                  style={{
                    left: `${region.x}%`,
                    top: `${region.y}%`,
                    opacity: selectedRegion === null || selectedRegion === region.id ? 1 : 0.25
                  }}
                >
                  <div
                    className="absolute w-[36px] h-[36px] rounded-full opacity-20 blur-[5px]"
                    style={{ backgroundColor: region.color }}
                  />
                  <div className="bg-white/95 backdrop-blur-[2px] border border-white/60 shadow-[0_3px_8px_rgba(0,0,0,0.12)] px-[8px] py-[3px] rounded-[5px] text-[11px] font-[700] text-[#333333] whitespace-nowrap z-10">
                    {region.name}
                  </div>
                </div>
              ))}

              {regions.map((region) => {
                const barIdx = categoryBarIndex[activeCategory];
                const barsToShow = activeCategory === '전체'
                  ? region.bars.map((score, i) => ({ score, label: barLabels[i] }))
                  : [{ score: region.bars[barIdx], label: barLabels[barIdx] }];
                return (
                  <div
                    key={`bars-${region.id}`}
                    className="absolute flex items-end gap-[2px] -translate-x-1/2 transition-opacity duration-300 z-20 pointer-events-none"
                    style={{
                      left: `${region.x}%`,
                      bottom: `calc(${100 - region.y}% + 20px)`,
                      opacity: selectedRegion === null || selectedRegion === region.id ? 1 : 0.1
                    }}
                  >
                    {barsToShow.map(({ score, label }, i) => {
                      const height = (score / 100) * 40; // 스케일 재조정: 48 -> 40px
                      const barColor = getBarColor(score);
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-[9px] font-[900] mb-[2px]" style={{ color: barColor }}>{label}</span>
                          <div
                            className="w-[6px] rounded-t-[2px]"
                            style={{ height: `${height}px`, backgroundColor: barColor, opacity: 0.9 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex flex-col gap-[8px] mt-[16px]">
            <div className="flex items-center gap-[8px]">
              <span className="text-[11px] text-[#AAAAAA] font-[600] shrink-0">막대 순서</span>
              <span className="text-[11px] text-[#BBBBBB]">물 · 자 · 부 · 고 · 금&nbsp;&nbsp;(고정)</span>
            </div>
            <div className="flex items-center gap-[14px]">
              <div className="flex items-center gap-[6px]">
                <span className="text-[11px] text-[#AAAAAA] font-[600]">막대 색</span>
                {[
                  { name: '안전', color: '#5DAA30' },
                  { name: '관찰', color: '#FFAA00' },
                  { name: '주의', color: '#FF6600' },
                  { name: '긴급', color: '#E24B4A' },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-[3px]">
                    <div className="w-[8px] h-[8px] rounded-[2px]" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-[#999999]">{item.name}</span>
                  </div>
                ))}
              </div>
              <div className="w-[1px] h-[12px] bg-[#EEEEEE]" />
              <div className="flex items-center gap-[6px]">
                <span className="text-[11px] text-[#AAAAAA] font-[600]">지역 배경</span>
                <span className="text-[11px] text-[#BBBBBB]">= 종합 위험도</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-[20px] h-full">

          {/* 상단 2열: 요약 카드 | TOP 5 */}
          <div className="grid grid-cols-2 gap-[16px] shrink-0">

            {/* 선택 지역 요약 */}
            {(() => {
              const avgScore = selectedRegion
                ? Math.round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length)
                : NATIONAL_COMPOSITE_SCORE;
              const gradient =
                avgScore >= 80 ? 'linear-gradient(135deg, #F05858 0%, #E24B4A 100%)' :
                avgScore >= 60 ? 'linear-gradient(135deg, #FF7722 0%, #FF6600 100%)' :
                avgScore >= 40 ? 'linear-gradient(135deg, #FFB300 0%, #E89A00 100%)' :
                                 'linear-gradient(135deg, #5FA82A 0%, #4A9020 100%)';
              return (
                <div className="rounded-[14px] p-[16px_18px] relative overflow-hidden" style={{ background: gradient }}>
                  {/* 배경 로고 워터마크 (Hero 카드와 동일 방식) */}
                  <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
                    <div className="absolute right-0 bottom-0 w-[130px] h-[130px] opacity-[0.12] pointer-events-none translate-x-[20%] translate-y-[20%]">
                      <img src={logoImage} alt="logo watermark" className="w-full h-full object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                    </div>
                  </div>

                  {/* 라벨 */}
                  <div className="text-[12px] font-[600] mb-[6px] relative z-10" style={{ color: 'rgba(255,255,255,0.75)' }}>현재 선택 지역</div>

                  {/* 지역명 + 종합점수 */}
                  <div className="flex items-start justify-between mb-[20px] relative z-10">
                    <div className="text-[22px] font-[800] text-white">
                      {selectedRegion ? regions.find(r => r.id === selectedRegion)?.name : '전국 평균'}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[34px] font-[900] text-white leading-none">{avgScore}</span>
                      
                    </div>
                  </div>

                  {/* 바 차트 */}
                  <div className="flex flex-col gap-[10px] relative z-10">
                    {scoreLabels.map((item, idx) => {
                      const score = currentScores[idx];
                      return (
                        <div key={idx} className="flex items-center h-[20px]">
                          <div className="w-[44px] text-[13px] font-[600]" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.label}</div>
                          <div className="flex-1 h-[4px] rounded-[2px] mx-[10px] relative" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                            <div
                              className="absolute left-0 top-0 h-full rounded-[2px] transition-all duration-500"
                              style={{ width: `${score}%`, backgroundColor: 'rgba(255,255,255,0.85)' }}
                            />
                          </div>
                          <div className="w-[28px] text-[14px] font-[800] text-right text-white">
                            {score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 위험 지역 TOP 5 */}
            <div className="bg-white rounded-[16px] p-[20px_22px]" style={{ border: '1px solid #F0F0F0' }}>
              <div className="flex items-center justify-between mb-[16px]">
                <div className="flex items-center gap-[8px]">
                  <div className="w-[6px] h-[6px] bg-[#FF6600] rounded-full" />
                  <span className="text-[15px] font-[700] text-[#1A1A1A]">위험 지역 TOP 5</span>
                </div>
                <span className="text-[11px] text-[#CCCCCC]">종합 위험도</span>
              </div>
              <div className="flex flex-col gap-[12px]">
                {[...regions]
                  .map(r => ({ ...r, avg: Math.round(r.bars.reduce((a, b) => a + b, 0) / r.bars.length) }))
                  .sort((a, b) => b.avg - a.avg)
                  .slice(0, 5)
                  .map((region, idx) => {
                    const color = getBarColor(region.avg);
                    const riskLabel = region.avg >= 80 ? '긴급' : region.avg >= 60 ? '주의' : region.avg >= 40 ? '관찰' : '안전';
                    return (
                      <div
                        key={region.id}
                        onClick={() => setSelectedRegion(region.id === selectedRegion ? null : region.id)}
                        className="flex items-center gap-[10px] cursor-pointer group"
                      >
                        <span className={`text-[13px] font-[800] w-[16px] text-center shrink-0 ${idx === 0 ? 'text-[#E24B4A]' : idx === 1 ? 'text-[#FF6600]' : 'text-[#CCCCCC]'}`}>
                          {idx + 1}
                        </span>
                        <span className="text-[13px] font-[600] text-[#333333] group-hover:text-[#FF6600] transition-colors w-[32px] shrink-0">
                          {region.name}
                        </span>
                        <div className="flex items-center gap-[6px] flex-1 ml-[4px]">
                          <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
                            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#F0F0F0" strokeWidth="3" />
                            <circle
                              cx="12" cy="12" r="9.5" fill="none"
                              stroke={color} strokeWidth="3"
                              strokeDasharray={`${(2 * Math.PI * 9.5) * region.avg / 100} ${2 * Math.PI * 9.5}`}
                              strokeLinecap="round"
                              transform="rotate(-90 12 12)"
                            />
                          </svg>
                          <span className="text-[14px] font-[800] w-[24px]" style={{ color }}>
                            {region.avg}
                          </span>
                        </div>
                        <span className="text-[11px] font-[700] px-[8px] py-[3px] rounded-[5px] shrink-0"
                          style={{ backgroundColor: color + '18', color }}>
                          {riskLabel}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* 하단: 구분선 + 뉴스카드 */}
          <div className="flex flex-col gap-[16px] flex-1 relative">
            <div className="flex items-center gap-[10px] shrink-0">
              <div className="flex-1 h-[1px] bg-[#EEEEEE]" />
              <span className="text-[13px] text-[#BBBBBB] font-[600] shrink-0">
                감지된 신호 {filteredSignals.length}건
              </span>
              <div className="flex-1 h-[1px] bg-[#EEEEEE]" />
            </div>

            <div className="grid grid-cols-2 gap-[12px] flex-1 auto-rows-fr">
              {displayedSignals.length > 0 ? displayedSignals.map((signal, i) => {
                const isLastOdd = displayedSignals.length % 2 !== 0 && i === displayedSignals.length - 1;
                return (
                  <div key={signal.id} className={`h-full ${isLastOdd ? 'col-span-2' : ''}`}>
                    <CrisisSignalCard signal={signal} />
                  </div>
                );
              }) : (
                <div className="col-span-2 py-[50px] flex flex-col items-center justify-center gap-[14px] bg-white rounded-[14px] border border-[#F0F0F0]">
                  <div className="w-[48px] h-[48px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
                    <MousePointerClick className="w-[20px] h-[20px] text-[#CCCCCC]" />
                  </div>
                  <div className="flex flex-col items-center gap-[6px]">
                    <p className="text-[14px] font-[700] text-[#555555]">조건에 맞는 신호가 없어요</p>
                    <p className="text-[12px] text-[#AAAAAA]">필터를 변경하거나 초기화해 보세요</p>
                  </div>
                  <button
                    onClick={() => { setFilterRegion("전체"); setFilterRisk("전체"); setActiveCategory("전체"); }}
                    className="mt-[4px] text-[12px] font-[600] text-[#FF6600] hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </div>

            {filteredSignals.length > visibleCount && (
              <div className="absolute top-full left-0 w-full pt-[12px] flex justify-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 4)}
                  className="flex flex-col items-center justify-center text-[#CCCCCC] hover:text-[#FF6600] transition-colors group"
                  aria-label="더보기"
                >
                  <span className="text-[10px] font-[600] mb-[2px] opacity-0 group-hover:opacity-100 transition-opacity">더보기</span>
                  <ChevronDown className="w-[20px] h-[20px] group-hover:translate-y-[2px] transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {/* 데이터 출처 (카드 외부 배경) */}
    <div className="mt-[16px] flex flex-col gap-[2px]">
      <p className="text-[11px] text-[#CCCCCC]">
        ※ 종합 위험도는 5가지 지표를 가중 평균하여 산출됩니다.
      </p>
      <p className="text-[11px] text-[#CCCCCC]">
        데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델
      </p>
    </div>
    </>
  );
}