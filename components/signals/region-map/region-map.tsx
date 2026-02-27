"use client";

import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon } from "@hugeicons/core-free-icons";
import { RegionTooltip } from "./region-tooltip";

import type { RegionScore, Severity } from "@/lib/types";

interface RegionMapProps {
  regionScores: RegionScore[];
  selectedRegion: string;
  onRegionSelect: (regionId: string) => void;
}

// TopoJSON 파일 경로
const TOPO_JSON_URL = "/korea-topo.json";

// 영문 → 한글 지역명 매핑
const NAME_MAP: Record<string, string> = {
  Seoul: "서울",
  "Gyeonggi-do": "경기",
  Incheon: "인천",
  Busan: "부산",
  Daegu: "대구",
  Gwangju: "광주",
  Daejeon: "대전",
  Ulsan: "울산",
  Sejong: "세종",
  "Gangwon-do": "강원",
  "Chungcheongbuk-do": "충북",
  "Chungcheongnam-do": "충남",
  "Jeollabuk-do": "전북",
  "Jeollanam-do": "전남",
  "Gyeongsangbuk-do": "경북",
  "Gyeongsangnam-do": "경남",
  "Jeju-do": "제주",
};

// Severity별 색상 (CSS 변수)
const SEVERITY_FILL: Record<Severity, string> = {
  critical: "var(--danger)",
  warning: "var(--warning)",
  caution: "var(--caution)",
  safe: "var(--safe)",
};

export function RegionMap({
  regionScores,
  selectedRegion,
  onRegionSelect,
}: RegionMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 지역명으로 점수 데이터 찾기
  const getRegionScore = (koreanName: string): RegionScore | undefined => {
    return regionScores.find((r) => r.name === koreanName);
  };

  // 영문명을 한글로 변환
  const getKoreanName = (englishName: string): string => {
    return NAME_MAP[englishName] || englishName;
  };

  // 현재 호버된 지역 데이터
  const hoveredRegionData = useMemo(() => {
    if (!hoveredRegion) return null;
    const koreanName = getKoreanName(hoveredRegion);
    return getRegionScore(koreanName);
  }, [hoveredRegion, regionScores]);

  // 마우스 이동 핸들러
  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  // 지역 클릭 핸들러
  const handleRegionClick = (englishName: string) => {
    const koreanName = getKoreanName(englishName);
    if (selectedRegion === koreanName) {
      onRegionSelect("all");
    } else {
      onRegionSelect(koreanName);
    }
  };

  // 지역별 fill 색상 결정
  const getFillColor = (englishName: string): string => {
    const koreanName = getKoreanName(englishName);
    const regionScore = getRegionScore(koreanName);
    if (regionScore) {
      return SEVERITY_FILL[regionScore.severity];
    }
    return "var(--muted)";
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon
          icon={Location01Icon}
          size={16}
          strokeWidth={2}
          className="text-primary"
        />
        <h3 className="font-semibold text-xs">지역별 위기 현황</h3>
      </div>

      {/* 지도 컨테이너 */}
      <div
        className="relative aspect-[3/5] w-full -mx-3"
        onMouseMove={handleMouseMove}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 8000,
            center: [127.5, 36.0],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={TOPO_JSON_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const englishName = geo.properties.NAME_1;
                  const koreanName = getKoreanName(englishName);
                  const isSelected = selectedRegion === koreanName;
                  const isHovered = hoveredRegion === englishName;
                  const regionScore = getRegionScore(koreanName);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getFillColor(englishName)}
                      fillOpacity={isHovered ? 0.9 : 0.7}
                      stroke={isSelected ? "var(--primary)" : "var(--border)"}
                      strokeWidth={isSelected ? 2 : 0.5}
                      style={{
                        default: {
                          outline: "none",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        },
                        hover: {
                          outline: "none",
                          fillOpacity: 0.9,
                          filter: "brightness(1.1)",
                        },
                        pressed: {
                          outline: "none",
                        },
                      }}
                      onMouseEnter={() => setHoveredRegion(englishName)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => handleRegionClick(englishName)}
                    />
                  );
                })
              }
            </Geographies>
        </ComposableMap>

        {/* 툴팁 */}
        {hoveredRegionData && (
          <RegionTooltip
            region={hoveredRegionData}
            x={tooltipPos.x}
            y={tooltipPos.y}
            visible={!!hoveredRegion}
          />
        )}
      </div>

      {/* 범례 */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="flex flex-wrap justify-center gap-2 text-[9px]">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-danger" />
            <span className="text-muted-foreground">긴급</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-warning" />
            <span className="text-muted-foreground">주의</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-caution" />
            <span className="text-muted-foreground">관찰</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-safe" />
            <span className="text-muted-foreground">안전</span>
          </div>
        </div>
      </div>

      {/* 선택된 지역 표시 */}
      {selectedRegion !== "all" && (
        <div className="mt-3 text-center">
          <span className="text-xs text-muted-foreground">
            선택:{" "}
            <span className="font-medium text-foreground">{selectedRegion}</span>
          </span>
          <button
            onClick={() => onRegionSelect("all")}
            className="ml-2 text-xs text-primary hover:underline"
          >
            전체 보기
          </button>
        </div>
      )}
    </div>
  );
}
