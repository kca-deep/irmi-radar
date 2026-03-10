/* ============================================================
   IRMI COMMAND CENTER — Interactions & Animations
   ============================================================ */

// --- Mock Data ---
const MOCK = {
  overallScore: 67,
  lastUpdated: "2026-03-10 09:30",
  categories: [
    { key: "prices", label: "물가", score: 72, trend: "rising", color: "#5b8def" },
    { key: "employment", label: "고용", score: 58, trend: "stable", color: "#00c9a7" },
    { key: "selfEmployed", label: "자영업", score: 81, trend: "rising", color: "#ff8a5c" },
    { key: "finance", label: "금융", score: 45, trend: "falling", color: "#a78bfa" },
    { key: "realEstate", label: "부동산", score: 63, trend: "rising", color: "#34d399" },
  ],
  stats: { critical: 3, warning: 8, caution: 12, safe: 24 },
  signals: [
    {
      id: 1, title: "소상공인 폐업률 급증 경보",
      desc: "수도권 자영업 폐업률이 전월 대비 23% 증가, 특히 음식점업 집중 발생",
      severity: "critical", category: "자영업", region: "서울", articles: 15,
      date: "2026-03-10"
    },
    {
      id: 2, title: "소비자물가 6개월 연속 상승세",
      desc: "식료품 및 공공요금 중심 물가 상승 지속, 서민 생활비 부담 가중",
      severity: "warning", category: "물가", region: "전국", articles: 22,
      date: "2026-03-09"
    },
    {
      id: 3, title: "전세 보증금 반환 지연 확산",
      desc: "수도권 외곽 지역 전세 보증금 미반환 사례 급증, 세입자 피해 우려",
      severity: "warning", category: "부동산", region: "경기", articles: 11,
      date: "2026-03-09"
    },
    {
      id: 4, title: "청년 실업률 소폭 반등",
      desc: "IT 업종 구조조정 여파로 20대 후반~30대 초반 구직난 심화",
      severity: "caution", category: "고용", region: "전국", articles: 8,
      date: "2026-03-08"
    },
    {
      id: 5, title: "가계부채 연체율 상승 추이",
      desc: "고금리 장기화에 따른 변동금리 대출 연체율 0.3%p 상승",
      severity: "warning", category: "금융", region: "전국", articles: 14,
      date: "2026-03-08"
    },
    {
      id: 6, title: "배달앱 수수료 인상 논란",
      desc: "주요 배달 플랫폼 수수료 일제 인상, 소상공인 수익성 악화 우려",
      severity: "caution", category: "자영업", region: "전국", articles: 9,
      date: "2026-03-07"
    },
  ],
  news: [
    { id: 1, title: "서울 자영업 폐업률 역대 최고... 음식점 10곳 중 3곳 문 닫아", cat: "selfEmployed", excerpt: "통계청 발표에 따르면 서울 지역 자영업 폐업률이 역대 최고치를 기록했다. 특히 음식점업의 폐업률이 전년 대비 31% 증가하며 심각한 수준에 이르렀다.", tags: ["폐업률", "음식점", "서울"], date: "2026-03-10", featured: true },
    { id: 2, title: "3월 소비자물가 4.2% 상승, 식료품이 견인", cat: "prices", excerpt: "3월 소비자물가지수가 전년 동월 대비 4.2% 상승했다. 채소류와 과일류 가격이 각각 18%, 12% 급등하며 장바구니 물가 부담이 커졌다.", tags: ["소비자물가", "식료품", "인플레이션"], date: "2026-03-09", featured: false },
    { id: 3, title: "전세 사기 피해자 지원법 국회 통과", cat: "realEstate", excerpt: "전세 사기 피해자 특별지원법이 국회 본회의를 통과했다. 피해자들에 대한 긴급 주거지원과 보증금 반환 촉진 방안이 포함되었다.", tags: ["전세사기", "입법", "주거지원"], date: "2026-03-09", featured: false },
    { id: 4, title: "IT 대기업 구조조정 본격화, 2000명 규모 감원", cat: "employment", excerpt: "국내 주요 IT 대기업들이 경영 효율화를 위한 대규모 구조조정에 나섰다. 업계 전체적으로 약 2000명 규모의 인력 감축이 예상된다.", tags: ["구조조정", "IT업계", "고용"], date: "2026-03-08", featured: false },
    { id: 5, title: "한은 기준금리 동결, '당분간 긴축 유지' 시사", cat: "finance", excerpt: "한국은행이 기준금리를 3.5%로 동결했다. 이창용 총재는 물가 안정이 확인될 때까지 현 수준의 긴축 기조를 유지하겠다고 밝혔다.", tags: ["기준금리", "한국은행", "통화정책"], date: "2026-03-08", featured: false },
    { id: 6, title: "수도권 아파트 매매가 6주 연속 하락", cat: "realEstate", excerpt: "수도권 아파트 매매가격이 6주 연속 하락세를 이어갔다. 거래 절벽 속에 급매물 위주로만 거래가 이뤄지고 있다.", tags: ["아파트", "매매가", "하락"], date: "2026-03-07", featured: false },
    { id: 7, title: "최저임금 인상 후폭풍, 소규모 사업장 인건비 부담 가중", cat: "selfEmployed", excerpt: "올해 최저임금 인상의 후폭풍이 거세다. 5인 미만 소규모 사업장의 인건비 부담이 전년 대비 15% 증가한 것으로 나타났다.", tags: ["최저임금", "인건비", "소상공인"], date: "2026-03-07", featured: false },
    { id: 8, title: "가계부채 1900조 돌파, 연체율도 동반 상승", cat: "finance", excerpt: "가계부채 총액이 1900조원을 돌파하며 사상 최대를 기록했다. 고금리 장기화로 변동금리 대출의 연체율도 함께 상승 추세를 보이고 있다.", tags: ["가계부채", "연체율", "금리"], date: "2026-03-06", featured: false },
    { id: 9, title: "공공요금 줄인상 예고, 전기-가스-수도 모두 오른다", cat: "prices", excerpt: "4월부터 전기요금, 도시가스, 수도요금이 일제히 인상될 예정이다. 정부는 원가 회복을 위한 불가피한 조치라고 설명했다.", tags: ["공공요금", "전기요금", "가스요금"], date: "2026-03-06", featured: false },
  ],
  briefing: [
    "[IRMI 분석 보고서] 2026년 3월 10일 09:30 기준",
    "",
    "종합 위기 지수가 67점(주의 등급)으로 전주 대비 +4점 상승했습니다.",
    "",
    "자영업 부문이 81점으로 가장 높은 위험도를 보이고 있으며, 특히 수도권 음식점업 폐업률 급증이 핵심 리스크입니다.",
    "",
    "물가 부문(72점)은 식료품 가격 상승과 4월 공공요금 인상 예고로 추가 상승 압력이 존재합니다.",
    "",
    "금융 부문은 기준금리 동결로 안정세이나, 가계부채 1900조 돌파와 연체율 상승이 중기 리스크 요인입니다.",
    "",
    ">> 권고: 자영업 폐업 지원 정책 강화 및 물가 안정 대책 모니터링 필요",
  ],
  ticker: [
    { text: "소상공인 폐업률 역대 최고치 경신", severity: "critical" },
    { text: "소비자물가 4.2% 상승 6개월 연속", severity: "warning" },
    { text: "전세 보증금 반환 지연 수도권 확산", severity: "warning" },
    { text: "IT 대기업 구조조정 2000명 규모", severity: "caution" },
    { text: "가계부채 1900조 돌파 사상 최대", severity: "warning" },
    { text: "4월 공공요금 줄인상 예고", severity: "caution" },
  ],
};

