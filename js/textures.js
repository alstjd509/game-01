// ============================================================================
// 절차적 도트 텍스처 (폴리싱 1차)
// - 11×11 픽셀 패턴 문자열 → 캔버스 텍스처 생성 → 게임에서 4배 확대(pixelArt)
// - 외부 에셋 없이 도트 룩을 만든다. 나중에 진짜 도트(PNG)로 교체 시 이 파일만 대체
// - 패턴 문자 = 아래 각 팔레트의 키, '.' = 투명
// - 흙(dirt)은 층별 3종 — 팔레트만 다르고 패턴은 공유 (STRATA 인덱스와 대응)
// ============================================================================
window.HK = window.HK || {};

(function () {
  var DIRT = [
    'aaaaaaaaaab',
    'aacaaabaaab',
    'abaaaaaacab',
    'aaaacaaaaab',
    'acaabaacaab',
    'aaaaaaabaab',
    'abacaaaaaab',
    'aaaaabacaab',
    'acaaaaaaaab',
    'aabaacaaaab',
    'bbbbbbbbbbb',
  ];
  var STONE = [
    'lsssssssssd',
    'sslsskssssd',
    'ssssssssksd',
    'sdsklsssssd',
    'sssssklsssd',
    'slsssssksdd',
    'ssssdsssssd',
    'sskssssslsd',
    'ssssslsssdd',
    'sdsssssksdd',
    'ddddddddddd',
  ];
  var HARDROCK = [
    'hhhhhhhhhhh',
    'hrhhhhhhhrh',
    'hhddhhhddhh',
    'hhdhhhhhdhh',
    'hhhhlllhhhh',
    'hhhhlhlhhhh',
    'hhhhlllhhhh',
    'hhdhhhhhdhh',
    'hhddhhhddhh',
    'hrhhhhhhhrh',
    'ddddddddddd',
  ];
  var EMPTY = [
    'eeeeeeeeeee',
    'efeeeeeegee',
    'eeeeegeeeee',
    'eeefeeeeefe',
    'egeeeeeegee',
    'eeeeefeeeee',
    'eeegeeeeeee',
    'efeeeeegeee',
    'eeeeeeeefee',
    'eegeeefeeee',
    'eeeeeeeeeee',
  ];
  var SURFACE = [
    'yggyggygggy',
    'gggggGgggyg',
    'GgggygGgggg',
    'gGgggggGggg',
    'aGaaaaaGaaa',
    'abaaaaaacab',
    'aaaacaaaaab',
    'acaabaacaab',
    'aaaaaaabaab',
    'abacaaaaaab',
    'bbbbbbbbbbb',
  ];
  // 광석 오버레이 — 투명 배경 위 원석 덩어리 (층 흙 위에 겹쳐 그린다)
  var ORE = [
    '...........',
    '...........',
    '...........',
    '....cc.....',
    '...chcc....',
    '....cchc...',
    '.....cc....',
    '...........',
    '...........',
    '...........',
    '...........',
  ];
  var ORE_GOLD = [
    '...........',
    '.......h...',
    '...........',
    '....cc.....',
    '...chcc....',
    '....cchc...',
    '.....cc....',
    '...........',
    '..h........',
    '...........',
    '...........',
  ];
  var GEM = [
    '...........',
    '.....w.....',
    '....php....',
    '...phhhp...',
    '....php....',
    '.....p.....',
    '...........',
    '........w..',
    '...........',
    '...........',
    '...........',
  ];
  var CAPSULE = [
    '...........',
    '.....ww....',
    '....tttt...',
    '....tdtt...',
    '....tttt...',
    '....tdtt...',
    '....tttt...',
    '.....tt....',
    '...........',
    '...........',
    '...........',
  ];
  var RELIC = [
    '...........',
    '...ppppp...',
    '..pldldlp..',
    '..pdllldp..',
    '..plldllp..',
    '..pdllldp..',
    '..plldllp..',
    '..ppdllpp..',
    '...ppppp...',
    '.....d.....',
    '...........',
  ];
  var PLAYER = [
    '...........',
    '...HHHHH...',
    '..HHLHHHH..',
    '...SSSSS...',
    '...SESES...',
    '...SSSSS...',
    '..BBBBBBB..',
    '..BbBBBbB..',
    '..BBBBBBB..',
    '...FF.FF...',
    '...........',
  ];

  // 패턴 → 캔버스 텍스처. 이미 있으면 건너뜀(씬 재시작 대응)
  function mk(scene, key, rows, pal) {
    if (scene.textures.exists(key)) return;
    var h = rows.length, w = rows[0].length;
    var tex = scene.textures.createCanvas(key, w, h);
    var ctx = tex.getContext();
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }
    tex.refresh();
  }

  HK.buildTextures = function (scene) {
    // 층별 흙 팔레트 (STRATA 인덱스 0·1·2와 대응 — config STRATA.dirtColor와 톤 일치)
    mk(scene, 'tile_dirt_0', DIRT, { a: '#6e5a3e', b: '#5a4830', c: '#7f6b4d' });
    mk(scene, 'tile_dirt_1', DIRT, { a: '#5f5142', b: '#4d4234', c: '#6f6152' });
    mk(scene, 'tile_dirt_2', DIRT, { a: '#4c4452', b: '#3c3642', c: '#5c5364' });
    mk(scene, 'tile_stone', STONE, { s: '#868c96', d: '#6b717c', l: '#9ba1ab', k: '#565c66' });
    mk(scene, 'tile_hardrock', HARDROCK, { h: '#3e4550', d: '#2f3540', l: '#4d5560', r: '#5a626e' });
    mk(scene, 'tile_empty', EMPTY, { e: '#20232c', f: '#282b36', g: '#191c24' });
    mk(scene, 'tile_surface', SURFACE, { y: '#58a765', g: '#3f8a4f', G: '#2e6d3c', a: '#6e5a3e', b: '#5a4830', c: '#7f6b4d' });
    mk(scene, 'ov_copper', ORE, { c: '#c1763f', h: '#e09a62' });
    mk(scene, 'ov_silver', ORE, { c: '#c8ccd4', h: '#eef1f5' });
    mk(scene, 'ov_gold', ORE_GOLD, { c: '#e8b923', h: '#ffe066' });
    mk(scene, 'ov_gem', GEM, { p: '#ff6ad5', h: '#ffb3ec', w: '#ffffff' });
    mk(scene, 'ov_capsule', CAPSULE, { t: '#63d8b2', d: '#3fa886', w: '#e8fff7' });
    mk(scene, 'ov_relic', RELIC, { p: '#c77dff', d: '#8e4fd0', l: '#e3c2ff' });
    mk(scene, 'spr_player', PLAYER, {
      H: '#ffd23f', L: '#fffbe0', S: '#e8b48a', E: '#2b2b2b',
      B: '#2e5d7d', b: '#24485f', F: '#2b2b2b',
    });
  };
})();
