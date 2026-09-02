// ============================================================================
// 광산 생성 — 타일: { t: 'dirt'|'stone'|'copper'|'silver'|'gold'|'gas'|'empty', dug: bool }
//
// 설계 의도 (docs/04_시스템_명세.md §2.8, §3):
// - 깊이 d(행 번호)가 커질수록 광물 가치와 위험(가스)이 "함께" 오른다
//   → push-your-luck의 핵심: 더 내려갈 이유와 내려가면 안 될 이유를 같이 준다
// - 구리는 얕을수록 흔하고(초반 경제), 은 6m·금 16m부터 등장(깊이 목표 제시)
// - 확률 곡선을 바꾸면 명세 §3 표를 같이 갱신할 것
// ============================================================================
window.HK = window.HK || {};

HK.genMap = function () {
  var C = HK.CFG, g = [];
  for (var r = 0; r < C.ROWS; r++) {
    var row = [];
    for (var c = 0; c < C.COLS; c++) {
      if (r === 0) { row.push({ t: 'empty', dug: true }); continue; } // 0행 = 지표
      var d = r, t = 'dirt', roll = Math.random();
      var pGas    = Math.min(0.16, 0.02 + d * 0.0035);   // 위험: 깊이 비례, 상한 16%
      var pStone  = Math.min(0.30, 0.06 + d * 0.004);    // 장애물(산소 비용 벽), 상한 30%
      var pCopper = Math.max(0.02, 0.11 - d * 0.001);    // 초반 경제 — 얕을수록 흔함
      var pSilver = d < 6  ? 0 : Math.min(0.09, (d - 6) * 0.004);   // 6m부터
      var pGold   = d < 16 ? 0 : Math.min(0.07, (d - 16) * 0.0035); // 16m부터
      // 누적 확률로 단일 roll 판정 (순서: 가스 → 돌 → 구리 → 은 → 금 → 나머지 흙)
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
  // "첫 재미 10초" 보장 (기획서 §4): 시작 지점 근처는 안전 + 즉시 보상
  // - 1~3행의 중앙 3열(3~5열)에서 가스 제거
  // - [1,4]·[2,3]에 구리 강제 배치 (이미 다른 광물이면 그대로 둠)
  for (var rr = 1; rr <= 3; rr++) for (var cc = 3; cc <= 5; cc++) {
    if (g[rr][cc].t === 'gas') g[rr][cc].t = 'dirt';
  }
  if (g[1][4].t === 'stone' || g[1][4].t === 'dirt') g[1][4].t = 'copper';
  if (g[2][3].t === 'stone' || g[2][3].t === 'dirt') g[2][3].t = 'copper';
  return g;
};

HK.isMineral = function (t) { return t === 'copper' || t === 'silver' || t === 'gold'; };