// --- DOM Ready ---
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  renderDashboard();
  renderSignals();
  renderNews();
  renderTicker();
  initIntersectionObserver();
  initCardTilt();
});

// --- Tab Navigation ---
function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  const indicator = document.querySelector(".tab-indicator");

  function activate(tabId) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
    panels.forEach((p) => p.classList.toggle("active", p.id === tabId));
    updateIndicator(tabId);
  }

  function updateIndicator(tabId) {
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!activeBtn || !indicator) return;
    indicator.style.width = activeBtn.offsetWidth + "px";
    indicator.style.transform = `translateX(${activeBtn.offsetLeft - activeBtn.parentElement.offsetLeft - 3}px)`;
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.dataset.tab));
  });

  // init from hash or default
  const hash = location.hash.replace("#", "") || "dashboard";
  activate(hash);

  // resize recalc
  window.addEventListener("resize", () => {
    const active = document.querySelector(".tab-btn.active");
    if (active) updateIndicator(active.dataset.tab);
  });
}

// --- Dashboard ---
function renderDashboard() {
  animateGauge();
  renderBriefing();
  renderCategoryBars();
  renderStats();
  renderRecentSignals();
}

function animateGauge() {
  const score = MOCK.overallScore;
  const circumference = 2 * Math.PI * 90;
  const fill = document.querySelector(".gauge-fill");
  const valueEl = document.querySelector(".gauge-center-value");
  const statusDot = document.querySelector(".gauge-status-dot");
  const statusText = document.querySelector(".gauge-status-text");

  if (!fill) return;

  fill.style.strokeDasharray = circumference;
  fill.style.strokeDashoffset = circumference;

  const color = getScoreColor(score);
  fill.style.stroke = color;
  if (statusDot) { statusDot.style.background = color; statusDot.style.boxShadow = `0 0 10px ${color}`; }

  const severity = getSeverityLabel(score);
  if (statusText) statusText.textContent = severity;

  // animate after small delay
  requestAnimationFrame(() => {
    setTimeout(() => {
      const offset = circumference - (score / 100) * circumference;
      fill.style.strokeDashoffset = offset;
    }, 200);
  });

  // count up
  animateValue(valueEl, 0, score, 2000);

  // updated time
  const updatedEl = document.querySelector(".gauge-updated");
  if (updatedEl) updatedEl.textContent = `Last update: ${MOCK.lastUpdated}`;
}

