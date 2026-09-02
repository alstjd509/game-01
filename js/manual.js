// ============================================================================
// 설명서 오버레이 (온보딩) — 규칙 / 타일 도감 2탭. 지상 기지·광산 어디서든 열 수 있다
// 도감 아이콘은 실제 게임 텍스처를 그대로 사용 → 그림과 실물이 항상 일치 (명세 §2.15)
// ============================================================================
window.HK = window.HK || {};

HK.openManual = function (scene) {
  HK.buildTextures(scene); // 상점에서 먼저 열어도 텍스처가 있도록 (idempotent)
  var C = HK.CFG, W = C.COLS * C.TILE;
  scene.manualOpen = true; // 광산에서는 이 플래그로 굴착 입력을 잠근다

  var ov = [], pageObjs = [];
  function addOv(o) { ov.push(o); o.setScrollFactor(0).setDepth(50); return o; }
  function addP(o) { pageObjs.push(o); o.setScrollFactor(0).setDepth(50); return o; }
  function clearPage() { pageObjs.forEach(function (o) { o.destroy(); }); pageObjs = []; }

  addOv(scene.add.rectangle(0, 0, W, 1000, 0x000000, 0.94).setOrigin(0, 0).setInteractive());
  addOv(scene.add.text(W / 2, 24, '설명서', {
    fontFamily: 'sans-serif', fontSize: '17px', color: '#e8e2c8', fontStyle: 'bold',
  }).setOrigin(0.5));

  var tabStyle = { fontFamily: 'sans-serif', fontSize: '13px', color: '#9aa0ad', backgroundColor: '#232630', padding: { x: 14, y: 5 } };
  var tabRule = addOv(scene.add.text(W / 2 - 58, 54, '규칙', tabStyle).setOrigin(0.5).setInteractive({ useHandCursor: true }));
  var tabTile = addOv(scene.add.text(W / 2 + 58, 54, '타일 도감', tabStyle).setOrigin(0.5).setInteractive({ useHandCursor: true }));

  function renderRules() {
    clearPage();
    var txt = [
      '[조작]  플레이어 옆 칸(상하좌우) 클릭, 또는 방향키·WASD',
      '           = 굴착하며 그 칸으로 이동',
      '',
      '[산소]  모든 굴착·이동이 산소를 쓴다.',
      '           0이 되면 질식 — 수확의 일부를 잃는다',
      '',
      '[귀환]  우상단 [귀환] 버튼. 언제든 무료.',
      '           수확과 유물은 귀환해야 확정된다',
      '',
      '[숨은 위험]  가스(−8)·붕괴(−15)는 흙과 똑같이 생겼다',
      '',
      '[힌트]  서 있는 칸 기준, 인접한 위험의 "개수"가 보인다',
      '           초록 쉭쉭 = 가스 · 주황 우르릉 = 붕괴',
      '           지나간 칸에도 숫자가 남는다 — 지뢰찾기처럼',
      '           여러 칸의 숫자를 조합해 위치를 추론하라',
      '',
      '[성장]  골드로 장비 구매 → 더 깊이. 승강기로 출발',
      '           깊이를 해금하면 깊은 층에서 바로 시작한다',
      '',
      '[목표]  깊은 곳의 유물 ✦ 3개를 들고 살아 돌아오면',
      '           기록이 완성된다',
    ].join('\n');
    addP(scene.add.text(24, 88, txt, {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#d9d3c0', lineSpacing: 5,
    }));
  }

  function tileRow(oy, icons, label, desc) {
    var x = 30;
    icons.forEach(function (key) {
      addP(scene.add.image(x, oy, key).setScale(3));
      x += 36;
    });
    addP(scene.add.text(x + 4, oy, label, {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#e8e2c8', fontStyle: 'bold',
    }).setOrigin(0, 0.5));
    addP(scene.add.text(x + 4, oy + 15, desc, {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#9aa0ad',
    }).setOrigin(0, 0.5));
    return oy + 47;
  }

  function renderTiles() {
    clearPage();
    var oy = 100;
    oy = tileRow(oy, ['tile_dirt_0', 'tile_dirt_1', 'tile_dirt_2'], '흙 (표토·암반대·심부)', '기본 지형 · 굴착 산소 1 · 층마다 색이 다르다');
    oy = tileRow(oy, ['tile_stone'], '돌', '굴착 산소 3 — 곡괭이 업그레이드로 2 → 1');
    oy = tileRow(oy, ['tile_hardrock'], '단단한 암반', '곡괭이 Lv2 없이는 못 판다 · 굴착 산소 4');
    oy = tileRow(oy, ['ov_copper', 'ov_silver', 'ov_gold', 'ov_gem'], '광물 — 깊을수록 비싸다', '구리 1 · 은 3 · 금 8 · 보석 20 (G)');
    oy = tileRow(oy, ['ov_capsule'], '산소 캡슐', '파면 산소 +10 (최대치까지)');
    // 가스·붕괴는 흙과 동일 외형 — 도감에서도 흙 그림에 ?를 얹어 보여준다
    var gy = oy;
    addP(scene.add.image(30, gy, 'tile_dirt_0').setScale(3));
    addP(scene.add.text(30, gy, '?', { fontFamily: 'sans-serif', fontSize: '15px', color: '#8ee85a', fontStyle: 'bold' }).setOrigin(0.5));
    addP(scene.add.text(70, gy, '가스', { fontFamily: 'sans-serif', fontSize: '12px', color: '#8ee85a', fontStyle: 'bold' }).setOrigin(0, 0.5));
    addP(scene.add.text(70, gy + 15, '흙과 똑같이 생겼다! 밟으면 산소 −8 · 힌트로만 추론', { fontFamily: 'sans-serif', fontSize: '11px', color: '#9aa0ad' }).setOrigin(0, 0.5));
    oy += 47;
    var cy = oy;
    addP(scene.add.image(30, cy, 'tile_dirt_1').setScale(3));
    addP(scene.add.text(30, cy, '?', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffb45c', fontStyle: 'bold' }).setOrigin(0.5));
    addP(scene.add.text(70, cy, '붕괴', { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffb45c', fontStyle: 'bold' }).setOrigin(0, 0.5));
    addP(scene.add.text(70, cy + 15, '역시 흙과 동일! 밟으면 산소 −15 · 암반대(21m~)부터', { fontFamily: 'sans-serif', fontSize: '11px', color: '#9aa0ad' }).setOrigin(0, 0.5));
    oy += 47;
    oy = tileRow(oy, ['ov_relic'], '유물 ✦', '들고 "귀환"해야 확정 · 죽으면 그 자리에 남는다');
    oy = tileRow(oy, ['ov_note'], '쪽지', '기록자의 기록 · 줍는 즉시 보존 (지상 기지 📜에서 재열람)');
    addP(scene.add.text(W / 2, oy + 6, '숨은 위험은 각인 숫자로 읽는다 — 초록=가스 · 주황=붕괴', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#6f7480',
    }).setOrigin(0.5, 0));
  }

  function setTab(i) {
    tabRule.setStyle({ backgroundColor: i === 0 ? '#2e5d7d' : '#232630', color: i === 0 ? '#ffffff' : '#9aa0ad' });
    tabTile.setStyle({ backgroundColor: i === 1 ? '#2e5d7d' : '#232630', color: i === 1 ? '#ffffff' : '#9aa0ad' });
    if (i === 0) renderRules(); else renderTiles();
  }
  tabRule.on('pointerdown', function () { setTab(0); });
  tabTile.on('pointerdown', function () { setTab(1); });
  setTab(0);

  var close = addOv(scene.add.text(W / 2, 618, '닫기', {
    fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', backgroundColor: '#3a3f4a', padding: { x: 18, y: 6 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
  close.on('pointerdown', function () {
    clearPage();
    ov.forEach(function (o) { o.destroy(); });
    scene.manualOpen = false;
  });
};
