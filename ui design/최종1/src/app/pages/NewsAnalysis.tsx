import React, { useState } from "react";
import { Search, Play, Building, Briefcase, Coins, Landmark, Store, ChevronDown } from "lucide-react";
import { RiskBadge } from "../components/RiskBadge";
import logoImage from "figma:asset/e1ee2c70c87487ad23c9033fe13a21c1a3a52ca6.png";

/* ─── 카테고리 아이콘·색상 ─── */
const categoryConfig: Record<string, { Icon: React.ElementType; iconBg: string; iconColor: string }> = {
  물가:   { Icon: Coins,     iconBg: "#FFF8E1", iconColor: "#F0A000" },
  고용:   { Icon: Briefcase, iconBg: "#EDF2FF", iconColor: "#4C6EF5" },
  자영업: { Icon: Store,     iconBg: "#F8D7DA", iconColor: "#D94040" },
  금융:   { Icon: Landmark,  iconBg: "#E8F4FE", iconColor: "#1E8BC3" },
  부동산: { Icon: Building,  iconBg: "#EDF7ED", iconColor: "#3A9E42" },
};

const riskDotColor: Record<string, string> = {
  긴급: "#E24B4A",
  주의: "#FF6600",
  관찰: "#FFAA00",
  안전: "#5DAA30",
};

/* ─── 카드 데이터 ─── */
const newsCards = [
  {
    id: 1,
    category: "금융",
    risk: "긴급",
    score: 85,
    date: "12월 29일",
    reporter: "이혜훈 기자",
    title: "생산 줄이는데 관세까지 첩첩산중…치솟는 구리값",
    body: "주요 산업용 금속인 구리 가격이 관세 압박과 공급 감소가 겹치며 급등세를 이어가고 있습니다.",
    keywords: ["구리 가격", "관세", "산업 금속"],
  },
  {
    id: 2,
    category: "금융",
    risk: "긴급",
    score: 82,
    date: "12월 29일",
    reporter: "박정훈 기자",
    title: "\"내년에도 내집마련 꿈도 꾸지말라네요\"…당국, 벌써부터 대출자제령",
    body: "금융당국이 가계대출 총량 규제를 예고하며 내년 주택 구입 수요 위축이 예상됩니다.",
    keywords: ["가계대출", "금융위원회"],
  },
  {
    id: 3,
    category: "부동산",
    risk: "주의",
    score: 74,
    date: "12월 29일",
    reporter: "최수진 기자",
    title: "10억 오른 올해…교통망 확충에 들쑤이는 수서 부동산",
    body: "수서 GTX 개통 호재와 함께 인근 단지 매매가가 1년 새 최대 10억 원 상승했습니다.",
    keywords: ["수서", "올림픽훼밀리타운"],
  },
  {
    id: 4,
    category: "물가",
    risk: "주의",
    score: 71,
    date: "12월 28일",
    reporter: "김태영 기자",
    title: "\"초기대응 미흡\" 한달만에 사과한 김법석…국회 청문회는 또 불출석",
    body: "쿠팡 개인정보 유출 사태와 관련해 당국의 초기 대응 미흡 논란이 이어지고 있습니다.",
    keywords: ["개인정보 유출", "쿠팡"],
  },
  {
    id: 5,
    category: "부동산",
    risk: "주의",
    score: 76,
    date: "12월 28일",
    reporter: "윤지원 기자",
    title: "서울아파트 샀다가 취소…계약 해제율 5년새 최고",
    body: "금리 부담과 매수 심리 악화로 서울 아파트 매매 계약 해제 건수가 5년 만에 최고 수준을 기록했습니다.",
    keywords: ["계약 해제", "서울 아파트"],
  },
  {
    id: 6,
    category: "자영업",
    risk: "주의",
    score: 68,
    date: "12월 28일",
    reporter: "한미래 기자",
    title: "불났는데 건물주·임차인 '화재보험 같다'…대법 \"세입자에 배상 요구 못해\"",
    body: "대법원이 건물주가 임차인에게 화재 손해배상을 청구할 수 없다는 판결을 내려 소상공인 보험 가입 중요성이 부각됩니다.",
    keywords: ["화재보험", "임차인"],
  },
  {
    id: 7,
    category: "고용",
    risk: "관찰",
    score: 55,
    date: "12월 27일",
    reporter: "정재원 기자",
    title: "청년 체감실업률 24.5%…통계 사각지대 심각",
    body: "공식 실업률 통계에 잡히지 않는 청년층 구직단념자와 불완전 취업자를 합산한 체감실업률이 급등하고 있습니다.",
    keywords: ["청년실업", "체감실업률", "고용"],
  },
  {
    id: 8,
    category: "물가",
    risk: "긴급",
    score: 88,
    date: "12월 27일",
    reporter: "임소연 기자",
    title: "외식물가 6개월 연속 상승…서민 밥상 직격탄",
    body: "식자재 가격 폭등으로 서울권 주요 외식 품목 가격이 가파르게 상승하여 소비 심리가 위축되고 있습니다.",
    keywords: ["외식물가", "식자재", "소비심리"],
  },
  {
    id: 9,
    category: "금융",
    risk: "관찰",
    score: 52,
    date: "12월 27일",
    reporter: "강민석 기자",
    title: "지역 중소기업 대출 연체율 3개월 연속 소폭 상승",
    body: "경기 침체 장기화로 인해 지방 중소기업 및 소상공인의 대출 연체율이 꾸준히 오르고 있습니다.",
    keywords: ["연체율", "중소기업", "대출"],
  },
];

