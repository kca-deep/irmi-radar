import React, { useState } from "react";
import { ChevronDown, ChevronRight, Landmark, MousePointerClick } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase01Icon,
  GuestHouseIcon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
} from "hugeicons-react";

/* ─────────────────────────── 카테고리 설정 ─────────────────────────── */
const categoryConfig: Record<string, { bg: string; Icon: React.ElementType; iconColor: string }> = {
  물가:   { bg: "#FFF8E1", Icon: ShoppingCart01Icon, iconColor: "#F0A000" },
  고용:   { bg: "#EDF2FF", Icon: Briefcase01Icon,    iconColor: "#4C6EF5" },
  자영업: { bg: "#F8D7DA", Icon: Store01Icon,        iconColor: "#D94040" },
  금융:   { bg: "#E8F4FE", Icon: BankIcon,           iconColor: "#1E8BC3" },
  부동산: { bg: "#EDF7ED", Icon: GuestHouseIcon,    iconColor: "#3A9E42" },
};

/* ─────────────────────────── 위험도 설정 ─────────────────────────── */
const riskConfig: Record<string, { color: string; ripple: boolean; cardBg: string }> = {
  긴급: { color: "#E24B4A", ripple: true,  cardBg: "#C84040" },
  주의: { color: "#FF6600", ripple: false, cardBg: "#D05520" },
  관찰: { color: "#FFAA00", ripple: false, cardBg: "#CC9000" },
  안전: { color: "#5DAA30", ripple: false, cardBg: "#4A8A22" },
};

/* ─────────────────────────── 카드 데이터 ─────────────────────────── */
const cards = [
  {
    id: 1,
    category: "고용",
    risk: "긴급",
    title: "고용유지지원금\n내 업종 해당 여부\n지금 확인",
    subtitle: "휴업수당 70% 지원",
    keywords: ["고용유지", "휴업수당", "지원금신청"],
    date: "3월 13일",
  },
  {
    id: 2,
    category: "부동산",
    risk: "주의",
    title: "전세 계약 만료 전\n갱신청구권\n즉시 행사 확인",
    subtitle: "계약 해지 리스크 예방",
    keywords: ["전세갱신", "갱신청구권", "임대차"],
    date: "3월 13일",
  },
  {
    id: 3,
    category: "물가",
    risk: "주의",
    title: "긴급복지 생계지원\n신청 대상 여부\n즉시 조회",
    subtitle: "월 최대 30만 원 지원",
    keywords: ["긴급복지", "생계지원", "물가대응"],
    date: "3월 13일",
  },
  {
    id: 4,
    category: "금융",
    risk: "긴급",
    title: "카드 연체 방지\n리볼빙 잔액\n조기 상환 검토",
    subtitle: "신용점수 하락 방지",
    keywords: ["카드연체", "리볼빙", "신용관리"],
    date: "3월 13일",
  },
  {
    id: 5,
    category: "고용",
    risk: "주의",
    title: "실업급여 수급 요건\n퇴직 전 반드시\n사전 확인",
    subtitle: "고용보험 가입 기간 체크",
    keywords: ["실업급여", "고용보험", "퇴직준비"],
    date: "3월 12일",
  },
  {
    id: 6,
    category: "금융",
    risk: "관찰",
    title: "중소기업 대출\n금리 우대 조건\n사전 점검 필요",
    subtitle: "이자 부담 경감 기회",
    keywords: ["중소기업대출", "금리우대", "대출점검"],
    date: "3월 12일",
  },
];

