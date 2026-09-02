// 광산 생성 — 타일: { t: 'dirt'|'stone'|'copper'|'silver'|'gold'|'gas'|'empty', dug: bool }
// 깊이(r)가 커질수록 광물 가치·위험 밀도 상승 (docs/03 §2)
window.HK = window.HK || {};

HK.genMap = function () {
  var C = HK.CFG, g = [];
  for (var r = 0; r < C.ROWS; r++) {
    var row = [];
    for (var c = 0; c < C.COLS; c++) {
      if (r === 0) { row.push({ t: 'empty', dug: true }); continue; } // 지표
      var d = r, t = 'dirt', roll = Math.random();
      var pGas    = Math.min(0.16, 0.02 + d * 0.0035);
      var pStone  = Math.min(0.30, 0.06 + d * 0.004);
      var pCopper = Math.max(0.02, 0.11 - d * 0.001);
      var pSilver = d < 6  ? 0 : Math.min(0.09, (d - 6) * 0.004);
      var pGold   = d < 16 ? 0 : Math.min(0.07, (d - 16) * 0.0035);
      var acc = pGas;
      if (roll < acc) t = 'gas';
      else if (roll < (acc += pStone)) t = 'stone';
      else if (roll < (acc += pCopper)) t = 'copper';
      else if (roll < (acc += pSilver)) t = 'silver';
      else if (roll < (acc += pGold)) t = 'gold';
      row.push({ t: t, dug: false });
    }
    g.push(row);
  }
  // 첫 재미 10초 보장: 시작 근처(1~3행 중앙 3열)는 가스 제거 + 구리 2개 배치
  for (var rr = 1; rr <= 3; rr++) for (var cc = 3; cc <= 5; cc++) {
    if (g[rr][cc].t === 'gas') g[rr][cc].t = 'dirt';
  }
  if (g[1][4].t === 'stone' || g[1][4].t === 'dirt') g[1][4].t = 'copper';
  if (g[2][3].t === 'stone' || g[2][3].t === 'dirt') g[2][3].t = 'copper';
  return g;
};

HK.isMineral = function (t) { return t === 'copper' || t === 'silver' || t === 'gold'; };
