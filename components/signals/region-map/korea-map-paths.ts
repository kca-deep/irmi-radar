// 대한민국 주요 지역 SVG 경로 데이터
// 간소화된 형태로 주요 8개 지역 표현

export interface RegionPathData {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

// viewBox: 0 0 200 280 기준
export const KOREA_MAP_PATHS: RegionPathData[] = [
  {
    id: "seoul",
    name: "서울",
    path: "M85 55 L95 50 L105 55 L105 65 L95 70 L85 65 Z",
    labelX: 95,
    labelY: 62,
  },
  {
    id: "incheon",
    name: "인천",
    path: "M65 55 L80 50 L85 55 L85 70 L75 75 L60 70 Z",
    labelX: 72,
    labelY: 62,
  },
  {
    id: "gyeonggi",
    name: "경기",
    path: "M60 35 L100 25 L130 40 L135 70 L120 90 L105 85 L105 65 L95 70 L85 65 L85 55 L80 50 L65 55 L60 70 L50 65 L45 50 Z",
    labelX: 115,
    labelY: 55,
  },
  {
    id: "daejeon",
    name: "대전",
    path: "M90 130 L110 125 L115 140 L105 150 L90 145 Z",
    labelX: 102,
    labelY: 138,
  },
  {
    id: "daegu",
    name: "대구",
    path: "M130 155 L150 150 L155 165 L145 175 L125 170 Z",
    labelX: 140,
    labelY: 163,
  },
  {
    id: "gwangju",
    name: "광주",
    path: "M65 195 L85 190 L90 205 L80 215 L60 210 Z",
    labelX: 75,
    labelY: 203,
  },
  {
    id: "busan",
    name: "부산",
    path: "M150 200 L170 195 L175 215 L165 230 L145 225 L140 210 Z",
    labelX: 157,
    labelY: 213,
  },
];

// 전체 한반도 윤곽 (배경용)
export const KOREA_OUTLINE_PATH = `
  M60 20
  L120 15 L150 30 L165 55 L170 90
  L175 130 L180 170 L175 200 L165 235 L145 250
  L120 255 L90 250 L60 235
  L40 210 L35 180 L40 150 L45 120
  L40 90 L35 60 L45 35 Z
`;

// 지역 경계선 (장식용)
export const REGION_BORDERS_PATH = `
  M45 95 L165 95
  M55 150 L160 150
  M50 200 L165 200
`;