/* ─────────────────────────── 뉴스 카드 컴포넌트 ─────────────────────────── */
interface NewsCardProps {
  card: typeof cards[0];
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

function NewsCard({ card, isSelected, isDimmed, onClick }: NewsCardProps) {
  const cat = categoryConfig[card.category];
  const risk = riskConfig[card.risk];
  const CatIcon = cat.Icon;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: "16px",
        backgroundColor: risk.cardBg,
        overflow: "hidden",
        boxShadow: isSelected
          ? "0 8px 28px rgba(0,0,0,0.22)"
          : "0 2px 12px rgba(0,0,0,0.12)",
        padding: "18px 18px 20px",
        minHeight: "190px",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transform: isSelected ? "translateY(-2px)" : isDimmed ? "scale(0.98)" : "translateY(0)",
        opacity: isDimmed ? 0.45 : 1,
        outline: isSelected ? "2px solid rgba(255,255,255,0.55)" : "none",
        outlineOffset: "2px",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.22)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }
      }}
    >
      {/* 배경 아이콘 — 우하단 절대 위치, 카드 밖으로 걸쳐 overflow:hidden 으로 클립 */}
      <div style={{
        position: "absolute",
        bottom: "-18px",
        right: "-18px",
        opacity: 0.16,
        pointerEvents: "none",
        zIndex: 0,
      }}>
        <CatIcon size={110} color="white" />
      </div>

      {/* 상단: 뱃지 + 번호 */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          backgroundColor: "rgba(255,255,255,0.22)",
          borderRadius: "20px",
          padding: "5px 12px",
          fontSize: "11px",
          fontWeight: 700,
          color: "white",
          letterSpacing: "0.2px",
        }}>
          {card.risk} · {card.category}
        </span>
        <span style={{ fontSize: "28px", fontWeight: 900, color: "rgba(255,255,255,0.22)", lineHeight: 1 }}>
          {card.id}
        </span>
      </div>

      {/* 제목 — 3줄 자연 줄바꿈 */}
      <p style={{
        fontSize: "16px",
        fontWeight: 800,
        color: "white",
        lineHeight: 1.45,
        margin: 0,
        flex: 1,
        letterSpacing: "-0.4px",
        wordBreak: "keep-all",
        whiteSpace: "pre-line",
        position: "relative",
        zIndex: 1,
      }}>
        {card.title}
      </p>

      {/* 하단: 부제 + 꺽쇠 */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "12px", position: "relative", zIndex: 1 }}>
        <p style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.60)",
          fontWeight: 500,
          margin: 0,
        }}>
          {card.subtitle}
        </p>
        <ChevronRight size={18} color="rgba(255,255,255,0.70)" />
      </div>
    </div>
  );
}

