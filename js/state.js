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
    gold: 0, tankLv: 0, pickLv: 0, lampLv: 0, bagLv: 0, scanLv: 0, elevLv: 0, startDepth: 0,
    bestDepth: 0, runs: 0,
    relics: [false, false, false], deaths: 0, totalEarned: 0, endingSeen: false,
    introSeen: false,                     // 오프닝 1회 (스토리)
    notes: [false, false, false, false, false, false, false, false], // 쪽지 8개 수집 여부 (줍는 즉시 확정)
    charId: 'rookie',                     // 선택된 캐릭터 (콘텐츠 6단계)
    chars: { rookie: true },              // 캐릭터 해금 여부
    charIntroSeen: {},                    // 캐릭터별 인트로 1회 표시
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
      gold: 0, tankLv: 0, pickLv: 0, lampLv: 0, bagLv: 0, scanLv: 0, elevLv: 0, startDepth: 0,
      bestDepth: 0, runs: 0,
      relics: [false, false, false], deaths: 0, totalEarned: 0, endingSeen: false,
      introSeen: false,
      notes: [false, false, false, false, false, false, false, false],
      charId: 'rookie',
      chars: { rookie: true },
      charIntroSeen: {},
    };
    this.save();
  },

  // 사망 시 수확 유지 비율 — 가방 레벨 + 캐릭터 보정(겁쟁이), 상한 0.9 (명세 §2.5)
  deathKeep: function () {
    var arr = HK.CFG.DEATH_KEEP_BY_BAG;
    var base = arr[Math.min(this.meta.bagLv, arr.length - 1)];
    return Math.min(0.9, base + (this.charDef().deathKeepBonus || 0));
  },

  // 이번 런의 출발 깊이 — 선택값이 승강기 해금 범위를 넘지 않게 검증 (명세 §2.12)
  startDepth: function () {
    var depths = HK.CFG.ELEV_DEPTHS;
    var idx = depths.indexOf(this.meta.startDepth);
    if (idx === -1 || idx > this.meta.elevLv) return 0;
    return this.meta.startDepth;
  },

  // 이번 런의 시작(=최대) 산소. 캐릭터 보정 포함, ?o2= 디버그가 최우선
  maxO2: function () {
    if (HK.CFG.O2_DEBUG) return HK.CFG.O2_DEBUG;
    var v = HK.CFG.O2_BASE + HK.CFG.O2_PER_TANK * this.meta.tankLv + (this.charDef().o2Bonus || 0);
    return Math.max(15, v);
  },

  // 선택된 캐릭터 정의 (없거나 깨진 값이면 신입)
  charDef: function () {
    var id = this.meta.charId || 'rookie';
    for (var i = 0; i < HK.CFG.CHARS.length; i++) if (HK.CFG.CHARS[i].id === id) return HK.CFG.CHARS[i];
    return HK.CFG.CHARS[0];
  },

  // 도전과제형 캐릭터 해금 판정 — 런 정산·엔딩 시 호출, 새로 열린 id 배열 반환 (docs/08)
  checkUnlocks: function (ctx) {
    var m = this.meta, newly = [];
    var cond = {
      scrapper: m.totalEarned >= 300,
      coward: !!(ctx && !ctx.died && ctx.o2 !== undefined && ctx.o2 <= 5), // 아슬아슬 "생환"만 인정
      chronicler: m.endingSeen,
    };
    ['scrapper', 'coward', 'chronicler'].forEach(function (id) {
      if (cond[id] && !m.chars[id]) { m.chars[id] = true; newly.push(id); }
    });
    if (newly.length) this.save();
    return newly;
  },
};
