// ============================================================================
// 지상 기지 씬 — 런 결과 요약 + 장비 업그레이드 + 재잠수 (규칙: 명세 §2.6)
// - 구매 시 즉시 저장 후 scene.restart로 UI 전체를 다시 그린다(부분 갱신 없음 — 그레이박스 단순화)
// - "기록 초기화"는 개발·재미판정용 전체 리셋
// ============================================================================
window.HK = window.HK || {};

HK.ShopScene = class extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) { this.summary = data || {}; }

  create() {
    var C = HK.CFG, W = C.COLS * C.TILE, m = HK.state.meta;
    this.cameras.main.setBackgroundColor('#191b21');

    this.add.text(W / 2, 34, '지상 기지', { fontFamily: 'sans-serif', fontSize: '24px', color: '#e8e2c8', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W / 2, 60, '맨 땅에 헤딩 — 그레이박스', { fontFamily: 'sans-serif', fontSize: '12px', color: '#6f7480' }).setOrigin(0.5);

    // 직전 런 요약
    if (this.summary.gained !== undefined) {
      var s = this.summary;
      var lostPct = Math.round((1 - HK.state.deathKeep()) * 100); // 손실률은 가방 레벨에서 파생(하드코딩 금지)
      var line = s.died
        ? '질식! 수확 ' + s.raw + 'G → ' + s.gained + 'G (' + lostPct + '% 손실) · 깊이 ' + s.depth + 'm'
        : '귀환 성공! +' + s.gained + 'G · 깊이 ' + s.depth + 'm';
      this.add.text(W / 2, 92, line, {
        fontFamily: 'sans-serif', fontSize: '14px', color: s.died ? '#ff8a7a' : '#8ee8a0',
      }).setOrigin(0.5);
    }

    var relicCnt = (m.relics[0] ? 1 : 0) + (m.relics[1] ? 1 : 0) + (m.relics[2] ? 1 : 0);
    this.add.text(W / 2, 124,
      '골드 ' + m.gold + 'G · ✦유물 ' + relicCnt + '/3 · 최고 깊이 ' + m.bestDepth + 'm' + (m.endingSeen ? ' · 무한 모드' : ''), {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#ffd23f',
      }).setOrigin(0.5);

    // 업그레이드 목록
    var keys = ['tank', 'pick', 'lamp', 'bag', 'scan'], y = 170, self = this;
    keys.forEach(function (key) {
      var up = C.UPGRADES[key];
      var lv = m[key + 'Lv'];
      var maxed = lv >= up.costs.length;
      var cost = maxed ? null : up.costs[lv];

      self.add.text(16, y, up.name + ' Lv' + lv, { fontFamily: 'sans-serif', fontSize: '15px', color: '#e8e2c8' });
      self.add.text(16, y + 20, HK.upgradeDesc[key](lv) + (maxed ? ' (최대)' : ' → ' + HK.upgradeDesc[key](lv + 1)), {
        fontFamily: 'sans-serif', fontSize: '12px', color: '#9aa0ad',
      });

      if (!maxed) {
        var afford = m.gold >= cost;
        var btn = self.add.text(W - 16, y + 10, cost + 'G 구매', {
          fontFamily: 'sans-serif', fontSize: '14px', color: afford ? '#ffffff' : '#777c88',
          backgroundColor: afford ? '#2e5d7d' : '#2a2d35', padding: { x: 10, y: 6 },
        }).setOrigin(1, 0.5);
        if (afford) {
          btn.setInteractive({ useHandCursor: true }).on('pointerdown', function () {
            m.gold -= cost;
            m[key + 'Lv'] += 1;
            HK.state.save();
            self.scene.restart(self.summary);
          });
        }
      } else {
        self.add.text(W - 16, y + 10, 'MAX', { fontFamily: 'sans-serif', fontSize: '14px', color: '#8ee8a0' }).setOrigin(1, 0.5);
      }
      y += 54; // 업그레이드 5종이 한 화면에 들어가도록 간격 축소 (콘텐츠 5단계)
    });

    // 잠수 시작
    var dive = this.add.text(W / 2, y + 40, '⛏  잠수 시작', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#2e7d4f', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    dive.on('pointerdown', function () { self.scene.start('Mine'); });

    this.add.text(W / 2, y + 100, '가스도 붕괴도 흙과 똑같이 생겼다.\n힌트를 읽어라 — 초록(쉭쉭…)=가스, 주황(우르릉…)=붕괴.', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#6f7480', align: 'center',
    }).setOrigin(0.5);

    // 기록 초기화 (개발·판정용)
    var reset = this.add.text(W / 2, 600, '기록 초기화', { fontFamily: 'sans-serif', fontSize: '11px', color: '#555a66' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    reset.on('pointerdown', function () { HK.state.reset(); self.scene.restart({}); });

    // 이번 귀환에서 확정한 유물의 기록 조각 — 특별한 순간이므로 오버레이로 보여준다 (명세 §2.9)
    if (this.summary.securedRelics && this.summary.securedRelics.length > 0) {
      var ov = [this.add.rectangle(0, 0, W, 1000, 0x000000, 0.85).setOrigin(0, 0).setInteractive()];
      var oy = 200;
      this.summary.securedRelics.forEach(function (idx) {
        var rl = C.RELICS[idx];
        ov.push(self.add.text(W / 2, oy, '✦ ' + rl.name + ' 확보', {
          fontFamily: 'sans-serif', fontSize: '18px', color: '#c77dff', fontStyle: 'bold',
        }).setOrigin(0.5));
        ov.push(self.add.text(W / 2, oy + 28, rl.text, {
          fontFamily: 'sans-serif', fontSize: '13px', color: '#d9d3c0', align: 'center', lineSpacing: 5,
        }).setOrigin(0.5, 0));
        oy += 104;
      });
      var ok = this.add.text(W / 2, oy + 16, '계속', {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', backgroundColor: '#2e5d7d', padding: { x: 18, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      ov.push(ok);
      ov.forEach(function (o) { o.setDepth(30); });
      ok.on('pointerdown', function () { ov.forEach(function (o) { o.destroy(); }); });
    }
  }
};