/* ─────────────────────────── 메인 페이지 ─────────────────────────── */
export function CustomAnalysis() {
  const [selectedCard, setSelectedCard] = useState<typeof cards[0] | null>(null);

  return (
    <div className="pb-10 pt-[8px]">
      {/* ripple 키프레임 */}
      <style>{`
        @keyframes ripple {
          0%   { box-shadow: 0 0 0 0 rgba(226,75,74,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(226,75,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(226,75,74,0); }
        }
        .dot-urgent { animation: ripple 1.5s ease-out infinite; }
      `}</style>

      {/* Greeting & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-[28px] py-[20px] rounded-[24px] mb-[24px] relative overflow-hidden bg-white border border-[#EAEAEA] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div
          className="absolute top-0 bottom-0 right-0 w-[55%] bg-[#FFF6F0] z-0 hidden md:block"
          style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }}
        />
        <div className="absolute right-[10%] top-[10%] w-[100px] h-[100px] rounded-full bg-[#FFE5D6] blur-[40px] opacity-60 z-0 hidden md:block" />
        <div className="absolute left-[406.5px] top-[10.5px] w-[120px] z-10 pointer-events-none hidden lg:block opacity-95">
          <svg className="w-full h-auto drop-shadow-md mix-blend-multiply scale-110 origin-top" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 769.842"><g transform="translate(-605.233 -233)"><rect width="885.473" height="567.096" rx="10" transform="translate(605.612 233.502)" fill="#e6e6e6"/><rect width="834.833" height="462.419" rx="8" transform="translate(630.931 304.63)" fill="#fff"/><path d="M10,0H875.473a10,10,0,0,1,10,10V37.618a0,0,0,0,1,0,0H0a0,0,0,0,1,0,0V10A10,10,0,0,1,10,0Z" transform="translate(605.233 233)" fill="#fd9c3b"/><circle cx="6.972" cy="6.972" r="6.972" transform="translate(626.216 245.26)" fill="#fff"/><circle cx="6.972" cy="6.972" r="6.972" transform="translate(652.681 245.26)" fill="#fff"/><circle cx="6.972" cy="6.972" r="6.972" transform="translate(679.146 245.26)" fill="#fff"/><path d="M11,0H203.511a11,11,0,0,1,11,11V355.457a11,11,0,0,1-11,11H11a11,11,0,0,1-11-11V11A11,11,0,0,1,11,0Z" transform="translate(706.788 352.609)" fill="#e6e6e6"/><path d="M11,0H167.759a11,11,0,0,1,11,11V89.87a11,11,0,0,1-11,11H11a11,11,0,0,1-11-11V11A11,11,0,0,1,11,0Z" transform="translate(958.33 352.609)" fill="#fd9c3b"/><path d="M11,0H167.759a11,11,0,0,1,11,11V97.531a11,11,0,0,1-11,11H11a11,11,0,0,1-11-11V11A11,11,0,0,1,11,0Z" transform="translate(958.33 481.573)" fill="#e6e6e6"/><path d="M11,0H167.759a11,11,0,0,1,11,11V89.87a11,11,0,0,1-11,11H11a11,11,0,0,1-11-11V11A11,11,0,0,1,11,0Z" transform="translate(958.33 618.197)" fill="#e6e6e6"/><path d="M11,0H203.511a11,11,0,0,1,11,11V148.7a11,11,0,0,1-11,11H11a11,11,0,0,1-11-11V11A11,11,0,0,1,11,0Z" transform="translate(1175.396 352.609)" fill="#e6e6e6"/><path d="M11,0H203.511a11,11,0,0,1,11,11V148.7a11,11,0,0,1-11,11H11a11,11,0,0,1-11-11V11A11,11,0,0,1,11,0Z" transform="translate(1175.396 559.368)" fill="#e6e6e6"/><path d="M529.084,442.284a139.125,139.125,0,0,1-23.607-187.019q-3.99,4.018-7.714,8.416A139.117,139.117,0,1,0,710.411,443.112q3.716-4.4,7-9.02a139.125,139.125,0,0,1-188.325,8.192Z" transform="translate(442.456 94.029)" opacity="0.3" style={{ isolation: 'isolate' }}/><path d="M921.5,730.047H572.682c-.506,0-.916-.616-.916-1.375s.41-1.375.916-1.375H921.5c.506,0,.916.616.916,1.375S922,730.047,921.5,730.047Z" transform="translate(642.819 271.161)" fill="#e6e6e6"/><path d="M166.77,333.06l14.307-28.2,16.462,8.353-14.307,28.2a19.376,19.376,0,0,1-1.36,14.918c-4.46,8.789-13.971,12.921-21.245,9.23s-9.555-13.807-5.095-22.6a19.377,19.377,0,0,1,11.237-9.906Z" transform="translate(1171.2 342.928)" fill="#ed9da0"/><path d="M185.733,210.483,121.052,312.3l-19.405-17.38,46.86-102.885" transform="translate(1234.737 375.511)" fill="#fd9c3b"/><path d="M83.816,240.057l-19.7,91.5,85.86,3s-11.248-63.545-7.256-74.527Z" transform="translate(1297.169 377.597)" fill="#ed9da0"/><rect width="20.064" height="26.445" transform="translate(1344.52 958.145)" fill="#ed9da0"/><path d="M207.966,608.034a6.562,6.562,0,0,0,2.753-4.611c.127-1.911-.829-3.961-2.841-6.093-.048-.614-.673-8.216-2.064-9.578.117-.407.825-3.1-.336-4.857a3.378,3.378,0,0,0-2.622-1.43l-.052,0-.026.045c-.034.059-3.419,5.941-8.513,6.457-2.92.3-5.843-1.206-8.689-4.466-.1-.241-.906-4.212-1.425-6.84l-.021-.105-27.75,14.586-16.22,4.489a4.722,4.722,0,0,0-.786,8.806l7.863,3.78a24.6,24.6,0,0,0,10.594,2.414h42.649a11.909,11.909,0,0,0,7.487-2.592Z" transform="translate(1160.678 392.214)" fill="#090814"/><rect width="20.064" height="26.445" transform="matrix(0.96, -0.279, 0.279, 0.96, 1477.645, 951.686)" fill="#ed9da0"/><path d="M70.812,593.478a6.562,6.562,0,0,0,1.356-5.2c-.412-1.87-1.9-3.572-4.43-5.057-.218-.576-2.941-7.7-4.657-8.619,0-.423-.075-3.212-1.68-4.57a3.378,3.378,0,0,0-2.917-.64l-.051.009-.012.051c-.016.066-1.624,6.659-6.37,8.577-2.721,1.1-5.948.474-9.591-1.861-.165-.2-2.047-3.791-3.279-6.169l-.049-.1L16.561,591.663,2.24,600.5a4.722,4.722,0,0,0,1.7,8.676l8.606,1.433a24.6,24.6,0,0,0,10.846-.641l40.951-11.913a11.91,11.91,0,0,0,6.465-4.58Z" transform="translate(1441.759 391.899)" fill="#090814"/><path d="M146.6,286.03l-85.86,2S8.565,438.422,10.562,581.185H82.185l4.253-165.728,12.44,172.165,94.384-5.435Z" transform="translate(1309.821 379.593)" fill="#090814"/><path d="M71.408,126.409A32.618,32.618,0,1,1,122.039,153.6a80.973,80.973,0,0,0,10.67,18.823l-32.145,26.788-6.306-41.67a32.631,32.631,0,0,1-22.851-31.128Z" transform="translate(1302.892 371.243)" fill="#ed9da0"/><path d="M85.366,170.249l36.939-8.986,23.678,30.317a48.817,48.817,0,0,1,2.478,36.925l-19.634,58.9s-59.9-1-72.88-35.941l-3.721-7.752a31.9,31.9,0,0,1,3-32.618Z" transform="translate(1311.86 374.174)" fill="#fd9c3b"/><path d="M54.174,68.462a23.562,23.562,0,0,1-7.654,4.05A95.07,95.07,0,0,0,52.809,57.04c-.424-4.729-.51-7.72-.51-7.72l.076-.74c-.961-.64-2.53-.6-4.909.416,0,0-25.691-8.524-19.356-18.2,0,0-27.268,4.749-27.976,0S.135-4.387,37.081.537c14.168,1.89,22.177,7.607,26.667,13.939A19.883,19.883,0,0,1,72,14.231c3.1.591,6.379,2.857,9.331,5.558A51.673,51.673,0,0,1,94.555,39.63c7.734,20.282,23.973,71.007-4.431,77.224a23.472,23.472,0,0,1-5.02.566C65.062,117.423,57.214,88.6,54.174,68.462Z" transform="translate(1379.8 450.78) rotate(3)" fill="#090814"/><path d="M748.156,224.194a185.686,185.686,0,1,0,10.528,274.229L986.45,690.612a17.111,17.111,0,0,0,22.095-26.134l-.025-.021L780.753,472.268a185.7,185.7,0,0,0-32.6-248.074ZM733.472,453.762a139.117,139.117,0,1,1-16.608-196.04h0A139.117,139.117,0,0,1,733.472,453.762Z" transform="translate(434.107 65.943)" fill="#3f3d56"/><path d="M56.225,357.838l-.686-31.61,18.456-.4.686,31.61a19.376,19.376,0,0,1,5.839,13.8c.214,9.853-6.224,17.984-14.378,18.161S51.2,381.727,50.99,371.874a19.377,19.377,0,0,1,5.235-14.035Z" transform="translate(1380.32 381.322)" fill="#ed9da0"/><path d="M91.38,204.882V358.1H59.328L49.854,206.175" transform="translate(1370.646 376.069)" fill="#fd9c3b"/></g></svg>
        </div>

        {/* Left Side */}
        <div className="flex items-center gap-[16px] relative z-20 mb-4 md:mb-0">
          <div className="w-[48px] h-[48px] bg-gradient-to-br from-[#FFF0E8] to-[#FFE0CC] rounded-full flex items-center justify-center text-[#FF6600] shadow-sm border border-[#FFF]">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-[20px] font-[800] text-[#1A1A1A] tracking-[-0.5px] mb-[2px]">
              김매경님, 반갑습니다!
            </div>
            <div className="text-[13px] text-[#777777] font-[500] tracking-tight">
              나에게 꼭 맞는 맞춤 혜택을 꼼꼼하게 확인해 보세요
            </div>
          </div>
        </div>

        {/* Right Side Filters */}
        <div className="flex items-center gap-[10px] relative z-20 bg-[#FFF6F0] py-[8px] px-[12px] rounded-[16px] border border-[#FFEADB]">
          <span className="text-[12px] font-[700] text-[#666666] mr-[4px]">맞춤 조건</span>
          <div className="relative w-[110px] h-[36px]">
            <select className="w-full h-full appearance-none bg-white border border-[#E0D0C0] hover:border-[#FF6600] transition-colors rounded-[8px] text-[13px] text-[#333333] font-[600] pl-[12px] pr-[30px] outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-[#FF6600]/20" defaultValue="30대">
              <option value="20대">20대</option>
              <option value="30대">30대</option>
              <option value="40대">40대</option>
              <option value="50대">50대</option>
              <option value="60대 이상">60대 이상</option>
            </select>
            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#888] pointer-events-none" />
          </div>
          <div className="relative w-[130px] h-[36px]">
            <select className="w-full h-full appearance-none bg-white border border-[#E0D0C0] hover:border-[#FF6600] transition-colors rounded-[8px] text-[13px] text-[#333333] font-[600] pl-[12px] pr-[30px] outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-[#FF6600]/20" defaultValue="직장인">
              <option value="직장인">직장인</option>
              <option value="자영업자">자영업자</option>
              <option value="구직자">구직자</option>
              <option value="프리랜서">프리랜서</option>
            </select>
            <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#888] pointer-events-none" />
          </div>
          <button className="h-[36px] px-[18px] bg-[#FF6600] text-white text-[13px] font-[700] rounded-[8px] shadow-[0_4px_12px_rgba(255,102,0,0.25)] border-none hover:bg-[#E65C00] hover:-translate-y-[1px] active:translate-y-[0px] transition-all">
            재분석
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col gap-[28px]">
        {/* Top Info Bar */}
        <div className="flex flex-col gap-[10px]">
          
        </div>

        {/* Divider */}
        <div className="h-[1px] w-full bg-[#EAEAEA] -my-[14px]" />

        {/* Main Content */}
        <main className="w-full">
          <div className="mb-[14px]">
            <h1 className="text-[22px] font-[900] tracking-[-0.5px] leading-[1.3] text-[#1A1A1A]">
              <span className="text-[#FF6600]">30대 직장인</span>, 지금 당장 이것만 하세요.
            </h1>
            <p className="text-[12px] text-[#888888] font-medium mt-[4px] px-[0px] py-[5px]">
              1년 뉴스 흐름 + 오늘 데이터 기반 · 카드를 클릭하면 이유와 신청 방법을 확인할 수 있어요
            </p>
          </div>

          <div className="flex flex-col gap-[10px]">
            {Array.from({ length: Math.ceil(cards.length / 3) }).map((_, rowIndex) => {
              const rowCards = cards.slice(rowIndex * 3, (rowIndex + 1) * 3);
              const isSelectedInRow = selectedCard && rowCards.some(c => c.id === selectedCard.id);

              return (
                <div key={rowIndex} className="contents">
                  <div className="grid grid-cols-3 gap-[10px]">
                    {rowCards.map(card => (
                      <NewsCard
                        key={card.id}
                        card={card}
                        isSelected={selectedCard?.id === card.id}
                        isDimmed={selectedCard !== null && selectedCard.id !== card.id}
                        onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {isSelectedInRow && selectedCard && (() => {
                      const risk = riskConfig[selectedCard.risk];
                      const cat = categoryConfig[selectedCard.category];
                      const CatIcon = cat.Icon;
                      return (
                        <motion.div
                          key={`detail-${selectedCard.id}`}
                          initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 8, marginBottom: 20 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-[#E0D0C0] flex overflow-hidden">
                            {/* Left Sidebar */}
                            <div
                              className="w-[220px] p-[20px] flex flex-col shrink-0 relative overflow-hidden"
                              style={{ backgroundColor: risk.cardBg }}
                            >
                              {/* 배경 아이콘 — 우하단 절대 위치, 카드와 동일 처리 */}
                              <div style={{
                                position: "absolute",
                                bottom: "-18px",
                                right: "-18px",
                                opacity: 0.16,
                                pointerEvents: "none",
                                zIndex: 0,
                              }}>
                                <CatIcon size={110} color="white" />
                              </div>

                              {/* 상단: 뱃지 */}
                              <div style={{ position: "relative", zIndex: 1, marginBottom: "14px" }}>
                                <span style={{
                                  backgroundColor: "rgba(255,255,255,0.22)",
                                  borderRadius: "20px",
                                  padding: "5px 12px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "white",
                                  letterSpacing: "0.2px",
                                }}>
                                  {selectedCard.risk} · {selectedCard.category}
                                </span>
                              </div>

                              {/* 제목 */}
                              <p style={{
                                fontSize: "20px",
                                fontWeight: 800,
                                color: "white",
                                lineHeight: 1.45,
                                margin: 0,
                                flex: 1,
                                letterSpacing: "-0.4px",
                                wordBreak: "keep-all",
                                whiteSpace: "pre-line",
                                position: "relative",
                                zIndex: 1,
                              }}>
                                {selectedCard.title}
                              </p>
                            </div>

                            {/* Right Content */}
                            <div className="flex-1 p-[20px] flex bg-[#FFFDFB]">
                              {/* 왜 지금인가 + 신청 */}
                              <div className="flex-1 flex flex-col justify-between pr-[20px] border-r-[0.5px] border-[#E0D0C0]">
                                <div>
                                  <div className="text-[10px] text-[#FF6600] font-[700] tracking-[0.3px] mb-[6px] flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-[#FF6600] rounded-full" />
                                    왜 지금인가
                                  </div>
                                  <div className="text-[12px] text-[#444444] leading-[1.5]">
                                    최근 3개월간 관련 정책 및 뉴스에서 가장 시급하게 다루어지는 이슈입니다. 지금 신청하지 않으면 예산이 소진되거나 지원 자격을 상실할 수 있습니다.
                                  </div>
                                </div>
                                <div className="mt-[16px] pt-[14px] border-t-[0.5px] border-[#E0D0C0]">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-[#FFF0E8] text-[#FF6600] rounded-[8px] flex items-center justify-center shrink-0">
                                      <Landmark className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[10px] text-[#888888] font-[500] mb-[2px]">신청 가능한 정부지원</div>
                                      <div className="text-[13px] font-[700] text-[#1A1A1A] truncate">2026 맞춤형 지원 프로그램</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setSelectedCard(null)}
                                      className="px-[14px] py-[7px] text-[12px] font-[600] text-[#888888] hover:bg-[#F0EBE1] rounded-[8px] transition-colors"
                                    >
                                      닫기
                                    </button>
                                    <button
                                      className="flex-1 text-white text-[12px] font-[700] px-[16px] py-[7px] rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all whitespace-nowrap hover:brightness-90"
                                      style={{ backgroundColor: risk.cardBg }}
                                    >
                                      신청하러 가기
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* 근거 뉴스 */}
                              <div className="flex-1 pl-[20px] flex flex-col h-full">
                                <div className="text-[10px] text-[#FF6600] font-[700] tracking-[0.3px] mb-[6px] flex items-center gap-1.5 shrink-0">
                                  <div className="w-1.5 h-1.5 bg-[#FF6600] rounded-full" />
                                  근거 뉴스
                                </div>
                                <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] pr-1">
                                  {[
                                    { headline: "\"정부, 올해 지원금 예산 조기 소진 예상… 빠른 신청 당부\"", date: "2026.03.14" },
                                    { headline: "\"30대 직장인 주거비 부담 경감을 위한 특별 지원책 발표\"", date: "2026.03.12" },
                                    { headline: "\"올 하반기 금리 인상 가능성… 고정금리 대환 대출 문의 급증\"", date: "2026.03.10" },
                                    { headline: "\"청년층 자산형성 도약 계좌 가입자 수 100만 명 돌파\"", date: "2026.03.08" },
                                  ].map((news, i) => (
                                    <div key={i} className="bg-white rounded-[8px] p-[8px_12px] border-[0.5px] border-[#E0D0C0] shrink-0">
                                      <div className="text-[11px] text-[#333333] font-[600] leading-[1.4] mb-1 truncate">
                                        {news.headline}
                                      </div>
                                      <div className="text-[10px] text-[#AAAAAA]">{news.date}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          <AnimatePresence>
            {!selectedCard && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-[32px] flex flex-col items-center justify-center py-[60px] bg-[#FDFDFD] rounded-[16px] border border-dashed border-[#DCDCDC]"
              >
                <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <MousePointerClick className="w-8 h-8 text-[#AAAAAA]" strokeWidth={1.5} />
                </div>
                <div className="text-[15px] font-[700] text-[#444444] mb-2">
                  위 카드 중 하나를 선택해보세요
                </div>
                <div className="text-[13px] text-[#888888] font-medium">
                  카드를 클릭하면 상세한 지원 혜택과 신청 방법을 확인할 수 있습니다.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* 데이터 출처 */}
      <div className="mt-[16px] flex flex-col gap-[2px]">
        <p className="text-[11px] text-[#CCCCCC]">
          데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델
        </p>
      </div>
    </div>
  );
}