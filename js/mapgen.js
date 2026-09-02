// ============================================================================
// 광산 생성 — 타일: { t: 'dirt'|'stone'|'copper'|'silver'|'gold'|'gas'|'collapse'|'capsule'|'empty', dug: bool }
//
// 설계 의도 (docs/05_콘텐츠_설계.md §2, 명세 §2.8·§3):
// - 층(스트라타) 기반 생성: 표토(1~20m) → 암반대(21~40m) → 심부(41~64m)
//   층마다 팔레트·확률이 달라 "내려왔다"는 체감을 만든다. 확률 정본 = config.js의 STRATA
// - 깊을수록 보상(은→금)과 위험(가스·붕괴)이 함께 오른다 = push-your-luck의 핵심
// - 가스·붕괴는 흙과 같은 외형(숨은 위험, 힌트 2종으로만 추론)
// - 층 구성·확률을 바꾸면 config.js STRATA 수정 + 명세 §3 표 동기화
// ============================================================================
window.HK = window.HK || {};

HK.genMap = function () {
  var C = HK.CFG, g = [];
  for (var r = 0; r < C.ROWS; r++) {
    var row = [];
    for (var c = 0; c < C.COLS; c++) {
      if (r === 0) { row.push({ t: 'empty', dug: true }); continue; } // 0행 = 지표
      var d = r, st = HK.strataAt(d), t = 'dirt', roll = Math.random();
      // 누적 확률로 단일 roll 판정 (순서: 가스 → 붕괴 → 돌 → 구리 → 은 → 금 → 캡슐 → 흙)
      var acc = HK.tileProb(st, 'gas', d);
      if (roll < acc) t = 'gas';
      else if (roll < (acc += HK.tileProb(st, 'collapse', d))) t = 'collapse';
      else if (roll < (acc += HK.tileProb(st, 'stone', d))) t = 'stone';
      else if (roll < (acc += HK.tileProb(st, 'copper', d))) t = 'copper';
      else if (roll < (acc += HK.tileProb(st, 'silver', d))) t = 'silver';
      else if (roll < (acc += HK.tileProb(st, 'gold', d))) t = 'gold';
      else if (roll < (acc += HK.tileProb(st, 'gem', d))) t = 'gem'; // 심부에만 확률 정의됨
      else if (roll < (acc += C.CAPSULE_PROB)) t = 'capsule';
      row.push({ t: t, dug: false });
    }
    g.push(row);
  }

  // 은·금 군집 생성: 35% 확률로 인접 흙 1칸에 같은 광물 복제
  // → "저기 금이 두 개 보인다"가 곧 유혹(갈등의 재료). 스냅샷을 먼저 모아 연쇄 증식을 방지
  var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  var seeds = [];
  for (var r1 = 1; r1 < C.ROWS; r1++) for (var c1 = 0; c1 < C.COLS; c1++) {
    if (g[r1][c1].t === 'silver' || g[r1][c1].t === 'gold') seeds.push([r1, c1]);
  }
  seeds.forEach(function (s) {
    if (Math.random() >= 0.35) return;
    var dir = dirs[Math.floor(Math.random() * dirs.length)];
    var nr = s[0] + dir[1], nc = s[1] + dir[0];
    if (nr < 1 || nr >= C.ROWS || nc < 0 || nc >= C.COLS) return;
    if (g[nr][nc].t === 'dirt') g[nr][nc].t = g[s[0]][s[1]].t;
  });

  // 암반 게이트 (콘텐츠 2단계, docs/05 §3): 암반대 하부를 벽으로 막아
  // 심부(41m~) 진입을 곡괭이 Lv2 구매에 묶는다. fullRow는 우회 불가한 완전한 벽
  var gate = C.HARDROCK_GATE;
  for (var gc = 0; gc < C.COLS; gc++) g[gate.fullRow][gc] = { t: 'hardrock', dug: false };
  gate.mixedRows.forEach(function (gr) {
    for (var mc = 0; mc < C.COLS; mc++) {
      if (Math.random() < gate.mixedProb) g[gr][mc] = { t: 'hardrock', dug: false };
    }
  });

  // 유물 배치 (콘텐츠 3단계): 아직 확정 회수하지 못한 유물만 고정 위치에 생성
  // → 사망으로 잃어도 "같은 자리에 그대로 있다"가 재도전 동기가 된다
  HK.CFG.RELICS.forEach(function (rl, i) {
    if (!HK.state.meta.relics[i]) g[rl.row][rl.col] = { t: 'relic', idx: i, dug: false };
  });

  // 쪽지 배치 (스토리, docs/07 §3): 미수집만 고정 위치에 생성 — 줍는 즉시 확정이라 재등장 없음
  HK.STORY.NOTES.forEach(function (n, i) {
    if (!HK.state.meta.notes[i]) g[n.row][n.col] = { t: 'note', idx: i, dug: false };
  });

  // "첫 재미 10초" 보장 (기획서 §4): 시작 지점 근처는 안전 + 즉시 보상
  // - 1~3행의 중앙 3열(3~5열)에서 숨은 위험(가스·붕괴) 제거
  // - [1,4]·[2,3]에 구리 강제 배치 (이미 다른 광물·캡슐이면 그대로 둠)
  for (var rr = 1; rr <= 3; rr++) for (var cc = 3; cc <= 5; cc++) {
    if (g[rr][cc].t === 'gas' || g[rr][cc].t === 'collapse') g[rr][cc].t = 'dirt';
  }
  if (g[1][4].t === 'stone' || g[1][4].t === 'dirt') g[1][4].t = 'copper';
  if (g[2][3].t === 'stone' || g[2][3].t === 'dirt') g[2][3].t = 'copper';
  return g;
};

HK.isMineral = function (t) { return t === 'copper' || t === 'silver' || t === 'gold' || t === 'gem'; };
HK.isHazard = function (t) { return t === 'gas' || t === 'collapse'; };
