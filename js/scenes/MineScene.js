// ============================================================================
// 광산 씬 — 코어 루프 전체 (규칙 정본: docs/04_시스템_명세.md §2)
//   클릭 굴착·이동(4방향) → 산소 소모 → 광물 수확 / 가스 발동 → 귀환 or 사망 정산
// 런 중 상태(o2·loot·위치)는 이 씬이 소유하고 저장하지 않는다(새로고침 = 런 포기).
// 메타 반영은 doFinish()에서만 일어난다.
// ============================================================================
window.HK = window.HK || {};

HK.MineScene = class extends Phaser.Scene {
  constructor() { super('Mine'); }

  create() {
    var C = HK.CFG;
    this.map = HK.genMap();
    this.px = 4; this.py = 0;
    this.o2 = HK.state.maxO2();
    this.loot = 0; this.maxDepth = 0; this.ended = false;
    this.stamps = {};      // 방문 칸의 가스 카운트 각인 (지뢰찾기식 추론 재료)
    this.warned = false;   // 산소 30% 경고는 런당 1회
    this.gy = C.HUD_H;

    this.cameras.main.setBackgroundColor('#15171d');
    this.cameras.main.setBounds(0, 0, C.COLS * C.TILE, this.gy + C.ROWS * C.TILE + 100);

    // 타일 렌더
    this.tiles = [];
    for (var r = 0; r < C.ROWS; r++) {
      var row = [];
      for (var c = 0; c < C.COLS; c++) {
        var x = c * C.TILE, y = this.gy + r * C.TILE;
        var rect = this.add.rectangle(x + 1, y + 1, C.TILE - 2, C.TILE - 2).setOrigin(0, 0);
        var inner = this.add.rectangle(x + C.TILE / 2, y + C.TILE / 2, 16, 16).setOrigin(0.5).setVisible(false);
        row.push({ rect: rect, inner: inner });
      }
      this.tiles.push(row);
    }
    for (var r2 = 0; r2 < C.ROWS; r2++) for (var c2 = 0; c2 < C.COLS; c2++) this.paintTile(r2, c2);

    // 층 경계 라벨 — "여기서부터 다른 층"이라는 체감 (명세 §2.8)
    for (var si = 1; si < C.STRATA.length; si++) {
      var st = C.STRATA[si];
      this.add.text(C.COLS * C.TILE / 2, this.gy + st.from * C.TILE - 8,
        '—  ' + st.name + '  ' + st.from + 'm  —', {
          fontFamily: 'sans-serif', fontSize: '12px', color: '#b8bcc7',
          backgroundColor: '#000000', padding: { x: 6, y: 2 },
        }).setOrigin(0.5).setDepth(6);
    }

    // 플레이어
    this.player = this.add.rectangle(
      this.px * C.TILE + C.TILE / 2, this.gy + this.py * C.TILE + C.TILE / 2,
      C.TILE - 16, C.TILE - 16, C.COLORS.player
    ).setDepth(5);
    this.cameras.main.startFollow(this.player, false, 0.15, 0.15);

    this.buildHUD();
    this.input.on('pointerdown', this.onTap, this);

    // 조작 안내 — 첫 행동과 함께 사라진다 (조작을 화면에서 알 수 있게, 명세 §2.1)
    this.guide = this.add.text(C.COLS * C.TILE / 2, C.HUD_H + 10,
      '옆 칸을 클릭 = 굴착·이동  (방향키·WASD도 가능)', {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#ffe94a',
        backgroundColor: '#000000', padding: { x: 8, y: 4 },
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9);

    // 키보드 조작 — 마우스와 완전히 동일한 규칙(인접 4방향 행동)
    var self = this;
    var bind = function (keys, dx, dy) {
      keys.forEach(function (k) {
        self.input.keyboard.on('keydown-' + k, function () { self.tryDir(dx, dy); });
      });
    };
    bind(['UP', 'W'], 0, -1);
    bind(['DOWN', 'S'], 0, 1);
    bind(['LEFT', 'A'], -1, 0);
    bind(['RIGHT', 'D'], 1, 0);

    this.stampVisited(this.py, this.px); // 시작 위치에도 각인 (첫 힌트)
    this.refreshHUD();
  }

  // 키보드 입력 → 인접 4방향 행동 (onTap과 동일한 최종 경로 act 사용)
  tryDir(dx, dy) {
    if (this.ended) return;
    var r = this.py + dy, c = this.px + dx;
    if (r < 0 || r >= HK.CFG.ROWS || c < 0 || c >= HK.CFG.COLS) return;
    this.act(r, c);
  }

  // ---------- 렌더 ----------
  paintTile(r, c) {
    var C = HK.CFG, tile = this.map[r][c], o = this.tiles[r][c];
    var col;
    if (r === 0) col = C.COLORS.surface;
    else if (tile.dug) col = C.COLORS.empty;
    else if (tile.t === 'stone') col = C.COLORS.stone;
    else col = HK.strataAt(r).dirtColor; // 흙·광물·가스·붕괴는 그 층의 흙 표면 (위험은 숨어 있다)
    o.rect.setFillStyle(col);
    // 광물·캡슐은 항상 보인다(경로 계획 대상). 가스만 숨어 있다.
    var visible = !tile.dug && (HK.isMineral(tile.t) || tile.t === 'capsule');
    o.inner.setVisible(visible);
    if (visible) o.inner.setFillStyle(C.COLORS[tile.t]);
  }

  buildHUD() {
    var C = HK.CFG, W = C.COLS * C.TILE;
    var hud = [];
    this.hudBg = this.add.rectangle(0, 0, W, C.HUD_H, C.COLORS.hudBg).setOrigin(0, 0);
    hud.push(this.hudBg);

    this.o2BarBg = this.add.rectangle(10, 10, 180, 14, 0x33363f).setOrigin(0, 0);
    this.o2Bar = this.add.rectangle(10, 10, 180, 14, 0x3fd0ff).setOrigin(0, 0);
    this.o2Text = this.add.text(196, 8, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#cfe8ff' });
    hud.push(this.o2BarBg, this.o2Bar, this.o2Text);

    this.infoText = this.add.text(10, 38, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#e8e2c8' });
    // 힌트 2종을 색으로 구분해 세로로 쌓는다: 가스(초록) / 붕괴(주황)
    this.gasHintText = this.add.text(172, 27, '', { fontFamily: 'sans-serif', fontSize: '12px', color: '#8ee85a', fontStyle: 'bold' });
    this.colHintText = this.add.text(172, 44, '', { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffb45c', fontStyle: 'bold' });
    hud.push(this.infoText, this.gasHintText, this.colHintText);

    this.returnBtn = this.add.text(W - 10, 32, '⬆ 귀환', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff',
      backgroundColor: '#2e7d4f', padding: { x: 10, y: 5 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.returnBtn.on('pointerdown', this.returnHome, this);
    hud.push(this.returnBtn);

    for (var i = 0; i < hud.length; i++) hud[i].setScrollFactor(0).setDepth(10);
  }

  refreshHUD() {
    var max = HK.state.maxO2();
    var ratio = Math.max(0, this.o2 / max);
    this.o2Bar.scaleX = ratio;
    this.o2Bar.setFillStyle(ratio < 0.3 ? 0xff5a52 : 0x3fd0ff);
    this.o2Text.setText('산소 ' + Math.max(0, this.o2) + '/' + max);
    this.infoText.setText('깊이 ' + this.py + 'm · 수확 ' + this.loot + 'G');
    var ng = this.gasNeighbors(), nc = this.collapseNeighbors();
    this.gasHintText.setText(ng > 0 ? '쉭쉭… 가스 ×' + ng : '');
    this.colHintText.setText(nc > 0 ? '우르릉… 붕괴 ×' + nc : '');

    // 산소 30% 경고(런당 1회) — 죽음을 "예고된 선택"으로 만든다: 여기서부터는 버티는 게 내 결정
    if (!this.warned && ratio > 0 && ratio <= 0.3) {
      this.warned = true;
      var C = HK.CFG, W = C.COLS * C.TILE, self = this;
      var warn = this.add.text(W / 2, 250, '산소 30%!  더 갈까, 귀환할까?', {
        fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
        backgroundColor: '#8a2f2f', padding: { x: 12, y: 8 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(15);
      this.tweens.add({ targets: warn, alpha: 0, delay: 1300, duration: 500, onComplete: function () { warn.destroy(); } });
    }
  }

  // 힌트(차별화 핵심): 해당 칸에서 "안 파인" 인접 타일 중 위험 타일 개수.
  // 계열 2종 — 가스("쉭쉭", 초록)와 붕괴("우르릉", 주황)는 따로 센다 (콘텐츠 1단계).
  // 램프 Lv0 = 4방향, Lv1 = 8방향(대각 포함). 위치는 특정해주지 않는다 — 추론은 플레이어 몫.
  gasNeighbors() { return this.countNeighborsAt(this.py, this.px, 'gas'); }
  collapseNeighbors() { return this.countNeighborsAt(this.py, this.px, 'collapse'); }

  countNeighborsAt(r0, c0, type) {
    var dirs4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    var dirs8 = dirs4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    var dirs = HK.state.meta.lampLv >= 1 ? dirs8 : dirs4;
    var n = 0;
    for (var i = 0; i < dirs.length; i++) {
      var r = r0 + dirs[i][1], c = c0 + dirs[i][0];
      if (r < 0 || r >= HK.CFG.ROWS || c < 0 || c >= HK.CFG.COLS) continue;
      var t = this.map[r][c];
      if (!t.dug && t.t === type) n++;
    }
    return n;
  }

  // 방문한 칸에 위험 카운트를 각인 — 여러 칸의 숫자를 조합해 위치를 추론하게 한다 (명세 §2.4)
  // 각인은 칸당 2개: 왼쪽(초록)=가스, 오른쪽(주황)=붕괴. 위험이 파이면 전체 재계산
  stampVisited(r, c) {
    var key = r + ',' + c;
    if (!this.stamps[key]) {
      var C = HK.CFG, cx = c * C.TILE + C.TILE / 2, cy = this.gy + r * C.TILE + C.TILE / 2;
      this.stamps[key] = {
        g: this.add.text(cx - 9, cy, '', {
          fontFamily: 'sans-serif', fontSize: '13px', color: '#8ee85a', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(4),
        c: this.add.text(cx + 9, cy, '', {
          fontFamily: 'sans-serif', fontSize: '13px', color: '#ffb45c', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(4),
      };
    }
    this.updateStamps();
  }

  updateStamps() {
    for (var key in this.stamps) {
      var p = key.split(','), r = parseInt(p[0], 10), c = parseInt(p[1], 10);
      var ng = this.countNeighborsAt(r, c, 'gas');
      var nc = this.countNeighborsAt(r, c, 'collapse');
      this.stamps[key].g.setText(ng > 0 ? String(ng) : '');
      this.stamps[key].c.setText(nc > 0 ? String(nc) : '');
    }
  }

  // ---------- 입력·행동 ----------
  // 입력 규칙: 런 종료 후 무시 / HUD 영역(화면 좌표) 무시 / 인접 4방향만 허용
  onTap(pointer) {
    if (this.ended) return;
    if (pointer.y < HK.CFG.HUD_H) return; // HUD 영역(귀환 버튼 등)은 자체 핸들러가 처리
    var C = HK.CFG;
    var c = Math.floor(pointer.worldX / C.TILE);
    var r = Math.floor((pointer.worldY - this.gy) / C.TILE);
    if (r < 0 || r >= C.ROWS || c < 0 || c >= C.COLS) return;
    if (Math.abs(c - this.px) + Math.abs(r - this.py) !== 1) return; // 인접 4방향만
    this.act(r, c);
  }

  // 행동 1회 처리 — 산소 비용 규칙(명세 §2.2):
  //   파인 칸 이동 = MOVE_COST / 흙·광물·가스 굴착 = DIRT_COST / 돌 = 곡괭이Lv별
  //   가스는 굴착 비용에 GAS_PENALTY가 "추가"된다 (합계 1+8)
  act(r, c) {
    if (this.guide) { this.guide.destroy(); this.guide = null; } // 첫 행동 시 안내 제거
    var C = HK.CFG, tile = this.map[r][c];
    if (tile.dug) {
      this.o2 -= C.MOVE_COST;
    } else {
      var cost = tile.t === 'stone' ? C.STONE_COST_BY_PICK[HK.state.meta.pickLv] : C.DIRT_COST;
      this.o2 -= cost;
      tile.dug = true;
      if (HK.isMineral(tile.t)) {
        var v = C.VALUE[tile.t];
        this.loot += v;
        this.floatText(c, r, '+' + v + 'G', '#ffd23f');
      } else if (tile.t === 'gas') {
        this.o2 -= C.GAS_PENALTY;
        this.floatText(c, r, '가스! -' + C.GAS_PENALTY + ' 산소', '#8ee85a');
        this.cameras.main.shake(140, 0.008);
      } else if (tile.t === 'collapse') {
        // 붕괴: 가스보다 아프다 (2층부터, 별도 힌트 계열 "우르릉")
        this.o2 -= C.COLLAPSE_PENALTY;
        this.floatText(c, r, '붕괴! -' + C.COLLAPSE_PENALTY + ' 산소', '#ffb45c');
        this.cameras.main.shake(220, 0.014);
      } else if (tile.t === 'capsule') {
        // 산소 캡슐: 최대치를 넘지 않는 만큼만 회복 (굴착 비용 차감 후 기준)
        var healed = Math.min(HK.state.maxO2(), this.o2 + C.O2_CAPSULE) - this.o2;
        this.o2 += healed;
        this.floatText(c, r, '+' + healed + ' 산소', '#63d8b2');
      }
      tile.t = 'empty';
      this.paintTile(r, c);
    }
    this.px = c; this.py = r;
    this.maxDepth = Math.max(this.maxDepth, r);
    this.stampVisited(r, c); // 방문 각인 + 전체 각인 재계산
    this.tweens.add({
      targets: this.player,
      x: c * C.TILE + C.TILE / 2, y: this.gy + r * C.TILE + C.TILE / 2,
      duration: 90,
    });
    this.refreshHUD();
    if (this.o2 <= 0) this.die();
  }

  floatText(c, r, str, color) {
    var C = HK.CFG;
    var t = this.add.text(c * C.TILE + C.TILE / 2, this.gy + r * C.TILE, str, {
      fontFamily: 'sans-serif', fontSize: '14px', color: color, fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(8);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 700, onComplete: function () { t.destroy(); } });
  }

  // ---------- 종료 (정산 규칙: 명세 §2.5) ----------
  // 귀환 = 수확 100% 확정(언제든, 무료) / 사망 = DEATH_KEEP 비율만 확정(내림)
  returnHome() {
    if (this.ended) return;
    this.ended = true;
    this.doFinish(this.loot, false, 'Shop');
  }

  // 사망 화면의 설계 의도(조정 1회): "질식했다"는 사실 통보가 아니라
  // ① 욕심의 대가를 숫자로 들이밀고(귀환했으면 +XG) ② 1클릭 재잠수로 "다시!"를 바로 받는다
  die() {
    if (this.ended) return;
    this.ended = true;
    var C = HK.CFG, W = C.COLS * C.TILE, self = this;
    var kept = Math.floor(this.loot * C.DEATH_KEEP);
    var lostPct = Math.round((1 - C.DEATH_KEEP) * 100);
    var ov = [];
    ov.push(this.add.rectangle(0, 0, W, 1000, 0x000000, 0.72).setOrigin(0, 0));
    ov.push(this.add.text(W / 2, 195, '질식했다…', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ff6a5c', fontStyle: 'bold',
    }).setOrigin(0.5));
    ov.push(this.add.text(W / 2, 232, '한 칸이 과했다.', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#c9c2ae',
    }).setOrigin(0.5));
    ov.push(this.add.text(W / 2, 272, '수확 ' + this.loot + 'G 중 ' + kept + 'G만 건짐 (' + lostPct + '% 손실)\n최대 깊이 ' + this.maxDepth + 'm', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#e8e2c8', align: 'center',
    }).setOrigin(0.5));
    if (this.loot > kept) {
      ov.push(this.add.text(W / 2, 318, '귀환만 했어도 +' + this.loot + 'G 확정이었다', {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#ffd23f', fontStyle: 'bold',
      }).setOrigin(0.5));
    }
    var retry = this.add.text(W / 2, 375, '⛏  다시 잠수', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', backgroundColor: '#2e7d4f', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retry.on('pointerdown', function () { self.doFinish(kept, true, 'Mine'); });
    ov.push(retry);
    var toShop = this.add.text(W / 2, 425, '지상 기지 (장비 구매)', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#cfd4dc', backgroundColor: '#3a3f4a', padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    toShop.on('pointerdown', function () { self.doFinish(kept, true, 'Shop'); });
    ov.push(toShop);
    for (var i = 0; i < ov.length; i++) ov[i].setScrollFactor(0).setDepth(20);
  }

  // 메타 반영은 이 함수에서만: 골드 확정 + 런 수 + 최고 깊이 + 저장 → 목적지 씬으로
  // dest='Mine'이면 즉시 재잠수(리트라이 1클릭), 'Shop'이면 요약과 함께 지상 기지
  doFinish(gained, died, dest) {
    var m = HK.state.meta;
    m.gold += gained;
    m.runs += 1;
    m.bestDepth = Math.max(m.bestDepth, this.maxDepth);
    HK.state.save();
    if (dest === 'Mine') this.scene.start('Mine');
    else this.scene.start('Shop', { gained: gained, raw: this.loot, died: died, depth: this.maxDepth });
  }
};
