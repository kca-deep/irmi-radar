import Database from "better-sqlite3";
import { join } from "path";

const db = new Database(join(process.cwd(), "data/irmi.db"));

interface Update {
  id: string;
  score: number;
  severity: string;
  region: string | null;
  factors: string[];
  summary: string;
}

const updates: Update[] = [
  // === 12/2 ===
  // employment
  {id:"11482012", score:18, severity:"safe", region:null, factors:["미국 Z세대 연말 지출 34% 축소 계획"], summary:"배정 카테고리(고용)와 간접 관련. 미국 Z세대 빈곤 문제, 한국 직접 영향 제한적"},
  {id:"11482630", score:12, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 직접 관련 낮음. 미국 트럼프 이민판사 해고 소식"},
  {id:"11482510", score:34, severity:"safe", region:null, factors:["쿠팡 퇴사 직원 서버 무단 접근 1년간 미탐지"], summary:"쿠팡 개인정보 유출 사태 후속. 보안 체계 허점 지속 확인"},
  {id:"11481914", score:22, severity:"safe", region:null, factors:["미국 컴퓨터학과 졸업생 취업난, AI 전공 인기"], summary:"배정 카테고리(고용)와 간접 관련. 미국 IT 취업시장 변화"},
  {id:"11481478", score:42, severity:"caution", region:"전국", factors:["미취업 청년 27.6% 창업 의지 표명", "관심 분야 외식 등 일반 서비스업"], summary:"미취업 청년 10명 중 3명 취업 대신 창업 희망. 청년 고용시장 경직 반영"},

  // finance
  {id:"11481960", score:14, severity:"safe", region:null, factors:[], summary:"배정 카테고리(금융)와 직접 관련 낮음. 트럼프 미디어 주가 폭락"},
  {id:"11482482", score:28, severity:"safe", region:null, factors:["중국 최대 부동산 기업 완커 디폴트 우려"], summary:"중국 완커 파산 위기. 한국 경제에 간접 영향 가능성"},
  {id:"11481974", score:48, severity:"caution", region:"전국", factors:["비트코인 하루 8% 급락, 레버리지 청산 1.5조원 규모"], summary:"일본 금리인상+중국 가상자산 억제에 비트코인 8% 급락, 1.5조원 레버리지 청산"},
  {id:"11481981", score:38, severity:"safe", region:null, factors:["스트래티지 파산 마지노선 비트코인 2.3만달러"], summary:"비트코인 최대 보유사 파산 시나리오 분석. 2028년 전환사채 만기 리스크"},
  {id:"11482053", score:62, severity:"warning", region:"전국", factors:["보이스피싱 대응제도 악용 핑돈 사기 기승"], summary:"보이스피싱 대응제도 악용한 신종 핑돈 사기 기승. 금융소비자 피해 우려 확대"},

  // prices
  {id:"11482017", score:74, severity:"warning", region:"전국", factors:["소비자물가 8월 저점 후 오름세 전환", "고환율에 휘발유/경유 가격 급등", "생활비 절감 위해 학원/헬스/외식 포기 확산"], summary:"고물가에 학원비/운동/외식 포기 확산. 소비자물가 재상승에 고환율 겹쳐 생활비 압박 심화"},
  {id:"11482591", score:78, severity:"warning", region:"전국", factors:["11월 소비자물가 전년비 2.4% 상승", "석유류 5.9% 급등", "고환율 1400원대 지속에 수입물가 상승 확산"], summary:"11월 소비자물가 2.4% 상승, 석유류 5.9% 급등. 고환율발 고물가-고금리 3중고 현실화"},
  {id:"11482561", score:76, severity:"warning", region:"전국", factors:["원화 약세 1400원대 지속", "고환율-고물가-고금리 3중고"], summary:"원화 약세 지속에 고환율-고물가-고금리 3중고. 가계 구매력 약화 심화"},
  {id:"11482488", score:63, severity:"warning", region:"전국", factors:["석유/과일/육류 가격 연쇄 인상", "정부 할당관세 인하로 물가 안정 총력"], summary:"석유/과일/육류 가격 연쇄 인상. 정부 할당관세 인하로 물가잡기 총력 대응"},
  {id:"11482882_dup", score:71, severity:"warning", region:"서울", factors:["10월 서울 빌라 월세가격지수 전월비 0.42p 상승"], summary:"서울 빌라 월세가격지수 역대 최고치 경신. 서민/청년층 주거비 부담 확대"},

  // realEstate
  {id:"11482713", score:44, severity:"caution", region:"전국", factors:["분양가상한제 아파트 1순위 경쟁률 13대1"], summary:"분상제 아파트 경쟁률 13대1, 비적용 대비 2.78배. 합리적 분양가 수요 집중"},
  {id:"11483276", score:72, severity:"warning", region:"서울", factors:["10월 서울 빌라 월세가격지수 사상 최고치", "인허가/착공 동반 감소로 공급 공백 우려"], summary:"서울 빌라 월세 사상 최고치, 인허가/착공 동반 감소. 서민 주거비 부담 가중"},
  {id:"11482939", score:16, severity:"safe", region:null, factors:[], summary:"이천 아파트 분양 광고성 기사. 민생 위기 관련도 낮음"},
  {id:"11483526", score:53, severity:"caution", region:"전국", factors:["전세사기/보이스피싱 형량 최대 징역 30년으로 강화"], summary:"전세사기/보이스피싱 엄벌 법안. 서민 대상 사기범죄 억제력 강화 기대"},
  {id:"11483274", score:32, severity:"safe", region:"서울", factors:["여의도 시범아파트 재건축 시공사 3파전"], summary:"여의도 최대 재건축 시공권 경쟁. 시장 동향 보도"},

  // selfEmployed
  {id:"11483363", score:8, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 연예인 아들 군복무 중 영리활동 의혹"},
  {id:"11483369", score:8, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 이경실 아들 폐업 처리 후속 보도"},
  {id:"11483233", score:32, severity:"safe", region:"전국", factors:["AI 기반 맞춤형 정부 지원 정책 추천 서비스 출시"], summary:"AI로 맞춤형 정책 추천 서비스 출시. 실업급여/정부지원금 접근성 개선"},
  {id:"11483352", score:34, severity:"safe", region:null, factors:["쿠팡 개인정보 유출 사태에 대한 기업가 정신 비판"], summary:"쿠팡 개인정보 유출 사설. 대형 플랫폼 기업의 소상공인 생태계 영향 논의"},
  {id:"11482842", score:12, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 충남TP 입주기업 코스닥 상장 성과"},

  // === 12/3 ===
  // employment
  {id:"11483479", score:14, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 직접 관련 낮음. 공황장애 관련 드라마 사회적 주목"},
  {id:"11483557", score:52, severity:"caution", region:"전국", factors:["민주당 8~12년 단계적 정년연장안 제시"], summary:"여당 8~12년 단계적 정년연장 법안 추진. 고령층 고용 안정 기대, 청년 고용 영향 우려"},
  {id:"11483388", score:34, severity:"safe", region:"경기", factors:["경기 가평군 3년만에 소아청소년과 신설"], summary:"가평군 3년만에 소아과 신설. 지역 의료 공백 해소, 긍정적 변화"},
  {id:"11483433", score:72, severity:"warning", region:"전국", factors:["은행 깡통대출(무수익여신) 급증", "ELS 부실판매 과징금 폭탄"], summary:"은행 깡통대출 급증에 ELS 과징금까지. 은행 건전성 관리 비상"},
  {id:"11483584", score:18, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 간접 관련. 미국 P&G 주가 하락"},

  // finance (12/3)
  {id:"11483493", score:28, severity:"safe", region:null, factors:["은행주 배당소득 분리과세 확정"], summary:"은행주 배당 기대감 상승. 정책 모멘텀에 투자 심리 개선"},
  {id:"11483702", score:58, severity:"caution", region:"전국", factors:["중기 대출금리 1년새 1%p 하락, 시장금리와 역행"], summary:"중소기업 대출금리 시장금리와 역행해 1%p 하락. 생산적 금융 실효성 의문"},
  {id:"11483533", score:22, severity:"safe", region:null, factors:[], summary:"비트코인 회복세 속 트럼프 관련 코인주 하락. 가상자산 투자 동향"},
  {id:"11483743", score:71, severity:"warning", region:"전국", factors:["5대은행 기업 무수익여신 올해 20% 증가", "기업 부문 연체율 확대"], summary:"5대은행 기업 깡통대출 20% 급증, 연체율 동반 상승. 건전성 비상"},

  // prices (12/3)
  {id:"11482670", score:77, severity:"warning", region:"전국", factors:["귤 26%, 사과 21%, 쌀값 18% 급등", "생활물가 16개월래 최대 상승"], summary:"귤 26%/사과 21%/쌀값 18% 급등, 생활물가 16개월래 최대 상승"},
  {id:"11482413", score:8, severity:"safe", region:null, factors:[], summary:"배정 카테고리(물가)와 직접 관련 낮음. 매경 뉴스 종합 요약"},
  {id:"11483020", score:22, severity:"safe", region:null, factors:[], summary:"명품 브랜드 가격 인상 속 백화점 고급화 전략. 일반 소비자 체감 제한적"},
  {id:"11483043", score:36, severity:"safe", region:"전국", factors:["폐업 소상공인 수당 소득세 22% 부과 문제 해결"], summary:"폐업 수당/교육수당 소득세 폐지 추진. 소상공인 지원 확대, 긍정적 변화"},

  // === 12/4 ===
  // employment
  {id:"11484718", score:18, severity:"safe", region:null, factors:[], summary:"쿠팡 대관 영입 논란. 고용 관련도 낮음"},
  {id:"11484682", score:18, severity:"safe", region:null, factors:[], summary:"쿠팡 퇴직 공직자 대규모 영입 논란"},
  {id:"11484518", score:18, severity:"safe", region:null, factors:[], summary:"쿠팡 경찰 출신 영입 중복 보도"},
  {id:"11484349", score:56, severity:"caution", region:"경기", factors:["경기/대전/충남 학교 1147곳 급식 중단", "학교 비정규직 2차 릴레이 총파업"], summary:"비정규직 총파업으로 학교 1147곳 급식 중단. 학생/학부모 생활 직격탄"},
  {id:"11483809", score:14, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 간접 관련. 미국 고용 부진 뉴욕증시 동향"},

  // finance (12/4)
  {id:"11484461", score:73, severity:"warning", region:"전국", factors:["재파산자 5년새 2배 급증", "파산 면책 후 재파산 87%가 50대 이상"], summary:"재파산자 5년새 2배 급증, 87%가 50대 이상. 취약층 빈곤 고착화 심화"},
  {id:"11484456", score:54, severity:"caution", region:"전국", factors:["저축은행 순이익 65% 상위5개사 쏠림", "서울이 순익 85% 독식"], summary:"저축은행 서울 순익 85% 독식, 지방 양극화 심화"},
  {id:"11484562", score:42, severity:"caution", region:"전국", factors:["벨기에 부동산펀드 900억 전액 손실 사태"], summary:"해외 부동산펀드 900억 전액 손실, 투자자 보호 강화 조치"},
  {id:"11484665", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(금융)와 직접 관련 낮음. 전 의원 불법 정치자금 판결"},
  {id:"11484734", score:73, severity:"warning", region:"전국", factors:["재파산 신청 5년새 2배 증가", "면책 후 재파산 87% 50대 이상"], summary:"빚의 악순환 심화, 재파산자 5년새 2배. 고령 취약층 재기 불가능 고착화"},

  // prices (12/4)
  {id:"11483794", score:68, severity:"warning", region:"전국", factors:["해외IB 한국 물가 전망 2%에서 2.1%로 상향", "수입물가 상승 연쇄 반응"], summary:"해외IB 한국 물가 전망 일제히 상향. 고환율발 수입물가 상승 우려"},
  {id:"11484713", score:32, severity:"safe", region:null, factors:["유럽 산업 전기료 미국의 2배 수준"], summary:"유럽 에너지 정책 역효과로 전기료 폭등. 한국 에너지 정책 참고 사례"},
  {id:"11483959", score:72, severity:"warning", region:"전국", factors:["월급 3% 인상 시 소득세 9% 추가 부담", "사회보험료 연 4.3% 상승"], summary:"월급 3% 오를 때 소득세 9% 더 징수. 실질소득 감소 심화"},
  {id:"11484506", score:58, severity:"caution", region:"전국", factors:["대통령 고물가 민생 부담 직접 언급"], summary:"대통령 고물가 민생 부담 직접 언급, 담합 점검 지시. 물가 심각성 인식 반영"},
  {id:"11484678", score:22, severity:"safe", region:"서울", factors:["강남4구 증여세 전수조사 2077건"], summary:"강남 아파트 증여 탈세 단속. 부유층 세금 회피 이슈"},

  // realEstate (12/4)
  {id:"11484365", score:71, severity:"warning", region:"서울", factors:["사회초년생 월세 100만원 부담", "소형 오피스텔 월세 상승률 확대"], summary:"사회초년생 월세 100만원 시대. 오피스텔/빌라 월세 급등"},
  {id:"11484261", score:74, severity:"warning", region:"서울", factors:["서울 내 집 마련 9.7년, 전세 5.5년 소요"], summary:"서울 내 집 마련 월급 9.7년치, 전세도 5.5년. 주거 부담 심화"},
  {id:"11484387", score:12, severity:"safe", region:null, factors:[], summary:"배정 카테고리(부동산)와 직접 관련 낮음. 방송인 경제 인터뷰"},
  {id:"11484409", score:67, severity:"warning", region:"전국", factors:["11월 전국 민간 아파트 평당 분양가 2700만원 돌파"], summary:"전국 아파트 분양가 평당 2700만원 돌파. 분양가 상승 브레이크 없음"},
  {id:"11484055", score:66, severity:"warning", region:"전국", factors:["전국 전용 59m2 분양가 5억 초과", "수도권 국민평형 11억 초과"], summary:"전국 소형 분양가 5억 돌파, 수도권 국평 11억. 내 집 마련 문턱 상승"},

  // selfEmployed (12/4)
  {id:"11484421", score:63, severity:"warning", region:"전국", factors:["쿠팡 불매에 입점 소상공인 매출 반토막"], summary:"쿠팡 유출 사태 후 불매운동에 소상공인/배달기사 매출 급감"},
  {id:"11483853", score:8, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 퍼시스그룹 채용 공고"},
  {id:"11484427", score:57, severity:"caution", region:"전국", factors:["내년 국민연금 보험료율 9%에서 9.5%로 인상", "월소득 300만원 자영업자 연 18만원 추가 부담"], summary:"내년 국민연금 보험료 0.5%p 인상. 자영업자 부담 증가"},
  {id:"11484576", score:62, severity:"warning", region:"전국", factors:["쿠팡 유출에 이츠 입점 음식점/배송기사 직격탄"], summary:"쿠팡 사태에 입점업체/음식점/택배기사 줄비명"},
  {id:"11484534", score:12, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 동원그룹 HMM 인수"},

  // === 12/5 ===
  // employment
  {id:"11484990", score:62, severity:"warning", region:"전국", factors:["아모레퍼시픽 5년만에 희망퇴직 실시"], summary:"아모레퍼시픽 5년만에 희망퇴직 단행. 화장품업계 구조조정 신호"},
  {id:"11484753", score:18, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 간접 관련. 미국 메타 메타버스 구조조정"},
  {id:"11485354", score:44, severity:"caution", region:"전국", factors:["AI 인간 고유 영역 대체 가속"], summary:"AI 인간 대체 영역 확대, 창작 분야까지. 고용 구조 변화 가속"},
  {id:"11485530", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 직접 관련 낮음. 전직 판사 작가 인터뷰"},
  {id:"11485460", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(고용)와 직접 관련 낮음. 전직 판사 드라마 인터뷰"},

  // finance (12/5)
  {id:"11485452", score:38, severity:"safe", region:null, factors:["일본 국채금리 2007년 이후 최고치"], summary:"일본 장기금리 18년만에 최고치. 글로벌 금리환경 변화"},
  {id:"11484737", score:54, severity:"caution", region:"전국", factors:["저축은행 상위5개사 이익 65% 독식"], summary:"저축은행 양극화 심화, 지방 경영난. 지역 서민금융 위축 우려"},
  {id:"11484973", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(금융)와 직접 관련 낮음. 씨젠 프랑스 법인 설립"},
  {id:"11485387", score:14, severity:"safe", region:null, factors:[], summary:"배정 카테고리(금융)와 직접 관련 낮음. 알테오젠 주가 하락"},

  // prices (12/5)
  {id:"11485579", score:34, severity:"safe", region:null, factors:["일본 고물가에 금리인상 움직임"], summary:"일본 물가 쇼크에 금리인상. 글로벌 인플레 동향"},
  {id:"11485211", score:8, severity:"safe", region:null, factors:[], summary:"배정 카테고리(물가)와 직접 관련 낮음. 리조트 리파이낸싱"},
  {id:"11485202", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(물가)와 직접 관련 낮음. 레고 매장 오픈"},
  {id:"11485073", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(물가)와 직접 관련 낮음. 면세점 협업"},
  {id:"11485065", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(물가)와 직접 관련 낮음. 패션 팝업스토어"},

  // realEstate (12/5)
  {id:"11485319", score:48, severity:"caution", region:"울산", factors:["울산 아파트 매매/전세가 동반 상승세"], summary:"울산 아파트 강세. 수도권 규제 반사효과에 지방 집값 상승 확산"},
  {id:"11485578", score:62, severity:"warning", region:"서울", factors:["내년 서울 분양 7300가구, 평년의 절반 수준"], summary:"내년 서울 분양 7300가구로 평년의 절반. 공급 부족 구조적"},
  {id:"11485430", score:61, severity:"warning", region:"서울", factors:["서울 분양 올해 2배이나 평년 대비 반토막"], summary:"서울 분양 올해 대비 2배이나 평년의 절반. 공급 정상화까지 멀어"},
  {id:"11485536", score:67, severity:"warning", region:"서울", factors:["10.15 대책 이후 서울 집값 상승폭 재확대"], summary:"서울 강남/한강벨트 집값 상승폭 재확대. 후속 대책 필요성 대두"},
  {id:"11485289", score:52, severity:"caution", region:"서울", factors:["반포/방배/노량진 청약 100대1 경쟁률"], summary:"서울 주요지역 청약 100대1 기본. 공급 부족에 수요 폭발"},

  // selfEmployed (12/5)
  {id:"11484373", score:58, severity:"caution", region:"전국", factors:["배달 전문점 시대 종말론 확산", "12평 국밥집 월 2.7억 매출 사례"], summary:"배달업 시장 붕괴 속 오프라인 전환 성공 사례. 배달 수수료 부담 반영"},
  {id:"11485240", score:32, severity:"safe", region:"전국", factors:["소상공인 전기화물차 보급 협약"], summary:"소상공인 전기화물차 보급 추진. 물류비 절감 지원 긍정적"},
  {id:"11485404", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 기아 80년사"},
  {id:"11485254", score:6, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 중소기업 재단 기부"},
  {id:"11484912", score:4, severity:"safe", region:null, factors:[], summary:"배정 카테고리(자영업)와 직접 관련 낮음. 방송인 조폭 연루설"},
];

const stmt = db.prepare(
  "UPDATE analysis SET risk_score=?, severity=?, key_factors=?, impact_region=?, ai_summary=? WHERE article_id=?"
);

let updated = 0;
let skipped = 0;
const txn = db.transaction(() => {
  for (const u of updates) {
    if (u.id.includes("_dup")) { skipped++; continue; }
    const r = stmt.run(u.score, u.severity, JSON.stringify(u.factors), u.region, u.summary, u.id);
    if (r.changes > 0) updated++;
    else skipped++;
  }
});
txn();
console.log(`12/2~5 업데이트 완료: ${updated}건 수정, ${skipped}건 스킵`);

db.close();
