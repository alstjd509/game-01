// ============================================================================
// 「한 칸 더」 튜닝 테이블 (정본)
// - 여기 수치를 바꾸면 docs/04_시스템_명세.md §3 표를 같은 작업에서 갱신할 것.
// - 최초 가설의 근거는 docs/03_한칸더_기획.md §2~§3 (동결 문서).
// ============================================================================
window.HK = window.HK || {};

HK.CFG = {
  // --- 맵·렌더 ---
  COLS: 9, ROWS: 64,        // 맵 크기. 0행은 지표(파인 상태로 시작)
  TILE: 44, HUD_H: 64,      // 타일 픽셀, 상단 HUD 높이(이 영역 클릭은 게임 입력 무시)

  // --- 산소 (턴 자원) ---
  O2_BASE: 30,              // 시작 산소
  O2_PER_TANK: 10,          // 산소통 1레벨당 최대 산소 증가량
  MOVE_COST: 1,             // 이미 파인 칸으로 이동
  DIRT_COST: 1,             // 흙·광물·가스 굴착 (가스는 아래 페널티가 추가됨)
  STONE_COST_BY_PICK: [3, 2, 1], // 곡괭이 Lv0/1/2일 때 돌 굴착 비용
  HARDROCK_COST: 4,         // 단단한 암반 굴착 비용 (콘텐츠 2단계)
  PICK_REQ_HARDROCK: 2,     // 암반을 팔 수 있는 최소 곡괭이 레벨 — 미만이면 굴착 자체가 불가(하드 게이트)

  // --- 리스크·정산 ---
  GAS_PENALTY: 8,           // 가스 타일을 팠을 때 추가 산소 손실
  COLLAPSE_PENALTY: 15,     // 붕괴 타일을 팠을 때 추가 산소 손실 (2층부터 등장, 콘텐츠 1단계)
  DEATH_KEEP_BY_BAG: [0.3, 0.5, 0.7], // 가방 Lv0/1/2일 때 사망 시 수확 유지 비율(내림) — 즉 손실 70%→50%→30% (콘텐츠 5단계)
  O2_CAPSULE: 10,           // 산소 캡슐 회복량 (최대 산소 초과 불가)
  CAPSULE_PROB: 0.025,      // 산소 캡슐 생성 확률 (전 층 공통, 깊이 무관)

  // --- 광물 가치(G) ---
  VALUE: { copper: 1, silver: 3, gold: 8, gem: 20 }, // 보석: 심부 극희귀 유혹 장치 (콘텐츠 4단계)

  // --- 암흑 (콘텐츠 4단계) ---
  LAMP_REQ_DARK: 2,         // 암흑 층에서 광물·캡슐이 보이려면 필요한 램프 레벨 (유물은 항상 보임)

  // --- 스캐너 (콘텐츠 5단계) ---
  SCAN_RANGE: 2,            // 발동 시 공개 반경 (2 = 5×5)
  SCAN_REVEAL_MS: 3000,     // 위험 공개 지속 시간

  // --- 색상 (그레이박스: 도형만 사용) ---
  // 주의: 가스·붕괴 타일은 그 층의 흙 색(STRATA.dirtColor)을 그대로 쓴다 = "숨은 위험"이 규칙의 핵심
  // (아래 dirt는 레거시 참조용 — 실제 흙 색은 층별 STRATA.dirtColor가 정본)
  COLORS: {
    surface: 0x2e5d3a, dirt: 0x6e5a3e, stone: 0x868c96, hardrock: 0x3e4550, empty: 0x232630,
    copper: 0xc1763f, silver: 0xd7dce4, gold: 0xffd23f, gem: 0xff6ad5, capsule: 0x63d8b2,
    relic: 0xc77dff, player: 0x48c7e8, hudBg: 0x0d0f13,
  },

  // 암반 게이트(콘텐츠 2단계): 심부 진입을 곡괭이 진척에 묶는 벽 (docs/05 §3)
  // fullRow는 전부 암반(우회 불가), mixedRows는 mixedProb 확률로 암반 섞음
  HARDROCK_GATE: { fullRow: 39, mixedRows: [38, 40], mixedProb: 0.35 },

  // 유물(콘텐츠 3단계, docs/05 §1): 깊이 단계별 고정 위치. 회수 전까지 매 런 같은 자리에 생성.
  // 들고 "귀환해야" 확정 — 사망하면 광산에 남는다. 3개 모두 확정하면 엔딩.
  RELICS: [
    { row: 25, col: 2, name: '기록 ①', text: '먼저 내려간 사람의 곡괭이가 여기 박혀 있었다.\n날이 다 나갔는데, 발자국은 더 아래로 이어진다.' },
    { row: 45, col: 6, name: '기록 ②', text: '벽에 새겨져 있다 — "돌아갈 산소를 남겨라."\n새긴 사람은 돌아갔을까.' },
    { row: 60, col: 4, name: '기록 ③', text: '마지막 기록: "바닥이 보인다. 한 칸만 더."\n…기록은 여기서 끝난다.' },
  ],

  // --- 업그레이드 비용 곡선 (배열 길이 = 최대 레벨) ---
  UPGRADES: {
    tank: { name: '산소통', costs: [10, 25, 60, 140, 300] },
    pick: { name: '곡괭이', costs: [15, 40] },
    lamp: { name: '램프',   costs: [20, 55] },
    bag:  { name: '가방',   costs: [20, 50] },  // 사망 손실 완화 — 죽음의 아픔을 돈으로 관리하는 보험 (콘텐츠 5단계)
    scan: { name: '스캐너', costs: [35] },      // 런당 1회 능동 정보 — "언제 쓸지"가 또 하나의 의사결정
  },
};

