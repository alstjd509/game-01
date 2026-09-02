// ============================================================================
// 오프닝 씬 (스토리, docs/07 §1) — 첫 실행 1회만. 클릭하면 광산으로
// ============================================================================
window.HK = window.HK || {};

HK.IntroScene = class extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    var C = HK.CFG, W = C.COLS * C.TILE, self = this;
    this.cameras.main.setBackgroundColor('#0a0b0e');

    this.add.text(W / 2, 92, '맨 땅에 헤딩', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#e8e2c8', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, 200, HK.STORY.INTRO.join('\n'), {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#d9d3c0', align: 'center', lineSpacing: 9,
    }).setOrigin(0.5, 0);

    var prompt = this.add.text(W / 2, 500, HK.STORY.INTRO_PROMPT, {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#8a8f9a',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', function () {
      HK.state.meta.introSeen = true;
      HK.state.save();
      self.scene.start('Mine');
    });
  }
};
