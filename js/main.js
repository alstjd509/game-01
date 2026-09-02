// 엔트리 — 최초 1회는 오프닝, 첫 런이면 바로 광산으로(첫 재미 10초), 아니면 지상 기지부터
window.HK = window.HK || {};

HK.state.load();

(function () {
  var first = !HK.state.meta.introSeen ? HK.IntroScene
    : (HK.state.meta.runs === 0 ? HK.MineScene : HK.ShopScene);
  var scenes = [first];
  [HK.IntroScene, HK.MineScene, HK.ShopScene, HK.EndingScene].forEach(function (s) {
    if (scenes.indexOf(s) === -1) scenes.push(s);
  });
  HK.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: HK.CFG.COLS * HK.CFG.TILE,
    height: 640,
    backgroundColor: '#15171d',
    pixelArt: true, // 도트 텍스처를 또렷하게 확대 (textures.js)
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: scenes,
  });
})();
