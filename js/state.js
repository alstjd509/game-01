// 메타 상태 (런 사이에 유지) + localStorage 저장
window.HK = window.HK || {};

HK.state = {
  meta: { gold: 0, tankLv: 0, pickLv: 0, lampLv: 0, bestDepth: 0, runs: 0 },

  load: function () {
    try {
      var s = localStorage.getItem('hankandeo_v0');
      if (s) Object.assign(this.meta, JSON.parse(s));
    } catch (e) { /* file:// 등에서 막혀도 게임은 동작해야 함 */ }
  },

  save: function () {
    try { localStorage.setItem('hankandeo_v0', JSON.stringify(this.meta)); } catch (e) { /* no-op */ }
  },

  reset: function () {
    this.meta = { gold: 0, tankLv: 0, pickLv: 0, lampLv: 0, bestDepth: 0, runs: 0 };
    this.save();
  },

  maxO2: function () {
    if (HK.CFG.O2_DEBUG) return HK.CFG.O2_DEBUG;
    return HK.CFG.O2_BASE + HK.CFG.O2_PER_TANK * this.meta.tankLv;
  },
};
