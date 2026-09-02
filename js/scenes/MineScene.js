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

    // 플레이어
    this.player = this.add.rectangle(
      this.px * C.TILE + C.TILE / 2, this.gy + this.py * C.TILE + C.TILE / 2,
      C.TILE - 16, C.TILE - 16, C.COLORS.player
    ).setDepth(5);
    this.cameras.main.startFollow(this.player, false, 0.15, 0.15);

    this.buildHUD();
    this.input.on('pointerdown', this.onTap, this);
    this.refreshHUD();
  }

  // ---------- 렌더 ----------
  paintTile(r, c) {
    var C = HK.CFG, tile = this.map[r][c], o = this.tiles[r][c];
    var col;
    if (r === 0) col = C.COLORS.surface;
    else if (tile.dug) col = C.COLORS.empty;
    else if (tile.t === 'stone') col = C.COLORS.stone;
    else col = C.COLORS.dirt; // 흙·광물·가스는 같은 흙 표면 (가스는 숨은 위험)
    o.rect.setFillStyle(col);
    var mineral = !tile.dug && HK.isMineral(tile.t);
    o.inner.setVisible(mineral);
    if (mineral) o.inner.setFillStyle(C.COLORS[tile.t]);
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

    this.infoText = this.add.text(10, 34, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#e8e2c8' });
    this.hintText = this.add.text(170, 34, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ff9d5c', fontStyle: 'bold' });
    hud.push(this.infoText, this.hintText);

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
    var n = this.gasNeighbors();
    this.hintText.setText(n > 0 ? '쉭쉭… 인접 가스 ×' + n : '');
  }

  // 가스 힌트(차별화 핵심): 현재 위치에서 "안 파인" 인접 타일 중 가스 개수.
  // 램프 Lv0 = 4방향, Lv1 = 8방향(대각 포함). 위치는 특정해주지 않는다 — 추론은 플레이어 몫.
  gasNeighbors() {
    var dirs4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    var dirs8 = dirs4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    var dirs = HK.state.meta.lampLv >= 1 ? dirs8 : dirs4;
    var n = 0;
    for (var i = 0; i < dirs.length; i++) {
      var r = this.py + dirs[i][1], c = this.px + dirs[i][0];
      if (r < 0 || r >= HK.CFG.ROWS || c < 0 || c >= HK.CFG.COLS) continue;
      var t = this.map[r][c];
      if (!t.dug && t.t === 'gas') n++;
    }
    return n;
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
      }
      tile.t = 'empty';
      this.paintTile(r, c);
    }
    this.px = c; this.py = r;
    this.maxDepth = Math.max(this.maxDepth, r);
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
    this.finish(this.loot, false);
  }

  die() {
    if (this.ended) return;
    this.ended = true;
    var kept = Math.floor(this.loot * HK.CFG.DEATH_KEEP);
    var C = HK.CFG, W = C.COLS * C.TILE;
    var ov = [];
    ov.push(this.add.rectangle(0, 0, W, 1000, 0x000000, 0.72).setOrigin(0, 0));
    ov.push(this.add.text(W / 2, 230, '질식했다…', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ff6a5c', fontStyle: 'bold' }).setOrigin(0.5));
    ov.push(this.add.text(W / 2, 275, '수확 ' + this.loot + 'G → ' + kept + 'G (50% 손실)\n최대 깊이 ' + this.maxDepth + 'm', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#e8e2c8', align: 'center',
    }).setOrigin(0.5));
    var btn = this.add.text(W / 2, 340, '지상으로', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', backgroundColor: '#7d2e2e', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    var self = this;
    btn.on('pointerdown', function () { self.finishDead(kept); });
    ov.push(btn);
    for (var i = 0; i < ov.length; i++) ov[i].setScrollFactor(0).setDepth(20);
  }

  finishDead(kept) { this.doFinish(kept, true); }
  finish(gained, died) { this.ended = true; this.doFinish(gained, died); }

  // 메타 반영은 이 함수에서만: 골드 확정 + 런 수 + 최고 깊이 + 저장 → 상점으로
  doFinish(gained, died) {
    var m = HK.state.meta;
    m.gold += gained;
    m.runs += 1;
    m.bestDepth = Math.max(m.bestDepth, this.maxDepth);
    HK.state.save();
    this.scene.start('Shop', { gained: gained, raw: this.loot, died: died, depth: this.maxDepth });
  }
};
