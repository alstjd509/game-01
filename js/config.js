// 「한 칸 더」 그레이박스 v0 — 튜닝 테이블 (docs/03_한칸더_기획.md §2·§3의 가설 수치)
window.HK = window.HK || {};

HK.CFG = {
  COLS: 9, ROWS: 64, TILE: 44, HUD_H: 64,
  O2_BASE: 30, O2_PER_TANK: 10,
  MOVE_COST: 1,           // 이미 파인 칸으로 이동
  DIRT_COST: 1,           // 흙·광물·가스 굴착
  STONE_COST_BY_PICK: [3, 2, 1],
  GAS_PENALTY: 8,
  DEATH_KEEP: 0.5,        // 사망 시 수확 유지 비율
  VALUE: { copper: 1, silver: 3, gold: 8 },
  COLORS: {
    surface: 0x2e5d3a, dirt: 0x6e5a3e, stone: 0x868c96, empty: 0x232630,
    copper: 0xc1763f, silver: 0xd7dce4, gold: 0xffd23f,
    player: 0x48c7e8, hudBg: 0x0d0f13,
  },
  UPGRADES: {
    tank: { name: '산소통', costs: [10, 25, 60, 140, 300] },
    pick: { name: '곡괭이', costs: [15, 40] },
    lamp: { name: '램프',   costs: [20] },
  },
};

HK.upgradeDesc = {
  tank: function (lv) { return '최대 산소 ' + (HK.CFG.O2_BASE + HK.CFG.O2_PER_TANK * lv); },
  pick: function (lv) { return '돌 굴착 산소 ' + HK.CFG.STONE_COST_BY_PICK[lv]; },
  lamp: function (lv) { return lv === 0 ? '가스 힌트: 상하좌우' : '가스 힌트: 8방향'; },
};

// 개발용: ?o2=8 로 시작 산소를 강제해 사망 흐름을 빠르게 테스트
(function () {
  try {
    var v = new URLSearchParams(location.search).get('o2');
    if (v) HK.CFG.O2_DEBUG = parseInt(v, 10);
  } catch (e) { /* no-op */ }
})();
