// ============================================================================
// 메타 상태 — 런 사이에 유지되는 영구 진행 (골드·업그레이드·기록)
// - 런 중 상태(산소·수확 등)는 MineScene이 들고 있으며 저장하지 않는다
//   → 새로고침 = 런 포기와 동일 (규칙: docs/04_시스템_명세.md §2.7)
// - localStorage가 막힌 환경(file:// 등)에서도 게임은 돌아가야 하므로 전부 try/catch
// ============================================================================
window.HK = window.HK || {};

HK.state = {
  // relics: 유물 확정 회수 여부(3개) / deaths·totalEarned: 엔딩 통계용 / endingSeen: 엔딩 1회 표시 후 무한 모드
  meta: {
    gold: 0, tankLv: 0, pickLv: 0, lampLv: 0, bestDepth: 0, runs: 0,
    relics: [false, false, false], deaths: 0, totalEarned: 0, endingSeen: false,
  },

  load: function () {
    try {
      var s = localStorage.getItem('hankandeo_v0');
      if (s) Object.assign(this.meta, JSON.parse(s));
    } catch (e) { /* 저장 불가 환경 — 메모리로만 진행 */ }
  },

  save: function () {
    try { localStorage.setItem('hankandeo_v0', JSON.stringify(this.meta)); } catch (e) { /* no-op */ }
  },

  // 상점의 "기록 초기화" — 개발·재미판정용 전체 리셋
  reset: function () {
    this.meta = {
      gold: 0, tankLv: 0, pickLv: 0, lampLv: 0, bestDepth: 0, runs: 0,
      relics: [false, false, false], deaths: 0, totalEarned: 0, endingSeen: false,
    };
    this.save();
  },

  // 이번 런의 시작(=최대) 산소. ?o2= 디버그가 있으면 그 값이 최우선
  maxO2: function () {
    if (HK.CFG.O2_DEBUG) return HK.CFG.O2_DEBUG;
    return HK.CFG.O2_BASE + HK.CFG.O2_PER_TANK * this.meta.tankLv;
  },
};
