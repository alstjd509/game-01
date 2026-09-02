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

  // --- 리스크·정산 ---
  GAS_PENALTY: 8,           // 가스 타일을 팠을 때 추가 산소 손실
  DEATH_KEEP: 0.3,          // 사망 시 수확 유지 비율(내림). 0.5→0.3 (2026-09-02 조정 1회: 갈등 "조금"→죽음이 더 아파야 귀환 고민이 생김)
  O2_CAPSULE: 10,           // 산소 캡슐 회복량 (최대 산소 초과 불가)

  // --- 광물 가치(G) ---
  VALUE: { copper: 1, silver: 3, gold: 8 },

  // --- 색상 (그레이박스: 도형만 사용) ---
  // 주의: 가스 타일은 dirt와 같은 색을 쓴다 = "숨은 위험"이 규칙의 핵심
  COLORS: {
    surface: 0x2e5d3a, dirt: 0x6e5a3e, stone: 0x868c96, empty: 0x232630,
    copper: 0xc1763f, silver: 0xd7dce4, gold: 0xffd23f, capsule: 0x63d8b2,
    player: 0x48c7e8, hudBg: 0x0d0f13,
  },

  // --- 업그레이드 비용 곡선 (배열 길이 = 최대 레벨) ---
  UPGRADES: {
    tank: { name: '산소통', costs: [10, 25, 60, 140, 300] },
    pick: { name: '곡괭이', costs: [15, 40] },
    lamp: { name: '램프',   costs: [20] },
  },
};

// 상점에 표시되는 레벨별 효과 설명문 (레벨 lv "현재" 기준의 효과를 반환)
HK.upgradeDesc = {
  tank: function (lv) { return '최대 산소 ' + (HK.CFG.O2_BASE + HK.CFG.O2_PER_TANK * lv); },
  pick: function (lv) { return '돌 굴착 산소 ' + HK.CFG.STONE_COST_BY_PICK[lv]; },
  lamp: function (lv) { return lv === 0 ? '가스 힌트: 상하좌우' : '가스 힌트: 8방향'; },
};

// 개발용 디버그: URL에 ?o2=8 을 붙이면 시작 산소를 강제 → 사망 흐름을 빠르게 테스트
(function () {
  try {
    var v = new URLSearchParams(location.search).get('o2');
    if (v) HK.CFG.O2_DEBUG = parseInt(v, 10);
  } catch (e) { /* 파싱 실패는 무시 — 정상 수치로 진행 */ }
})();
