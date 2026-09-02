// 엔트리 — 첫 실행이면 바로 광산으로(첫 재미 10초), 아니면 지상 기지부터
window.HK = window.HK || {};

HK.state.load();

(function () {
  var firstRun = HK.state.meta.runs === 0;
  var scenes = firstRun ? [HK.MineScene, HK.ShopScene] : [HK.ShopScene, HK.MineScene];
  HK.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: HK.CFG.COLS * HK.CFG.TILE,
    height: 640,
    backgroundColor: '#15171d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: scenes,
  });
})();
