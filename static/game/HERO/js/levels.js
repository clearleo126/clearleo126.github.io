/* 20 Mount Leone shafts — original layouts, all local. */
window.HERO_LEVELS = (() => {
  const W = 40;

  function set(m, x, y, c) {
    if (y < 0 || y >= m.length || x < 0 || x >= W) return;
    m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1);
  }

  function make(h, fn) {
    const m = Array.from({ length: h }, () => "#".repeat(W));
    const carve = (x0, y0, x1, y1, ch = ".") => {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) set(m, x, y, ch);
      }
    };
    fn({ m, set: (x, y, c) => set(m, x, y, c), carve, h });
    return m;
  }

  function wall(set, x, y0, y1, ch = "=") {
    for (let y = y0; y < y1; y++) {
      set(x, y, ch);
      if (x + 1 < W) set(x + 1, y, ch);
    }
  }

  const levels = [];

  /* 1 — surface drop, one blast, miner */
  levels.push(make(30, ({ carve, set }) => {
    carve(0, 0, 40, 6, "^");
    carve(16, 5, 24, 22);
    carve(16, 20, 36, 28);
    wall(set, 24, 20, 28, "=");
    set(19, 7, "P");
    set(32, 26, "W");
  }));

  /* 2 — spider in the shaft */
  levels.push(make(34, ({ carve, set }) => {
    carve(0, 0, 40, 4, "^");
    carve(15, 3, 25, 16);
    carve(8, 14, 25, 20);
    carve(8, 18, 18, 30);
    carve(8, 28, 32, 32);
    wall(set, 20, 28, 32, "=");
    set(19, 5, "P");
    set(17, 15, "s");
    set(11, 24, "s");
    set(28, 30, "W");
  }));

  /* 3 — side tunnels + bat */
  levels.push(make(36, ({ carve, set }) => {
    carve(17, 1, 23, 12);
    carve(6, 10, 23, 16);
    carve(6, 14, 14, 24);
    carve(6, 22, 34, 28);
    carve(26, 26, 34, 34);
    wall(set, 18, 22, 28, "=");
    set(19, 2, "P");
    set(10, 12, "b");
    set(12, 20, "s");
    set(30, 32, "W");
  }));

  /* 4 — lanterns (don't shoot them) */
  levels.push(make(36, ({ carve, set }) => {
    carve(16, 1, 24, 14);
    carve(10, 12, 30, 18);
    carve(10, 16, 18, 26);
    carve(10, 24, 32, 32);
    wall(set, 20, 24, 32, "=");
    set(19, 2, "P");
    set(20, 8, "L");
    set(14, 14, "L");
    set(12, 22, "b");
    set(28, 14, "s");
    set(28, 30, "W");
  }));

  /* 5 — first lava moat */
  levels.push(make(34, ({ carve, set }) => {
    carve(16, 1, 24, 12);
    carve(8, 10, 32, 16);
    carve(8, 14, 32, 20);
    carve(8, 18, 32, 22, "~");
    carve(8, 20, 16, 30);
    carve(24, 20, 32, 30);
    carve(8, 28, 32, 32);
    wall(set, 18, 28, 32, "=");
    set(19, 2, "P");
    set(12, 12, "s");
    set(26, 12, "b");
    set(28, 26, "W");
    carve(26, 18, 29, 20); // fix: lava shaft down to miner's right column
  }));

  /* 6 — raft crossing */
  levels.push(make(32, ({ carve, set }) => {
    carve(14, 1, 22, 10);
    carve(6, 8, 34, 14);
    carve(6, 12, 34, 18, "~");
    carve(6, 16, 14, 28);
    carve(26, 16, 34, 28);
    carve(6, 26, 34, 30);
    set(10, 13, "r");
    set(17, 2, "P");
    set(20, 10, "b");
    wall(set, 16, 26, 30, "=");
    set(30, 28, "W");
    carve(28, 12, 31, 16); // fix: lava shaft down to right air column
  }));

  /* 7 — nesting snakes */
  levels.push(make(36, ({ carve, set }) => {
    carve(16, 1, 24, 12);
    carve(8, 10, 24, 16);
    carve(8, 14, 16, 26);
    carve(8, 24, 30, 32);
    wall(set, 18, 24, 32, "=");
    set(19, 2, "P");
    set(15, 12, "n");
    set(8, 18, "n");
    set(8, 22, "n");
    set(12, 20, "s");
    set(26, 30, "W");
  }));

  /* 8 — branching maze */
  levels.push(make(40, ({ carve, set }) => {
    carve(18, 1, 24, 8);
    carve(6, 7, 24, 12);
    carve(6, 10, 12, 22);
    carve(18, 10, 34, 16);
    carve(26, 14, 34, 28);
    carve(6, 20, 28, 26);
    carve(6, 24, 14, 36);
    carve(6, 34, 32, 38);
    wall(set, 20, 34, 38, "=");
    set(20, 2, "P");
    set(8, 8, "s");
    set(30, 12, "b");
    set(10, 22, "m");
    set(28, 22, "s");
    set(28, 36, "W");
  }));

  /* 9 — magma walls */
  levels.push(make(36, ({ carve, set }) => {
    carve(16, 1, 24, 10);
    carve(8, 8, 32, 14);
    carve(8, 12, 16, 22);
    carve(24, 12, 32, 22);
    carve(8, 20, 32, 26);
    carve(16, 24, 24, 34);
    wall(set, 18, 8, 14, "M");
    wall(set, 16, 20, 26, "=");
    set(19, 2, "P");
    set(10, 10, "s");
    set(28, 16, "b");
    set(12, 18, "n");
    set(19, 32, "W");
  }));

  /* 10 — tentacle river */
  levels.push(make(34, ({ carve, set }) => {
    carve(15, 1, 23, 10);
    carve(6, 8, 34, 14);
    carve(6, 12, 34, 20, "~");
    carve(26, 18, 34, 30);
    carve(6, 26, 34, 32);
    set(10, 13, "r");
    set(20, 13, "t");
    set(18, 2, "P");
    set(10, 10, "b");
    wall(set, 16, 26, 32, "=");
    set(30, 30, "W");
    carve(28, 12, 31, 18); // fix: lava shaft down to lower chamber
  }));

  /* 11 — dark lantern run */
  levels.push(make(38, ({ carve, set }) => {
    carve(16, 1, 24, 10);
    carve(8, 8, 32, 14);
    carve(8, 12, 16, 24);
    carve(24, 12, 32, 24);
    carve(8, 22, 32, 28);
    carve(8, 26, 16, 36);
    carve(8, 34, 30, 37);
    set(19, 2, "P");
    set(20, 6, "L");
    set(12, 10, "L");
    set(28, 10, "L");
    set(10, 18, "L");
    set(12, 16, "s");
    set(28, 18, "b");
    set(20, 24, "m");
    wall(set, 18, 34, 37, "=");
    set(26, 35, "W");
  }));

  /* 12 — tight lava ledges */
  levels.push(make(38, ({ carve, set }) => {
    carve(17, 1, 23, 8);
    carve(6, 7, 20, 12);
    carve(6, 10, 14, 18);
    carve(6, 16, 34, 20);
    carve(6, 18, 34, 22, "~");
    carve(22, 20, 30, 28);
    carve(10, 26, 30, 30);
    carve(10, 28, 18, 36);
    carve(10, 34, 32, 37);
    set(19, 2, "P");
    set(8, 8, "s");
    set(10, 14, "n");
    set(26, 16, "b");
    wall(set, 20, 34, 37, "=");
    set(28, 35, "W");
    carve(26, 18, 29, 20); // fix: lava shaft above the mid pocket
  }));

  /* 13 — two rafts + bats */
  levels.push(make(36, ({ carve, set }) => {
    carve(16, 1, 24, 8);
    carve(6, 6, 34, 12);
    carve(6, 10, 34, 16, "~");
    carve(6, 14, 14, 22);
    carve(26, 14, 34, 22);
    carve(6, 20, 34, 24);
    carve(6, 22, 34, 26, "~");
    carve(14, 24, 26, 34);
    set(18, 2, "P");
    set(10, 11, "r");
    set(28, 11, "r");
    set(20, 23, "r");
    set(12, 8, "b");
    set(28, 8, "b");
    set(8, 18, "s");
    wall(set, 18, 28, 34, "=");
    set(20, 32, "W");
    carve(24, 10, 28, 16); // fix: shaft through first lava band
    carve(24, 22, 27, 26); // fix: shaft through second lava band into the pit
  }));

  /* 14 — magma maze */
  levels.push(make(40, ({ carve, set }) => {
    carve(18, 1, 24, 8);
    carve(6, 6, 24, 12);
    carve(6, 10, 12, 20);
    carve(18, 10, 34, 16);
    carve(26, 14, 34, 26);
    carve(6, 18, 20, 24);
    carve(6, 22, 34, 28);
    carve(14, 26, 22, 38);
    wall(set, 14, 6, 12, "M");
    wall(set, 22, 12, 16, "M");
    wall(set, 18, 22, 28, "=");
    set(20, 2, "P");
    set(8, 8, "s");
    set(30, 12, "m");
    set(8, 16, "n");
    set(28, 20, "b");
    set(17, 36, "W");
  }));

  /* 15 — tentacle + lanterns */
  levels.push(make(38, ({ carve, set }) => {
    carve(15, 1, 23, 9);
    carve(6, 7, 34, 13);
    carve(6, 11, 34, 18, "~");
    carve(6, 16, 14, 26);
    carve(26, 16, 34, 30);
    carve(10, 28, 34, 36);
    set(18, 2, "P");
    set(20, 6, "L");
    set(10, 9, "L");
    set(12, 12, "r");
    set(22, 12, "t");
    set(30, 9, "b");
    set(8, 20, "s");
    set(8, 24, "n");
    wall(set, 18, 28, 36, "=");
    set(30, 34, "W");
    carve(28, 11, 31, 16); // fix: lava shaft down right air column
  }));

  /* 16 — long snake pit */
  levels.push(make(42, ({ carve, set }) => {
    carve(17, 1, 23, 8);
    carve(8, 6, 32, 12);
    carve(8, 10, 16, 34);
    carve(24, 10, 32, 22);
    carve(16, 20, 32, 26);
    carve(8, 32, 32, 40);
    wall(set, 18, 32, 40, "=");
    set(19, 2, "P");
    set(12, 8, "s");
    set(26, 8, "b");
    set(8, 14, "n");
    set(8, 18, "n");
    set(8, 22, "n");
    set(8, 28, "n");
    set(28, 14, "m");
    set(28, 22, "s");
    set(28, 38, "W");
  }));

  /* 17 — lava ceiling squeeze */
  levels.push(make(40, ({ carve, set }) => {
    carve(16, 1, 24, 8);
    carve(6, 6, 34, 12);
    carve(6, 10, 34, 14, "~");
    carve(6, 12, 12, 20);
    carve(28, 12, 34, 20);
    carve(6, 18, 34, 22);
    carve(6, 20, 34, 24, "M");
    carve(10, 20, 16, 24, ".");
    carve(24, 20, 30, 24, ".");
    carve(10, 22, 30, 28);
    carve(16, 26, 24, 38);
    set(19, 2, "P");
    set(10, 8, "b");
    set(28, 8, "b");
    set(8, 16, "s");
    set(30, 16, "m");
    wall(set, 18, 32, 38, "=");
    set(19, 36, "W");
    carve(28, 10, 31, 12); // fix: lava shaft down right side
  }));

  /* 18 — dark magma + raft */
  levels.push(make(42, ({ carve, set }) => {
    carve(16, 1, 24, 8);
    carve(8, 6, 32, 12);
    carve(8, 10, 32, 16, "~");
    carve(8, 14, 16, 24);
    carve(24, 14, 32, 28);
    carve(8, 22, 32, 28);
    carve(8, 26, 16, 38);
    carve(8, 36, 30, 40);
    set(19, 2, "P");
    set(20, 6, "L");
    set(12, 8, "L");
    set(12, 11, "r");
    set(22, 11, "t");
    wall(set, 18, 22, 28, "M");
    set(10, 18, "s");
    set(28, 20, "b");
    set(10, 30, "n");
    wall(set, 18, 36, 40, "=");
    set(26, 38, "W");
    carve(14, 10, 18, 16); // fix: lava shaft down the left column
  }));

  /* 19 — gauntlet */
  levels.push(make(44, ({ carve, set }) => {
    carve(18, 1, 24, 7);
    carve(6, 6, 20, 11);
    carve(20, 6, 34, 11);
    carve(6, 9, 12, 18);
    carve(28, 9, 34, 18);
    carve(6, 16, 34, 21);
    carve(6, 19, 34, 23, "~");
    carve(14, 21, 26, 30);
    carve(8, 28, 18, 36);
    carve(22, 28, 32, 36);
    carve(8, 34, 32, 42);
    set(20, 2, "P");
    set(8, 7, "s");
    set(30, 7, "s");
    set(8, 13, "n");
    set(32, 13, "n");
    set(10, 17, "b");
    set(28, 17, "b");
    set(18, 20, "r");
    set(16, 24, "m");
    set(24, 26, "s");
    wall(set, 18, 34, 42, "=");
    set(28, 40, "W");
    carve(20, 19, 23, 21); // fix: lava shaft above the mid pit
  }));

  /* 20 — deepest rescue */
  levels.push(make(48, ({ carve, set }) => {
    carve(17, 1, 23, 8);
    carve(6, 6, 34, 12);
    carve(6, 10, 34, 15, "~");
    carve(6, 13, 14, 22);
    carve(26, 13, 34, 22);
    carve(6, 20, 34, 26);
    carve(10, 24, 18, 32);
    carve(22, 24, 30, 32);
    carve(6, 30, 34, 36);
    carve(6, 34, 34, 38, "~");
    carve(14, 36, 26, 46);
    set(19, 2, "P");
    set(20, 6, "L");
    set(10, 8, "L");
    set(28, 8, "L");
    set(10, 11, "r");
    set(24, 11, "t");
    set(8, 8, "b");
    set(30, 8, "b");
    set(8, 16, "n");
    set(32, 16, "s");
    set(12, 22, "m");
    set(28, 22, "s");
    set(14, 28, "n");
    set(26, 28, "b");
    set(18, 35, "r");
    wall(set, 18, 40, 46, "=");
    wall(set, 20, 40, 46, "=");
    set(19, 44, "W");
    carve(14, 10, 18, 15); // fix: lava shaft down the left column
    carve(19, 34, 22, 36); // fix: lava shaft down to the rescue pit
  }));

  return {
    count: levels.length,
    get(i) {
      const src = levels[Math.max(0, Math.min(levels.length - 1, i))];
      return src.map((r) => r);
    }
  };
})();