function renderBriefing() {
  const body = document.querySelector(".briefing-body");
  if (!body) return;

  body.innerHTML = "";
  let totalDelay = 0;
  MOCK.briefing.forEach((line, i) => {
    const div = document.createElement("div");
    div.className = "line";
    div.style.animationDelay = `${totalDelay}ms`;

    if (line.startsWith(">>")) {
      div.innerHTML = `<span class="briefing-highlight">${line}</span>`;
    } else if (line.startsWith("[")) {
      div.innerHTML = `<span class="briefing-prompt">$</span>${line}`;
    } else if (line === "") {
      div.innerHTML = "&nbsp;";
    } else {
      div.textContent = line;
    }

    body.appendChild(div);
    totalDelay += line === "" ? 100 : 150;
  });

  // cursor at end
  const cursor = document.createElement("span");
  cursor.className = "briefing-cursor";
  body.lastElementChild?.appendChild(cursor);
}

function renderCategoryBars() {
  const grid = document.querySelector(".category-grid");
  if (!grid) return;

  grid.innerHTML = "";
  MOCK.categories.forEach((cat) => {
    const trendIcon = cat.trend === "rising"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17l5-5 5 5M7 7l5 5 5-5"/></svg>'
      : cat.trend === "falling"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l5 5 5-5M7 17l5-5 5 5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>';

    const trendLabel = cat.trend === "rising" ? "상승" : cat.trend === "falling" ? "하락" : "안정";
    const severityColor = getScoreColor(cat.score);

    const card = document.createElement("div");
    card.className = "cat-card fade-in";
    card.style.setProperty("--cat-color", cat.color);
    card.innerHTML = `
      <div class="cat-label">${cat.label}</div>
      <div class="cat-score" style="color:${severityColor};text-shadow:0 0 16px ${severityColor}44" data-target="${cat.score}">0</div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="background:${cat.color}" data-width="${cat.score}%"></div>
      </div>
      <div class="cat-trend" style="color:${cat.trend === 'rising' ? '#ff9500' : cat.trend === 'falling' ? '#30d158' : '#7b89a8'}">
        ${trendIcon} ${trendLabel}
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderStats() {
  const row = document.querySelector(".stats-row");
  if (!row) return;

  const levels = [
    { key: "critical", label: "긴급", value: MOCK.stats.critical },
    { key: "warning", label: "주의", value: MOCK.stats.warning },
    { key: "caution", label: "관찰", value: MOCK.stats.caution },
    { key: "safe", label: "안전", value: MOCK.stats.safe },
  ];

  row.innerHTML = "";
  levels.forEach((l) => {
    const card = document.createElement("div");
    card.className = `stat-card ${l.key} fade-in`;
    card.innerHTML = `
      <div class="stat-value" data-target="${l.value}">0</div>
      <div class="stat-label">${l.label}</div>
    `;
    row.appendChild(card);
  });
}

function renderRecentSignals() {
  const container = document.querySelector(".signals-preview");
  if (!container) return;

  container.innerHTML = "";
  MOCK.signals.slice(0, 3).forEach((s) => {
    const card = document.createElement("div");
    card.className = "signal-card fade-in";
    card.innerHTML = `
      <div class="signal-severity ${s.severity}">${getSeverityLabel(null, s.severity)}</div>
      <div class="signal-title">${s.title}</div>
      <div class="signal-desc">${s.desc}</div>
      <div class="signal-meta">
        <span class="signal-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
          ${s.category}
        </span>
        <span class="signal-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${s.date}
        </span>
        <span class="signal-meta-item">관련기사 ${s.articles}건</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- Signals Tab ---
function renderSignals() {
  renderSignalFilters();
  renderSignalList();
  renderMap();
}

function renderSignalFilters() {
  const bar = document.querySelector("#signals .filter-bar");
  if (!bar) return;

  const filters = ["전체", "긴급", "주의", "관찰", "물가", "고용", "자영업", "금융", "부동산"];
  bar.innerHTML = "";
  filters.forEach((f, i) => {
    const chip = document.createElement("button");
    chip.className = `filter-chip${i === 0 ? " active" : ""}`;
    chip.textContent = f;
    chip.addEventListener("click", () => {
      bar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
    });
    bar.appendChild(chip);
  });
}

function renderSignalList() {
  const list = document.querySelector(".signals-list");
  if (!list) return;

  list.innerHTML = "";
  MOCK.signals.forEach((s) => {
    const item = document.createElement("div");
    item.className = "signal-list-item fade-in";
    item.innerHTML = `
      <div class="severity-indicator ${s.severity}"></div>
      <div>
        <div class="signal-list-title">${s.title}</div>
        <div class="signal-list-sub">
          <span>${s.category}</span>
          <span>${s.region}</span>
          <span>${s.date}</span>
        </div>
      </div>
      <div class="signal-list-count">
        <div style="font-weight:700;font-size:16px">${s.articles}</div>
        <div>기사</div>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderMap() {
  // Simplified Korea map paths
  const mapSvg = document.querySelector(".map-svg");
  if (!mapSvg) return;

  const regions = [
    { name: "서울", d: "M145,95 L160,90 L170,100 L165,112 L150,110 Z", severity: "critical" },
    { name: "경기", d: "M125,75 L175,70 L185,95 L180,125 L140,130 L120,110 Z", severity: "warning" },
    { name: "인천", d: "M115,90 L130,85 L135,100 L125,108 L110,105 Z", severity: "caution" },
    { name: "강원", d: "M175,55 L230,50 L240,90 L220,120 L180,110 L175,75 Z", severity: "" },
    { name: "충북", d: "M155,125 L195,120 L200,150 L170,155 L150,145 Z", severity: "" },
    { name: "충남", d: "M100,130 L155,125 L150,155 L120,165 L90,155 Z", severity: "caution" },
    { name: "대전", d: "M140,155 L160,152 L162,168 L145,170 Z", severity: "" },
    { name: "세종", d: "M133,145 L148,142 L150,155 L138,158 Z", severity: "" },
    { name: "전북", d: "M90,165 L140,160 L145,195 L95,200 L80,185 Z", severity: "" },
    { name: "전남", d: "M75,200 L130,195 L140,240 L90,260 L60,235 Z", severity: "" },
    { name: "광주", d: "M95,215 L115,212 L118,228 L100,230 Z", severity: "" },
    { name: "경북", d: "M180,120 L240,115 L250,170 L200,180 L175,160 Z", severity: "" },
    { name: "대구", d: "M195,170 L220,165 L225,185 L200,190 Z", severity: "" },
    { name: "경남", d: "M160,190 L225,185 L230,230 L170,240 L145,220 Z", severity: "warning" },
    { name: "부산", d: "M225,225 L250,220 L255,245 L235,250 Z", severity: "" },
    { name: "울산", d: "M240,190 L265,185 L268,210 L245,215 Z", severity: "" },
    { name: "제주", d: "M100,290 L160,285 L165,310 L105,315 Z", severity: "" },
  ];

  mapSvg.setAttribute("viewBox", "40 30 260 300");
  mapSvg.innerHTML = "";

  regions.forEach((r) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", r.d);
    if (r.severity) path.classList.add(`region-${r.severity}`);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = r.name;
    path.appendChild(title);

    path.addEventListener("mouseenter", () => {
      path.style.filter = "brightness(1.4)";
    });
    path.addEventListener("mouseleave", () => {
      path.style.filter = "";
    });

    mapSvg.appendChild(path);
  });
}

// --- News Tab ---
function renderNews() {
  renderNewsTags();
  renderNewsCards();
}

function renderNewsTags() {
  const tagContainer = document.querySelector(".news-tags");
  if (!tagContainer) return;

  const cats = [
    { key: "all", label: "전체" },
    { key: "prices", label: "물가" },
    { key: "employment", label: "고용" },
    { key: "selfEmployed", label: "자영업" },
    { key: "finance", label: "금융" },
    { key: "realEstate", label: "부동산" },
  ];

  tagContainer.innerHTML = "";
  cats.forEach((c, i) => {
    const chip = document.createElement("button");
    chip.className = `filter-chip${i === 0 ? " active" : ""}`;
    chip.textContent = c.label;
    chip.dataset.cat = c.key;
    chip.addEventListener("click", () => {
      tagContainer.querySelectorAll(".filter-chip").forEach((ch) => ch.classList.remove("active"));
      chip.classList.add("active");
      filterNews(c.key);
    });
    tagContainer.appendChild(chip);
  });
}

function renderNewsCards() {
  const grid = document.querySelector(".news-bento");
  if (!grid) return;

  grid.innerHTML = "";
  MOCK.news.forEach((n) => {
    const card = document.createElement("div");
    card.className = `news-card fade-in${n.featured ? " featured" : ""}`;
    card.dataset.cat = n.cat;
    card.innerHTML = `
      <div class="news-card-cat ${n.cat}">${getCatLabel(n.cat)}</div>
      <div class="news-card-title">${n.title}</div>
      <div class="news-card-excerpt">${n.excerpt}</div>
      <div class="news-card-tags">${n.tags.map((t) => `<span class="news-tag">#${t}</span>`).join("")}</div>
      <div class="news-card-footer">
        <span>${n.date}</span>
        <span style="color:var(--cyan);font-weight:600;font-size:9px;text-transform:uppercase;letter-spacing:0.05em">Read more</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterNews(cat) {
  const cards = document.querySelectorAll(".news-card");
  cards.forEach((card) => {
    if (cat === "all" || card.dataset.cat === cat) {
      card.style.display = "";
      card.style.opacity = "0";
      requestAnimationFrame(() => { card.style.opacity = "1"; });
    } else {
      card.style.display = "none";
    }
  });
}

// --- Ticker ---
function renderTicker() {
  const content = document.querySelector(".ticker-content");
  if (!content) return;

  const items = MOCK.ticker.map((t) =>
    `<span><span class="ticker-dot ${t.severity}"></span>${t.text}</span>`
  ).join("");

  // duplicate for seamless loop
  content.innerHTML = items + items;
}

// --- Intersection Observer (fade in + count up) ---
function initIntersectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");

          // Trigger count-up for data-target elements within
          entry.target.querySelectorAll("[data-target]").forEach((el) => {
            const target = parseInt(el.dataset.target);
            if (!el.dataset.animated) {
              el.dataset.animated = "1";
              animateValue(el, 0, target, 1500);
            }
          });

          // Trigger bar fills
          entry.target.querySelectorAll("[data-width]").forEach((el) => {
            el.style.width = el.dataset.width;
          });

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
}

// --- Card 3D Tilt ---
function initCardTilt() {
  document.querySelectorAll(".news-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// --- Utilities ---
function getScoreColor(score) {
  if (score >= 80) return "#ff2d55";
  if (score >= 60) return "#ff9500";
  if (score >= 40) return "#ffd60a";
  return "#30d158";
}

function getSeverityLabel(score, key) {
  if (key) {
    const labels = { critical: "긴급", warning: "주의", caution: "관찰", safe: "안전" };
    return labels[key] || key;
  }
  if (score >= 80) return "긴급";
  if (score >= 60) return "주의";
  if (score >= 40) return "관찰";
  return "안전";
}

function getCatLabel(key) {
  const labels = { prices: "물가", employment: "고용", selfEmployed: "자영업", finance: "금융", realEstate: "부동산" };
  return labels[key] || key;
}

function animateValue(el, start, end, duration) {
  if (!el) return;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.round(start + (end - start) * eased);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}