const categories = ["전체", "물가", "고용", "자영업", "금융", "부동산"];

export function NewsAnalysis() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [isAnalyzedOnly, setIsAnalyzedOnly] = useState(true);

  return (
    <div className="pb-10">
      {/* Page Head Actions */}
      <div className="flex items-center justify-between mt-[12px] mb-[12px]">
        <div className="text-[#AAAAAA] text-[14px]">
          뉴스 기사를 AI로 분석하고 위험도를 확인하세요
        </div>
        <div className="flex items-center gap-[8px]">
          <button className="bg-white border-none rounded-[8px] shadow-[0_1px_6px_rgba(0,0,0,0.08)] px-[14px] py-[7px] text-[#888888] cursor-pointer hover:bg-gray-50 transition-colors text-[14px]">
            분석 초기화
          </button>
          <button className="flex items-center gap-[5px] bg-[#FF6600] border-none rounded-[8px] px-[16px] py-[7px] text-white font-[700] cursor-pointer hover:bg-[#E65C00] transition-colors text-[14px]">
            <Play className="w-[10px] h-[10px] fill-current" />
            AI 분석 시작하기
          </button>
        </div>
      </div>

      {/* Analysis Result Strip */}
      <div className="rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center gap-[24px] mb-[12px] relative overflow-hidden px-[20px] py-[6px] bg-[#fff8f2c9]">
        <div className="flex items-baseline gap-[5px]">
          <span className="text-[13px] text-[#888888]">분석 완료</span>
          <span className="font-[700] text-[#1A1A1A] text-[16px]">50건</span>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666666]" />
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#E24B4A] shrink-0" />
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[13px] text-[#888888]">긴급</span>
            <span className="font-[700] text-[#5e5a5a] text-[16px]">3건</span>
          </div>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666633]" />
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#FF6600] shrink-0" />
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[13px] text-[#888888]">주의</span>
            <span className="font-[700] text-[#5e5a5a] text-[16px]">4건</span>
          </div>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666633]" />
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#FFAA00] shrink-0" />
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[13px] text-[#888888]">관찰</span>
            <span className="font-[700] text-[#5e5a5a] text-[16px]">2건</span>
          </div>
        </div>
        <div className="ml-auto shrink-0 w-[36px] h-[36px] pointer-events-none select-none">
          <img
            src={logoImage}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }}
          />
        </div>
      </div>

      {/* Filter/Search Bar */}
      <div className="h-[44px] bg-white rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-[16px] flex items-center gap-[8px] mb-[14px]">
        <div className="flex items-center gap-[8px]">
          <Search className="w-[14px] h-[14px] text-[#CCCCCC]" />
          <input
            type="text"
            placeholder="기사 검색..."
            className="border-none outline-none text-[11px] text-[#333333] placeholder:text-[#CCCCCC] w-[150px] bg-transparent"
          />
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#EEEEEE]" />
        <div className="flex gap-[2px]">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-[11px] px-[11px] py-[5px] rounded-[8px] border-none cursor-pointer transition-colors ${
                activeCategory === category
                  ? "bg-[#F5F5F5] text-[#1A1A1A] font-[700]"
                  : "bg-transparent text-[#BBBBBB] hover:text-[#1A1A1A]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#EEEEEE]" />
        <div
          className="flex items-center gap-[6px] cursor-pointer"
          onClick={() => setIsAnalyzedOnly(!isAnalyzedOnly)}
        >
          <div
            className={`w-[28px] h-[16px] rounded-[8px] relative transition-colors ${
              isAnalyzedOnly ? "bg-[#E8521A]" : "bg-[#CCCCCC]"
            }`}
          >
            <div
              className={`absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white transition-all ${
                isAnalyzedOnly ? "right-[2px]" : "left-[2px]"
              }`}
            />
          </div>
          <span className="text-[11px] text-[#888888]">분석 완료만</span>
        </div>
        
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-3 gap-[10px]">
        {newsCards.map(card => {
          const cat = categoryConfig[card.category] ?? categoryConfig["금융"];
          const CatIcon = cat.Icon;
          const isUrgent = card.risk === "긴급";
          const dotColor = riskDotColor[card.risk] ?? "#AAAAAA";

          return (
            <div
              key={card.id}
              className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[16px] flex flex-col h-[250px] cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:-translate-y-[2px] transition-all duration-200"
              style={{ gap: "9px" }}
            >
              {/* 상단: 카테고리 + 위험도 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cat.iconBg }}
                  >
                    <CatIcon size={16} color={cat.iconColor} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-[600] text-[#555555] ml-[7px]">
                    {card.category}
                  </span>
                </div>
                <div className="flex items-center gap-[5px]">
                  <div className="flex flex-col items-center gap-[2px]">
                    <div className="relative flex items-center justify-center w-[7px] h-[7px]">
                      {isUrgent && (
                        <div
                          className="absolute w-[7px] h-[7px] rounded-full bg-[#E24B4A] animate-ping"
                          style={{ animationDuration: "1.5s", opacity: 0.6 }}
                        />
                      )}
                      <div
                        className="relative z-10 w-[7px] h-[7px] rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    </div>
                    <span className="text-[8.5px] font-[600] text-[#AAAAAA]">{card.risk}</span>
                  </div>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="font-[700] text-[#1A1A1A] leading-[1.5] line-clamp-2 text-[15px]">
                {card.title}
              </h3>

              {/* 본문 2줄 말줄임 */}
              <p
                className="text-[#888888] leading-[1.6] text-[12px]"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                } as React.CSSProperties}
              >
                {card.body}
              </p>

              {/* 키워드 태그 */}
              <div className="mt-auto flex gap-[5px] flex-wrap">
                {card.keywords.map(kw => (
                  <span
                    key={kw}
                    className="text-[10px] text-[#888888] bg-[#F5F5F5] px-[9px] py-[3px] rounded-[20px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>

              {/* 하단 */}
              <div className="pt-[8px] border-t-[0.5px] border-[#F5F5F5] flex items-center justify-between">
                <span className="text-[10px] text-[#BBBBBB]">{card.date}</span>
                <span className="text-[10px] font-[700] text-[#FF6600]">상세 →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      <div className="mt-[12px] flex justify-center">
        <button
          className="flex flex-col items-center justify-center text-[#CCCCCC] hover:text-[#FF6600] transition-colors group border-none bg-transparent cursor-pointer"
          aria-label="더보기"
        >
          <span className="text-[10px] font-[600] mb-[2px]">41건 남음</span>
          <ChevronDown className="w-[20px] h-[20px] group-hover:translate-y-[2px] transition-transform" />
        </button>
      </div>
    </div>
  );
}