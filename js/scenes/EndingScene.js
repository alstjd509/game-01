// ============================================================================
// 엔딩 씬 — 유물 3개를 모두 "살아서" 가져온 순간 1회만 표시 (명세 §2.9)
// 기록 전문 + 플레이 통계 → 무한 모드 해금. 이후로는 다시 나오지 않는다
// ============================================================================
window.HK = window.HK || {};

HK.EndingScene = class extends Phaser.Scene {
  constructor() { super('Ending'); }

  create() {
    var C = HK.CFG, W = C.COLS * C.TILE, m = HK.state.meta, self = this;
    m.endingSeen = true; // 엔딩은 1회성 — 진입 즉시 기록해 재진입을 막는다
    HK.state.save();
    this.cameras.main.setBackgroundColor('#0d0f13');

    this.add.text(W / 2, 48, '기록의 끝', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#c77dff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(W / 2, 76, '맨 땅에 헤딩', { fontFamily: 'sans-serif', fontSize: '12px', color: '#6f7480' }).setOrigin(0.5);

    // 기록 3개 전문
    var y = 118;
    C.RELICS.forEach(function (rl) {
      self.add.text(24, y, '✦ ' + rl.name, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffd23f', fontStyle: 'bold' });
      self.add.text(24, y + 20, rl.text, { fontFamily: 'sans-serif', fontSize: '13px', color: '#d9d3c0', lineSpacing: 5 });
      y += 80;
    });

    this.add.text(W / 2, y + 4, '그리고 당신은 살아서 돌아왔다.', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#8ee8a0',
    }).setOrigin(0.5);

    // 플레이 통계
    var stats = '총 런 ' + m.runs + '회 · 사망 ' + m.deaths + '회\n총 수확 ' + m.totalEarned + 'G · 최고 깊이 ' + m.bestDepth + 'm';
    this.add.text(W / 2, y + 38, stats, {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#e8e2c8', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0);

    var btn = this.add.text(W / 2, y + 122, '⛏  무한 모드로 계속', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', backgroundColor: '#2e7d4f', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', function () { self.scene.start('Shop', {}); });
  }
};
