/* H.E.R.O. — local Atari-style remake. */
(() => {
  const VW = 320;
  const VH = 200;
  const T = 8;
  const HUD = 22;
  const PLAY = VH - HUD;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = VW;
  canvas.height = VH;

  const overlay = document.getElementById("overlay");
  const overlayRoot = document.getElementById("overlay-root");

  const S = window.HERO_SPRITES;
  const A = window.HERO_AUDIO;
  const LV = window.HERO_LEVELS;

  const keys = Object.create(null);
  const hold = Object.create(null);

  let state = "menu";
  let startLevel = 0;
  let levelIndex = 0;
  let pro = false;
  let score = 0;
  let lives = 4;
  let hi = Number(localStorage.getItem("hero_hi") || 0);
  let power = 1;
  let powerStarted = false;
  let dynamite = 6;
  let extraAt = 20000;
  let map = [];
  let hp = [];
  let rows = 0;
  let player = null;
  let miner = null;
  let ents = [];
  let bombs = [];
  let parts = [];
  let camY = 0;
  let shake = 0;
  let flash = 0;
  let laserOn = false;
  let laserHit = null;
  let wallHeat = new Map();
  let time = 0;
  let banner = "";
  let bannerT = 0;
  let rescueT = 0;
  let deadT = 0;
  let last = 0;
  let lowBeep = 0;
  let debug = /[?&]debug=1/.test(location.search);
  const bot = /[?&]bot=1/.test(location.search);

  function fit() {
    const maxW = Math.min(window.innerWidth - 48, window.innerHeight * 1.62);
    const scale = Math.max(2, Math.floor(maxW / VW));
    canvas.style.width = VW * scale + "px";
    canvas.style.height = VH * scale + "px";
  }
  window.addEventListener("resize", fit);
  fit();

  function solidAt(tx, ty) {
    if (ty < 0 || tx < 0 || tx >= 40 || ty >= rows) return true;
    const c = map[ty][tx];
    return c === "#" || c === "=" || c === "M";
  }

  function tile(px, py) {
    return { x: Math.floor(px / T), y: Math.floor(py / T) };
  }

  function charAt(px, py) {
    const t = tile(px, py);
    if (t.y < 0 || t.x < 0 || t.x >= 40 || t.y >= rows) return "#";
    return map[t.y][t.x];
  }

  function aabbTiles(r, fn) {
    const x0 = Math.floor(r.x / T);
    const y0 = Math.floor(r.y / T);
    const x1 = Math.floor((r.x + r.w - 0.01) / T);
    const y1 = Math.floor((r.y + r.h - 0.01) / T);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) fn(x, y);
    }
  }

  function resolve(e, dx, dy) {
    e.x += dx;
    const sx = Math.sign(dx) || 1;
    aabbTiles(e, (tx, ty) => {
      if (!solidAt(tx, ty)) return;
      if (sx > 0) e.x = Math.min(e.x, tx * T - e.w);
      else e.x = Math.max(e.x, (tx + 1) * T);
    });
    e.y += dy;
    e.onGround = false;
    aabbTiles(e, (tx, ty) => {
      if (!solidAt(tx, ty)) return;
      if (dy > 0) {
        e.y = Math.min(e.y, ty * T - e.h);
        e.vy = 0;
        e.onGround = true;
      } else if (dy < 0) {
        e.y = Math.max(e.y, (ty + 1) * T);
        e.vy = 0;
      }
    });
  }

  function spawnPart(x, y, vx, vy, col, life) {
    parts.push({ x, y, vx, vy, col, life, max: life });
  }

  function burst(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * 50;
      spawnPart(x, y, Math.cos(a) * s, Math.sin(a) * s, col, 0.25 + Math.random() * 0.35);
    }
  }

  function loadLevel(i, keepScore) {
    levelIndex = i;
    pro = i >= 20;
    const src = LV.get(Math.min(i, 19));
    map = src.map((r) => r);
    rows = map.length;
    hp = map.map((r) => r.split("").map((c) => (c === "=" ? 3 : 0)));
    ents = [];
    bombs = [];
    parts = [];
    wallHeat.clear();
    dynamite = 6;
    power = 1;
    powerStarted = false;
    laserOn = false;
    laserHit = null;
    shake = 0;
    flash = 0;
    rescueT = 0;
    deadT = 0;
    camY = 0;
    player = { x: 160, y: 16, w: 7, h: 14, vx: 0, vy: 0, face: 1, onGround: false, fly: false, anim: 0 };
    miner = { x: 0, y: 0, w: 7, h: 14, wave: 0 };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < 40; x++) {
        const c = map[y][x];
        const px = x * T + 1;
        const py = y * T;
        if (c === "P") {
          player.x = x * T + 0.5;
          player.y = y * T + 1;
          setCell(x, y, ".");
        } else if (c === "W") {
          miner.x = px;
          miner.y = py + T - 14;
          setCell(x, y, ".");
        } else if (c === "L") {
          ents.push({ kind: "lantern", x: px, y: py, w: 6, h: 8, lit: true });
          setCell(x, y, ".");
        } else if (c === "s") {
          ents.push({ kind: "spider", x: px, y: py + 3, w: 8, h: 5, t: Math.random() * 10, vx: 0, vy: 0 });
          setCell(x, y, ".");
        } else if (c === "b") {
          ents.push({ kind: "bat", x: px, y: py, w: 10, h: 5, t: Math.random() * 10, ox: px, oy: py });
          setCell(x, y, ".");
        } else if (c === "m") {
          ents.push({ kind: "moth", x: px, y: py, w: 8, h: 6, t: Math.random() * 10, ox: px, oy: py });
          setCell(x, y, ".");
        } else if (c === "n") {
          ents.push({ kind: "snake", x: px, y: py, w: 8, h: 6, t: Math.random() * 6, ox: px, oy: py, out: false });
          setCell(x, y, ".");
        } else if (c === "r") {
          ents.push({ kind: "raft", x: px, y: py + 4, w: 16, h: 4, vx: 18, min: px - 24, max: px + 80 });
          setCell(x, y, "~");
        } else if (c === "t") {
          ents.push({ kind: "tentacle", x: px, y: py - 20, w: 8, h: 12, hx: px + 4, baseY: py });
          setCell(x, y, "~");
        }
      }
    }
    snapDown(miner);
    if (!keepScore) {
      /* score persists across levels */
    }
    banner = pro ? "PRO" : "LEVEL " + String(i + 1).padStart(2, "0");
    bannerT = 1.6;
    state = "play";
  }

  function setCell(x, y, c) {
    if (y < 0 || y >= rows || x < 0 || x >= 40) return;
    map[y] = map[y].slice(0, x) + c + map[y].slice(x + 1);
  }

  function snapDown(e) {
    for (let i = 0; i < 48; i++) {
      const ty = Math.floor((e.y + e.h) / T);
      const tx = Math.floor((e.x + e.w / 2) / T);
      if (solidAt(tx, ty)) break;
      e.y += 1;
    }
  }

  function addScore(n) {
    const prev = score;
    score += n;
    if (score >= extraAt && lives < 7) {
      lives++;
      extraAt += 20000;
      A.extra();
      banner = "EXTRA LIFE";
      bannerT = 1.2;
    }
    if (score > hi) {
      hi = score;
      localStorage.setItem("hero_hi", String(hi));
    }
    if (prev < 1000000 && score >= 1000000) {
      A.win();
      state = "win";
      showEnd(true);
    }
  }

  function kill(reason) {
    if (state !== "play") return;
    state = "dead";
    deadT = 1.1;
    lives--;
    A.die();
    A.thrust(false);
    flash = 0.25;
    shake = 8;
    burst(player.x + 3, player.y + 7, 18, "#f8d830");
    burst(player.x + 3, player.y + 7, 10, "#d82818");
  }

  function explode(x, y, r, fromBomb) {
    A.boom();
    shake = 6;
    flash = 0.12;
    burst(x, y, 22, "#f8d830");
    burst(x, y, 12, "#f85018");
    const x0 = Math.floor((x - r) / T);
    const x1 = Math.floor((x + r) / T);
    const y0 = Math.floor((y - r) / T);
    const y1 = Math.floor((y + r) / T);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (ty < 0 || ty >= rows || tx < 0 || tx >= 40) continue;
        if (map[ty][tx] === "=") {
          const cx = tx * T + 4;
          const cy = ty * T + 4;
          if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) {
            setCell(tx, ty, ".");
            hp[ty][tx] = 0;
            addScore(75);
          }
        }
      }
    }
    ents = ents.filter((e) => {
      if (e.kind === "lantern" || e.kind === "raft" || e.kind === "tentacle") return true;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      if ((ex - x) ** 2 + (ey - y) ** 2 < r * r) {
        addScore(50);
        burst(ex, ey, 8, "#50c848");
        return false;
      }
      return true;
    });
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    if ((px - x) ** 2 + (py - y) ** 2 < (r - 6) * (r - 6)) kill("bomb");
  }

  function placeBomb() {
    if (dynamite <= 0 || !player.onGround) return;
    if (bombs.length) return;
    dynamite--;
    A.place();
    bombs.push({ x: player.x + 2, y: player.y + 6, t: 1.05 });
    player.vx = -player.face * 80;
  }

  function hitLantern(e) {
    if (!e.lit) return;
    e.lit = false;
    A.lantern();
    burst(e.x + 3, e.y + 3, 6, "#f8d830");
  }

  function regionDark(py) {
    const y0 = Math.floor(py / (PLAY));
    const top = y0 * Math.floor(PLAY / T);
    const bot = top + Math.ceil(PLAY / T) + 2;
    let lamps = 0;
    let lit = 0;
    for (const e of ents) {
      if (e.kind !== "lantern") continue;
      const ey = e.y / T;
      if (ey >= top && ey <= bot) {
        lamps++;
        if (e.lit) lit++;
      }
    }
    return lamps > 0 && lit === 0;
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function clearKeys() {
    keys.ArrowLeft = keys.ArrowRight = keys.ArrowUp = keys.ArrowDown = false;
    keys.Space = keys.KeyX = keys.KeyZ = false;
  }

  function blockedAhead() {
    const x = Math.floor((player.x + player.w + 3) / T);
    const y0 = Math.floor(player.y / T);
    const y1 = Math.floor((player.y + player.h - 1) / T);
    for (let tx = x; tx <= x + 1; tx++) {
      for (let y = y0; y <= y1; y++) {
        if (solidAt(tx, y)) return map[y] && (map[y][tx] === "=" || map[y][tx] === "#" || map[y][tx] === "M");
      }
    }
    return false;
  }

  function updateBot() {
    if (!bot || state !== "play" || !player) return;
    clearKeys();
    if (bombs.length) {
      keys.ArrowLeft = true;
      return;
    }
    if (player.y < 18 * T) {
      keys.ArrowDown = true;
      return;
    }
    if (blockedAhead()) {
      if (player.onGround && dynamite > 0) keys.KeyX = true;
      else keys.Space = true;
      return;
    }
    if (player.x + player.w < miner.x) keys.ArrowRight = true;
    else if (player.x > miner.x + miner.w) keys.ArrowLeft = true;
    if (player.y > miner.y + 8) keys.ArrowUp = true;
  }

  function snapshot() {
    return {
      state,
      score,
      lives,
      lv: levelIndex + 1,
      dyn: dynamite,
      power: Number(power.toFixed(3)),
      x: player ? Math.round(player.x) : 0,
      y: player ? Math.round(player.y) : 0,
      ground: !!(player && player.onGround),
      bombs: bombs.length
    };
  }

  function updatePlay(dt) {
    updateBot();
    time += dt;
    const speedMul = 1 + Math.min(0.55, levelIndex * 0.028) + (pro ? 0.2 : 0);
    const drain = (0.018 + levelIndex * 0.0018) * (laserOn ? 1.25 : 1);

    const left = keys.ArrowLeft || keys.KeyA;
    const right = keys.ArrowRight || keys.KeyD;
    const up = keys.ArrowUp || keys.KeyW;
    const down = keys.ArrowDown || keys.KeyS;
    laserOn = !!(keys.Space || keys.KeyZ || keys.KeyJ || hold.laser);
    const bomb = keys.KeyX || hold.bomb || (down && player.onGround && !left && !right);

    if ((left || right || up || down || laserOn || bomb) && !powerStarted) powerStarted = true;

    if (powerStarted) {
      power -= drain * dt;
      if (power <= 0) {
        power = 0;
        kill("power");
        return;
      }
      if (power < 0.18) {
        lowBeep -= dt;
        if (lowBeep <= 0) {
          A.powerlow();
          lowBeep = 0.45;
        }
      }
    }

    if (bomb && !player._bombLatch) {
      placeBomb();
      player._bombLatch = true;
    }
    if (!bomb) player._bombLatch = false;

    const acc = 140;
    const maxX = player.onGround ? 62 : 70;
    if (left) {
      player.vx -= acc * dt;
      player.face = -1;
    }
    if (right) {
      player.vx += acc * dt;
      player.face = 1;
    }
    if (!left && !right) player.vx *= player.onGround ? 0.55 : 0.86;

    player.vx = Math.max(-maxX, Math.min(maxX, player.vx));

    if (up) {
      player.vy -= 210 * dt;
      player.vy *= 0.90;
      player.fly = true;
      A.thrust(true);
    } else {
      player.vy += 210 * dt;
      player.fly = !player.onGround;
      A.thrust(false);
    }
    if (down && !player.onGround) player.vy += 80 * dt;
    player.vy = Math.max(-90, Math.min(130, player.vy));

    player.anim += dt * (player.fly ? 16 : Math.abs(player.vx) > 8 ? 10 : 0);

    resolve(player, player.vx * dt, player.vy * dt);
    player.x = Math.max(2, Math.min(40 * T - player.w - 2, player.x));
    if (player.y < 0) {
      player.y = 0;
      player.vy = 0;
    }
    if (player.y > rows * T + 16) kill("fall");

    /* raft carry */
    let onRaft = false;
    for (const e of ents) {
      if (e.kind !== "raft") continue;
      const feet = { x: player.x, y: player.y + player.h - 2, w: player.w, h: 3 };
      if (overlap(feet, e) && player.vy >= 0) {
        player.y = e.y - player.h;
        player.vy = 0;
        player.onGround = true;
        onRaft = true;
        player.x += e.vx * dt;
      }
    }

    /* hazards from tiles */
    let magma = false;
    let lava = false;
    aabbTiles(player, (tx, ty) => {
      if (ty < 0 || ty >= rows || tx < 0 || tx >= 40) return;
      const c = map[ty][tx];
      if (c === "M") magma = true;
      if (c === "~" && player.y + player.h > ty * T + 2) lava = true;
    });
    if (magma || (lava && !onRaft)) {
      kill("lava");
      return;
    }

    /* laser */
    laserHit = null;
    if (laserOn) {
      A.laser();
      const ox = player.x + (player.face > 0 ? player.w : 0);
      const oy = player.y + 5;
      let hx = ox + player.face * 92;
      let hy = oy;
      const step = 2;
      for (let d = 0; d < 92; d += step) {
        const px = ox + player.face * d;
        const py = oy;
        const c = charAt(px, py);
        const t = tile(px, py);
        let hitEnt = null;
        for (const e of ents) {
          if (px >= e.x && px <= e.x + e.w && py >= e.y && py <= e.y + e.h) {
            hitEnt = e;
            break;
          }
        }
        if (hitEnt) {
          hx = px;
          hy = py;
          if (hitEnt.kind === "lantern") hitLantern(hitEnt);
          else if (hitEnt.kind !== "raft" && hitEnt.kind !== "tentacle") {
            addScore(50);
            burst(hitEnt.x + 3, hitEnt.y + 3, 8, "#f8d830");
            A.zap();
            ents = ents.filter((z) => z !== hitEnt);
          }
          break;
        }
        if (c === "#" || c === "M") {
          hx = px;
          hy = py;
          break;
        }
        if (c === "=") {
          hx = px;
          hy = py;
          const key = t.x + "," + t.y;
          const near = Math.max(0.45, 1.4 - d / 80);
          wallHeat.set(key, (wallHeat.get(key) || 0) + dt * near * 2.2);
          if (wallHeat.get(key) >= 1) {
            hp[t.y][t.x]--;
            wallHeat.set(key, 0);
            burst(px, py, 4, "#c07028");
            if (hp[t.y][t.x] <= 0) {
              setCell(t.x, t.y, ".");
              addScore(75);
            }
          }
          break;
        }
      }
      laserHit = { x0: ox, y0: oy, x1: hx, y1: hy };
    }

    /* entities */
    const espeed = speedMul;
    for (const e of ents) {
      if (e.kind === "spider") {
        e.t += dt * espeed;
        e.y += Math.sin(e.t * 7) * 22 * dt;
        e.x += Math.sin(e.t * 1.7) * 18 * dt;
      } else if (e.kind === "bat") {
        e.t += dt * espeed;
        e.x = e.ox + Math.sin(e.t * 2.2) * 28;
        e.y = e.oy + Math.sin(e.t * 4.4) * 6;
      } else if (e.kind === "moth") {
        e.t += dt * espeed;
        e.x = e.ox + Math.sin(e.t * 3.1) * 16 + Math.cos(e.t * 1.4) * 10;
        e.y = e.oy + Math.cos(e.t * 2.6) * 10;
      } else if (e.kind === "snake") {
        e.t += dt * espeed;
        e.out = Math.sin(e.t * 1.6) > 0.15;
        e.x = e.ox + (e.out ? 6 : 0);
      } else if (e.kind === "raft") {
        e.x += e.vx * dt;
        if (e.x < e.min || e.x > e.max) e.vx *= -1;
      } else if (e.kind === "tentacle") {
        const tx = player.x + player.w / 2;
        e.hx += (tx - e.hx) * Math.min(1, 1.6 * espeed * dt);
        e.x = e.hx - 4;
        e.y = e.baseY - 22;
        e.w = 8;
        e.h = 12;
      }

      if (e.kind === "lantern" && e.lit && overlap(player, e)) hitLantern(e);

      const lethal = e.kind === "spider" || e.kind === "bat" || e.kind === "moth" || (e.kind === "snake" && e.out) || e.kind === "tentacle";
      if (lethal && overlap(player, e)) {
        kill(e.kind);
        return;
      }
    }

    for (const b of bombs) {
      b.t -= dt;
      if (b.t <= 0) explode(b.x + 2, b.y + 4, 30, true);
    }
    bombs = bombs.filter((b) => b.t > 0);

    if (overlap(player, miner)) {
      state = "rescue";
      rescueT = 0;
      A.thrust(false);
      A.rescue();
    }

    const target = player.y - PLAY * 0.38;
    camY += (target - camY) * Math.min(1, 6 * dt);
    camY = Math.max(0, Math.min(rows * T - PLAY, camY));

    if (bannerT > 0) bannerT -= dt;
    if (shake > 0) shake *= Math.pow(0.04, dt);
    if (flash > 0) flash -= dt;
  }

  function updateRescue(dt) {
    rescueT += dt;
    miner.wave += dt * 8;
    if (rescueT > 1.55) {
      const pbonus = Math.floor(power * (45 + levelIndex * 18));
      addScore(1000 + dynamite * 50 + pbonus);
      if (state === "win") return;
      let next = levelIndex + 1;
      if (startLevel === 16 && levelIndex >= 16) next = 16 + Math.floor(Math.random() * 4);
      loadLevel(next, true);
    }
  }

  function updateDead(dt) {
    deadT -= dt;
    if (deadT <= 0) {
      if (lives <= 0) {
        state = "over";
        showEnd(false);
      } else loadLevel(levelIndex, true);
    }
  }

  function updateParts(dt) {
    for (const p of parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
    }
    parts = parts.filter((p) => p.life > 0);
  }

  function drawSprite(spr, x, y, face, frame) {
    const fr = spr[frame % spr.length];
    for (let i = 0; i < fr.px.length; i += 3) {
      let px = fr.px[i];
      const py = fr.px[i + 1];
      if (face < 0) px = fr.w - 1 - px;
      ctx.fillStyle = fr.px[i + 2];
      ctx.fillRect(Math.floor(x + px), Math.floor(y + py), 1, 1);
    }
  }

  function wy(y) {
    return HUD + y - camY;
  }

  function drawTiles() {
    const y0 = Math.max(0, Math.floor(camY / T) - 1);
    const y1 = Math.min(rows - 1, Math.floor((camY + PLAY) / T) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < 40; x++) {
        const c = map[y][x];
        const sx = x * T;
        const sy = wy(y * T);
        if (sy < HUD - T || sy > VH) continue;
        if (c === "^") {
          ctx.fillStyle = "#3a78c8";
          ctx.fillRect(sx, sy, T, T);
          if (y === 5 || (map[y + 1] && map[y + 1][x] === "#")) {
            ctx.fillStyle = "#50a060";
            ctx.fillRect(sx, sy + 6, T, 2);
          }
        } else if (c === "#" || c === "=") {
          const pulse = c === "=" ? 8 : 0;
          ctx.fillStyle = c === "=" ? "#a86830" : "#c07830";
          ctx.fillRect(sx, sy, T, T);
          ctx.fillStyle = "#8a4820";
          ctx.fillRect(sx, sy + 3, T, 1);
          ctx.fillRect(sx + ((x + y) % 2 === 0 ? 2 : 5), sy, 1, T);
          if (c === "=") {
            ctx.fillStyle = "#6a3010";
            ctx.fillRect(sx + 2, sy + 2, 4, 1);
            ctx.fillRect(sx + 1, sy + 5, 3, 1);
          }
          ctx.fillStyle = "#e8a050";
          ctx.fillRect(sx, sy, T, 1);
        } else if (c === "M") {
          const g = 0.5 + 0.5 * Math.sin(time * 8 + x + y);
          ctx.fillStyle = g > 0.55 ? "#ff4018" : "#a01810";
          ctx.fillRect(sx, sy, T, T);
          ctx.fillStyle = "#ffd060";
          ctx.fillRect(sx + 2, sy + 3, 3, 2);
        } else if (c === "~") {
          const w = Math.sin(time * 6 + x * 0.8) * 1.2;
          ctx.fillStyle = "#c01008";
          ctx.fillRect(sx, sy, T, T);
          ctx.fillStyle = "#ff5018";
          ctx.fillRect(sx, sy + 1 + w, T, 2);
          ctx.fillStyle = "#ffd040";
          ctx.fillRect(sx + 2, sy + 2 + w, 2, 1);
        }
      }
    }
  }

  function drawGame() {
    ctx.fillStyle = "#040404";
    ctx.fillRect(0, HUD, VW, PLAY);

    ctx.save();
    if (shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawTiles();

    for (const e of ents) {
      const x = e.x;
      const y = wy(e.y);
      if (e.kind === "lantern") {
        if (e.lit) drawSprite(S.lantern, x, y, 1, Math.floor(time * 6));
        else {
          ctx.fillStyle = "#303030";
          ctx.fillRect(x + 2, y + 2, 3, 5);
        }
      } else if (e.kind === "spider") drawSprite(S.spider, x, y, 1, Math.floor(time * 8));
      else if (e.kind === "bat") drawSprite(S.bat, x, y, 1, Math.floor(time * 10));
      else if (e.kind === "moth") drawSprite(S.moth, x, y, 1, Math.floor(time * 8));
      else if (e.kind === "snake") drawSprite(S.snake, x, y, 1, e.out ? 1 : 0);
      else if (e.kind === "raft") drawSprite(S.raft, x, y, 1, 0);
      else if (e.kind === "tentacle") {
        ctx.strokeStyle = "#e03820";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.hx, wy(e.baseY + 6));
        ctx.quadraticCurveTo(e.hx + Math.sin(time * 4) * 6, wy(e.baseY - 8), e.hx, wy(e.baseY - 22));
        ctx.stroke();
        drawSprite(S.tentacle, e.hx - 3, wy(e.baseY - 26), 1, 0);
      }
    }

    drawSprite(S.miner, miner.x, wy(miner.y), -1, state === "rescue" ? Math.floor(miner.wave) : 0);

    for (const b of bombs) {
      drawSprite(S.dyno, b.x, wy(b.y), 1, 0);
      const glow = 10 + Math.sin(time * 20) * 4;
      ctx.fillStyle = "rgba(255,200,40,0.18)";
      ctx.beginPath();
      ctx.arc(b.x + 2, wy(b.y), glow, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state !== "dead") {
      const fly = player.fly || !player.onGround;
      drawSprite(fly ? S.heroFly : S.heroWalk, player.x - 2, wy(player.y) - 1, player.face, Math.floor(player.anim));
    }

    if (laserHit) {
      ctx.strokeStyle = "#fff06a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(laserHit.x0, wy(laserHit.y0));
      ctx.lineTo(laserHit.x1, wy(laserHit.y1));
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(laserHit.x1 - 1, wy(laserHit.y1) - 1, 2, 2);
    }

    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, wy(p.y), 2, 2);
      ctx.globalAlpha = 1;
    }

    if (regionDark(player.y) || regionDark(camY + 40)) {
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.beginPath();
      ctx.rect(0, HUD, VW, PLAY);
      const gx = player.x + 3;
      const gy = wy(player.y + 7);
      ctx.moveTo(gx + 26, gy);
      ctx.arc(gx, gy, 26, 0, Math.PI * 2);
      for (const b of bombs) {
        const bx = b.x + 2;
        const by = wy(b.y);
        ctx.moveTo(bx + 50, by);
        ctx.arc(bx, by, 50, 0, Math.PI * 2);
      }
      ctx.fill("evenodd");
    }

    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,220,160," + (flash * 1.6) + ")";
      ctx.fillRect(0, HUD, VW, PLAY);
    }

    drawHud();

    if (bannerT > 0) {
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(banner, 161, 104);
      ctx.fillStyle = "#f8d830";
      ctx.fillText(banner, 160, 103);
    }

    if (debug) {
      ctx.fillStyle = "#0f0";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText("L" + (levelIndex + 1) + " y=" + player.y.toFixed(0), 4, VH - 4);
    }
  }

  function drawHud() {
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, VW, HUD);
    ctx.fillStyle = "#2a2010";
    ctx.fillRect(0, HUD - 1, VW, 1);

    ctx.fillStyle = "#f4ecd0";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(String(score).padStart(6, "0"), 6, 14);

    ctx.fillStyle = "#888";
    ctx.fillText("HI " + String(hi).padStart(6, "0"), 70, 14);

    for (let i = 0; i < Math.max(0, lives - 1); i++) {
      drawSprite(S.life, 148 + i * 9, 6, 1, 0);
    }

    for (let i = 0; i < dynamite; i++) {
      ctx.fillStyle = "#c07028";
      ctx.fillRect(210 + i * 6, 7, 3, 8);
      ctx.fillStyle = "#d82818";
      ctx.fillRect(211 + i * 6, 6, 1, 2);
    }

    ctx.fillStyle = "#333";
    ctx.fillRect(250, 7, 64, 8);
    ctx.fillStyle = power < 0.18 && Math.sin(time * 12) > 0 ? "#f85018" : "#f8d830";
    ctx.fillRect(250, 7, Math.max(0, 64 * power), 8);
    ctx.strokeStyle = "#888";
    ctx.strokeRect(250, 7, 64, 8);
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    if (state === "play") updatePlay(dt);
    else if (state === "rescue") updateRescue(dt);
    else if (state === "dead") updateDead(dt);
    updateParts(dt);
    if (state === "play" || state === "rescue" || state === "dead" || state === "paused") drawGame();
    if (bot) document.title = JSON.stringify(snapshot());
    requestAnimationFrame(loop);
  }

  function showMenu() {
    state = "menu";
    A.thrust(false);
    overlay.classList.remove("hidden");
    overlayRoot.innerHTML = `
      <div class="bg"></div>
      <div class="panel">
        <h1>H.E.R.O.<span>HELICOPTER EMERGENCY RESCUE OPERATION</span></h1>
        <p class="tag">Leone 火山矿井 · 背包 · 激光 · 炸药</p>
        <button class="menu-btn primary" data-act="start">开始救援　LEVEL 01</button>
        <div class="row">
          <button class="menu-btn" data-act="g" data-l="0">1</button>
          <button class="menu-btn" data-act="g" data-l="4">5</button>
          <button class="menu-btn" data-act="g" data-l="8">9</button>
          <button class="menu-btn" data-act="g" data-l="12">13</button>
          <button class="menu-btn" data-act="g" data-l="16">17</button>
        </div>
        <button class="menu-btn" data-act="howto">操作说明</button>
        <p class="fine">最高分 ${String(hi).padStart(6, "0")}　·　全部文件已在本文件夹</p>
      </div>`;
  }

  function showHowto() {
    overlay.classList.remove("hidden");
    overlayRoot.innerHTML = `
      <div class="bg"></div>
      <div class="panel howto">
        <h2>R. HERO 手册</h2>
        <p><kbd>↑</kbd> / <kbd>W</kbd> 飞行　　<kbd>←</kbd><kbd>→</kbd> 左右</p>
        <p><kbd>↓</kbd> / <kbd>X</kbd> 站在地上放置炸药（马上离开，否则会被炸到）</p>
        <p><kbd>空格</kbd> / <kbd>Z</kbd> 头盔激光：打怪，也能慢慢切开落石墙</p>
        <p><kbd>P</kbd> 暂停　　<kbd>M</kbd> 静音　　<kbd>Esc</kbd> 回标题</p>
        <p>炸药炸墙 75 分，打怪 50 分，救人 1000 分，剩余炸药和能量另有奖励。每 20000 分加一条命。能量耗尽、碰到岩浆/蜘蛛/蝙蝠/飞蛾/蛇/触手/炸药都会丢命。</p>
        <p>灯被碰到或打出会让这一段矿井变黑；炸药导火索能临时照亮。</p>
        <button class="menu-btn primary" data-act="menu">返回</button>
      </div>`;
  }

  function showEnd(win) {
    overlay.classList.remove("hidden");
    overlayRoot.innerHTML = `
      <div class="bg"></div>
      <div class="panel">
        <h1>${win ? "!!!!!!" : "GAME OVER"}<span>${win ? "一天的救援到此为止" : "矿井收回了又一条命"}</span></h1>
        <p class="tag">得分 ${String(score).padStart(6, "0")}　最高 ${String(hi).padStart(6, "0")}</p>
        <button class="menu-btn primary" data-act="again">再来一次</button>
        <button class="menu-btn" data-act="menu">回标题</button>
      </div>`;
  }

  function begin(lv) {
    A.resume();
    A.start();
    overlay.classList.add("hidden");
    canvas.focus();
    startLevel = lv;
    score = 0;
    lives = 4;
    extraAt = 20000;
    loadLevel(lv, false);
  }

  overlay.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    A.menu();
    const act = btn.getAttribute("data-act");
    if (act === "start") begin(0);
    else if (act === "g") begin(Number(btn.getAttribute("data-l")));
    else if (act === "howto") showHowto();
    else if (act === "menu") showMenu();
    else if (act === "again") begin(startLevel);
  });

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "KeyM") A.toggle();
    if (e.code === "KeyP" && (state === "play" || state === "paused")) {
      state = state === "play" ? "paused" : "play";
      banner = state === "paused" ? "PAUSED" : "";
      bannerT = state === "paused" ? 999 : 0;
      A.thrust(false);
    }
    if (e.code === "Escape") {
      showMenu();
    }
    if (debug && e.code === "KeyN" && state === "play") loadLevel(levelIndex + 1, true);
    if (state === "menu" && (e.code === "Enter" || e.code === "Space")) begin(0);
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  /* on-screen pad */
  const touch = document.getElementById("touch");
  if (touch) {
    const bind = (sel, code, flag) => {
      const el = touch.querySelector(sel);
      if (!el) return;
      const on = (v) => (ev) => {
        ev.preventDefault();
        if (flag) hold[flag] = v;
        else keys[code] = v;
      };
      el.addEventListener("pointerdown", on(true));
      el.addEventListener("pointerup", on(false));
      el.addEventListener("pointerleave", on(false));
      el.addEventListener("pointercancel", on(false));
    };
    bind(".up", "ArrowUp");
    bind(".down", "ArrowDown");
    bind(".left", "ArrowLeft");
    bind(".right", "ArrowRight");
    bind(".laser", null, "laser");
    bind(".bomb", null, "bomb");
  }

  function simulate(seconds) {
    const dt = 1 / 60;
    const until = seconds;
    for (let t = 0; t < until; t += dt) {
      if (state === "play") updatePlay(dt);
      else if (state === "rescue") updateRescue(dt);
      else if (state === "dead") updateDead(dt);
      updateParts(dt);
    }
    return snapshot();
  }

  window.HERO = { begin, showMenu, snapshot, simulate, debug: () => debug };
  showMenu();
  if (/[?&]play=1/.test(location.search)) begin(Number(new URLSearchParams(location.search).get("lv") || 0));
  requestAnimationFrame(loop);
})();