// ============================================================================
// 층(스트라타) 정의 — 콘텐츠 1단계 (docs/05_콘텐츠_설계.md §2, 수치 정본은 여기)
// - 각 층: 깊이 범위(from~to, 행 번호=미터), 흙 팔레트, 타일 생성 확률
// - 확률 형식: [기준값, 행당 증가량, (선택)시작깊이]
//   실제 확률 = 기준값 + 증가량 × (d − from). 시작깊이 전에는 0.
// - 사람이 직접 밸런스를 고치는 곳: 이 표의 숫자만 바꾸면 된다 (명세 §3 동기화 잊지 말 것)
// ============================================================================
HK.CFG.STRATA = [
  {
    name: '표토', from: 1, to: 20,
    dirtColor: 0x6e5a3e,
    probs: {
      gas:      [0.05, 0.004],       // 위험 입문
      collapse: [0, 0],              // 1층엔 붕괴 없음
      stone:    [0.06, 0.004],
      copper:   [0.11, -0.001],      // 초반 경제, 얕을수록 흔함
      silver:   [0.00, 0.004, 6],    // 6m부터 서서히
      gold:     [0, 0],
    },
  },
  {
    name: '암반대', from: 21, to: 40,
    dirtColor: 0x5f5142,
    probs: {
      gas:      [0.11, 0.001],
      collapse: [0.03, 0.0015],      // 붕괴 등장 — 힌트 2종 시작
      stone:    [0.18, 0.002],       // 돌 밀도 급증 (층 체감 요소)
      copper:   [0.05, 0],
      silver:   [0.09, 0],           // 은 중심 층
      gold:     [0.01, 0.0015],      // 금 맛보기
    },
  },
  {
    name: '심부', from: 41, to: 64,
    dirtColor: 0x4c4452,
    dark: true,                      // 암흑 층: 램프 LAMP_REQ_DARK 미만이면 광물·캡슐이 안 보임 (콘텐츠 4단계)
    probs: {
      gas:      [0.14, 0.0015],      // 위험 밀도 최고
      collapse: [0.07, 0.001],
      stone:    [0.18, 0],
      copper:   [0.03, 0],
      silver:   [0.05, 0],
      gold:     [0.06, 0.001],       // 금 중심 층
      gem:      [0.008, 0],          // 보석(20G) 극희귀 — "저거 하나면 산소통 산다"
    },
  },
];

// 깊이 d(행)가 속한 층을 반환 (범위 밖이면 마지막 층)
HK.strataAt = function (d) {
  for (var i = 0; i < HK.CFG.STRATA.length; i++) {
    var s = HK.CFG.STRATA[i];
    if (d >= s.from && d <= s.to) return s;
  }
  return HK.CFG.STRATA[HK.CFG.STRATA.length - 1];
};

// 층 st에서 깊이 d일 때 타일 type의 생성 확률
HK.tileProb = function (st, type, d) {
  var p = st.probs[type];
  if (!p) return 0;
  if (p[2] && d < p[2]) return 0; // 시작깊이 전
  return Math.max(0, p[0] + p[1] * (d - st.from));
};

// 상점에 표시되는 레벨별 효과 설명문 (레벨 lv "현재" 기준의 효과를 반환)
HK.upgradeDesc = {
  tank: function (lv) { return '최대 산소 ' + (HK.CFG.O2_BASE + HK.CFG.O2_PER_TANK * lv); },
  pick: function (lv) {
    var s = '돌 굴착 산소 ' + HK.CFG.STONE_COST_BY_PICK[lv];
    if (lv >= HK.CFG.PICK_REQ_HARDROCK) s += ' · 암반 굴착 가능';
    return s;
  },
  lamp: function (lv) {
    if (lv === 0) return '위험 힌트: 상하좌우';
    if (lv === 1) return '위험 힌트: 8방향';
    return '8방향 + 심부 암흑 투시';
  },
  bag: function (lv) { return '사망 시 손실 ' + Math.round((1 - HK.CFG.DEATH_KEEP_BY_BAG[lv]) * 100) + '%'; },
  scan: function (lv) { return lv === 0 ? '스캐너 없음' : '런당 1회, 주변 5×5 위험 공개'; },
};

// 개발용 디버그: URL에 ?o2=8 을 붙이면 시작 산소를 강제 → 사망 흐름을 빠르게 테스트
(function () {
  try {
    var v = new URLSearchParams(location.search).get('o2');
    if (v) HK.CFG.O2_DEBUG = parseInt(v, 10);
  } catch (e) { /* 파싱 실패는 무시 — 정상 수치로 진행 */ }
})();
