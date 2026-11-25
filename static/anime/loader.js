(function () {
  var container = document.getElementById("loader-anime");
  if (!container) return;

  function showError(msg) { console.error(msg); }
  var __animeBase = (function () {
    var s = (document.currentScript && document.currentScript.src) || '';
    return s.substring(0, s.lastIndexOf('/') + 1);
  })();
  var tries = 0;
  function tryInit() {
    if (typeof PIXI !== "undefined") {
      try { init(); } catch (e) { showError(e.message); }
    } else if (tries++ < 60) {
      setTimeout(tryInit, 200);
    }
  }
function init() {
      const container = document.getElementById('loader-anime');
      const app = new PIXI.Application({
        resizeTo: container,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      container.appendChild(app.view);

      const cx = () => app.screen.width / 2;
      const cy = () => app.screen.height / 2;
      const minSize = () => Math.min(app.screen.width, app.screen.height);
      const scaleFactor = () => minSize() / 1000;

      const root = new PIXI.Container();
      app.stage.addChild(root);

      const ADD = PIXI.BLEND_MODES.ADD;

      function createRadialTexture(colors, radius) {
        const canvas = document.createElement('canvas');
        canvas.width = radius * 2;
        canvas.height = radius * 2;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, radius * 2, radius * 2);
        return PIXI.Texture.from(canvas);
      }

      function createGlowTexture(w, h, color) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const g = ctx.createLinearGradient(0, h/2, w, h/2);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        return PIXI.Texture.from(canvas);
      }

      function createDottedTriangleTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // 半透明金色填充
        ctx.fillStyle = 'rgba(255, 210, 120, 0.12)';
        ctx.beginPath();
        ctx.moveTo(size/2, 0);
        ctx.lineTo(size, size);
        ctx.lineTo(0, size);
        ctx.closePath();
        ctx.fill();
        // 边框
        ctx.strokeStyle = 'rgba(255, 230, 180, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 点状纹理
        ctx.fillStyle = 'rgba(255, 240, 200, 0.8)';
        for (let i = 0; i < 60; i++) {
          const tx = Math.random() * size;
          const ty = Math.random() * size;
          if (ty > (size - tx) * (size / size) * 0.5) continue; // 简单三角形内判断
          ctx.beginPath();
          ctx.arc(tx, ty, 0.8 + Math.random() * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        return PIXI.Texture.from(canvas);
      }

      // 纺车 = 车轮（后层，绕轮毂旋转）+ 底座（前层，静止）
      // 对位基准（实测）：底座锥体尖 base_aligned(1058,517) = 车轮毂中心 wheel_aligned(522,501)
      const TEX_W = 1904, TEX_H = 1040;
      const WHEEL_SCALE_BASE = 0.56; // 整体缩放（纺车约占屏幕适度尺寸）
      const CONE_TIP = { x: 1058, y: 517 }; // 锥体尖（base 纹理像素坐标）
      const HUB = { x: 522, y: 501 }; // 轮毂中心（wheel 纹理像素坐标）
      const PIVOT_OFF = { x: CONE_TIP.x - TEX_W / 2, y: CONE_TIP.y - TEX_H / 2 };
      const HUB_ROOT = { x: PIVOT_OFF.x * WHEEL_SCALE_BASE, y: PIVOT_OFF.y * WHEEL_SCALE_BASE };
      // 旋转方向：-1 逆时针（REVERSE 主题）；改为 1 即顺时针
      const SPIN_DIR = 1; // 1 顺时针（视觉）；-1 逆时针

      // 背景光晕（对齐轮毂）
      const glow = new PIXI.Sprite(createRadialTexture(
        ['rgba(255,230,150,0.45)', 'rgba(100,220,255,0.10)', 'rgba(0,0,0,0)'],
        450
      ));
      glow.anchor.set(0.5);
      glow.blendMode = ADD;
      glow.position.set(HUB_ROOT.x, HUB_ROOT.y);
      root.addChild(glow);

      const partsRoot = new PIXI.Container();
      root.addChild(partsRoot);

      // 车轮容器：绕轴心旋转，位于底座之后
      const wheelPivot = new PIXI.Container();
      wheelPivot.position.set(PIVOT_OFF.x, PIVOT_OFF.y);
      partsRoot.addChild(wheelPivot);

      // 底座（前层，静止）
      const baseSprite = new PIXI.Sprite();
      baseSprite.anchor.set(0.5);
      partsRoot.addChild(baseSprite);

      // 车轮速度函数 v(x)（round/s）对时间的原积分 F(x)（累计圈数）：
      //   x∈[0,0.5]:  v = -5x² + 4.9x + 0.6        →  F(x) = -5x³/3 + 2.45x² + 0.6x
      //   x∈[0.5,1]:  v = -3x + 3.3                 →  F(x) = -1.5x² + 3.3x - 0.570833
      //   x∈[1,6]:    v = 0.3（匀速持续转）          →  F(x) = 0.3x + 0.929167
      // 每周期 [0,6s] 共转 F(6) ≈ 2.729 圈，跨周期累加（角度连续无跳变）
      // 注：CYCLE(=6) 定义在后面，这里用字面量避免引用过早
      const WHEEL_TURNS_PER_CYCLE = 0.3 * 6 + 0.9291667;
      function wheelTurns(x) {
        if (x <= 0) return 0;
        if (x <= 0.5) return -5 / 3 * x * x * x + 2.45 * x * x + 0.6 * x;
        if (x <= 1) return -1.5 * x * x + 3.3 * x - 0.5708333;
        return 0.3 * x + 0.9291667;
      }
      // 车轮独立缩放（相对底座；1 = 与对位素材同大小，0.9 = 缩小 10%）
      // 车轮 sprite 挂在 wheelPivot（轴心）下，缩放自动绕轮毂轴心，锥轴对位不受影响
      const WHEEL_ONLY_SCALE = 0.56;

      Promise.all([PIXI.Assets.load(__animeBase + 'wheel_aligned.png'), PIXI.Assets.load(__animeBase + 'base_aligned.png')])
        .then(([wheelTex, baseTex]) => {
          const wheelSprite = new PIXI.Sprite(wheelTex);
          // 锚点 = 轮毂中心，保证缩放/旋转都绕轴心，且轮毂精确落在锥体尖上
          wheelSprite.anchor.set(HUB.x / wheelTex.width, HUB.y / wheelTex.height);
          // wheelPivot 自身位置已在 (PIVOT_OFF.x, PIVOT_OFF.y)，精灵直接放在容器原点
          wheelSprite.position.set(0, 0);
          wheelSprite.scale.set(WHEEL_ONLY_SCALE);
          wheelPivot.addChild(wheelSprite);
          baseSprite.texture = baseTex;
        })
        .catch((e) => showError('加载分部图片失败：' + e.message));

      // 中心发光核
      const core = new PIXI.Sprite(createRadialTexture(
        ['rgba(255,255,255,0.95)', 'rgba(255,220,150,0.55)', 'rgba(0,0,0,0)'],
        140
      ));
      core.anchor.set(0.5);
      core.blendMode = ADD;
      core.position.set(HUB_ROOT.x, HUB_ROOT.y);
      root.addChild(core);

      // 特效层（从轮毂发出）
      const fxLayer = new PIXI.Container();
      fxLayer.position.set(HUB_ROOT.x, HUB_ROOT.y);
      root.addChildAt(fxLayer, 1);

      // 1. 水平金线（高度为原来的 1/5）
      const horizontalBeam = new PIXI.Sprite(createGlowTexture(1200, 12, 'rgba(255, 220, 120, 0.8)'));
      horizontalBeam.anchor.set(0.5);
      horizontalBeam.blendMode = ADD;
      horizontalBeam.alpha = 0;
      horizontalBeam.scale.set(0, 1);
      fxLayer.addChild(horizontalBeam);

      // 水平金线核心
      const horizontalCore = new PIXI.Sprite(createGlowTexture(1200, 2, 'rgba(255, 255, 220, 1)'));
      horizontalCore.anchor.set(0.5);
      horizontalCore.blendMode = ADD;
      horizontalCore.alpha = 0;
      horizontalCore.scale.set(0, 1);
      fxLayer.addChild(horizontalCore);

      // 2. 投射图案层（三角形 + 钱币）
      const triangleLayer = new PIXI.Container();
      fxLayer.addChild(triangleLayer);

      function createSolidTriangle(size) {
        const g = new PIXI.Graphics();
        g.beginFill(0xffcc66, 0.85);
        g.lineStyle(2, 0xffeeaa, 0.9);
        g.moveTo(0, -size);
        g.lineTo(size * 0.866, size * 0.5);
        g.lineTo(-size * 0.866, size * 0.5);
        g.closePath();
        g.endFill();
        g.blendMode = ADD;
        return g;
      }

      function createCoinTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cx = size / 2, cy = size / 2;
        const rOuter = size * 0.46;
        const rInner = size * 0.38;
        const rInnermost = size * 0.28;

        // 1. 八角边外轮廓（12边多边形）
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        const sides = 12;
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? rOuter : rOuter * 0.93;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        // 金属径向渐变
        const metalGrad = ctx.createRadialGradient(0, 0, rInnermost * 0.4, 0, 0, rOuter);
        metalGrad.addColorStop(0, '#ffe9a8');
        metalGrad.addColorStop(0.4, '#ffc24d');
        metalGrad.addColorStop(0.75, '#c07a1a');
        metalGrad.addColorStop(1, '#6e3e0a');
        ctx.fillStyle = metalGrad;
        ctx.fill();
        // 轮廓线
        ctx.lineWidth = size * 0.018;
        ctx.strokeStyle = '#fff2c4';
        ctx.shadowColor = 'rgba(255, 210, 120, 0.8)';
        ctx.shadowBlur = size * 0.06;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        // 2. 内圈装饰齿纹
        ctx.save();
        ctx.translate(cx, cy);
        const teeth = 40;
        ctx.lineWidth = size * 0.012;
        ctx.strokeStyle = 'rgba(255, 240, 200, 0.55)';
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * Math.PI * 2;
          const x1 = Math.cos(a) * rInner;
          const y1 = Math.sin(a) * rInner;
          const x2 = Math.cos(a) * rInnermost;
          const y2 = Math.sin(a) * rInnermost;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();

        // 3. 中心圆圈
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, rInnermost, 0, Math.PI * 2);
        const centerGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, rInnermost);
        centerGrad.addColorStop(0, '#fff0c2');
        centerGrad.addColorStop(0.5, '#ffc870');
        centerGrad.addColorStop(1, '#a15f12');
        ctx.fillStyle = centerGrad;
        ctx.fill();
        ctx.lineWidth = size * 0.01;
        ctx.strokeStyle = 'rgba(255, 250, 220, 0.85)';
        ctx.stroke();

        // 4. 中心符号：抽象的狮头/狐狸剪影（简单几何造型）
        ctx.fillStyle = '#5a3408';
        ctx.globalAlpha = 0.85;
        // 头部主体
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.01, size * 0.16, size * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // 左耳（圆耳）
        ctx.beginPath();
        ctx.ellipse(-size * 0.16, -size * 0.16, size * 0.07, size * 0.08, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // 右耳（圆耳）
        ctx.beginPath();
        ctx.ellipse(size * 0.16, -size * 0.16, size * 0.07, size * 0.08, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // 吻部/嘴
        ctx.beginPath();
        ctx.ellipse(size * 0.05, size * 0.05, size * 0.11, size * 0.07, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#ffe2a8';
        ctx.beginPath();
        ctx.ellipse(-size * 0.03, -size * 0.03, size * 0.022, size * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(size * 0.06, -size * 0.025, size * 0.022, size * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 高光
        ctx.globalAlpha = 0.45;
        const hlGrad = ctx.createLinearGradient(-rInnermost, -rInnermost, rInnermost, rInnermost);
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        hlGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rInnermost, rInnermost, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();

        return PIXI.Texture.from(canvas);
      }

      const solidTri = createSolidTriangle(40);
      solidTri.alpha = 0;
      solidTri.scale.set(0);
      triangleLayer.addChild(solidTri);

      // 钱币：尺寸与三角形（约80px）相同
      const coinTex = createCoinTexture(80);
      const coin = new PIXI.Sprite(coinTex);
      coin.anchor.set(0.5);
      coin.blendMode = ADD;
      coin.alpha = 0;
      coin.scale.set(0);
      triangleLayer.addChild(coin);

      // 4. 弧形射线（粉紫色 + 亮绿色）— 按指定路径走，带小幅随机
      function createCurvedRay(colorMain, colorGlow, thickness, glowSize, def) {
        const g = new PIXI.Graphics();
        g.blendMode = ADD;

        const sx = def.start.x + (Math.random() - 0.5) * def.jitter;
        const sy = def.start.y + (Math.random() - 0.5) * def.jitter;
        const ex = def.end.x + (Math.random() - 0.5) * def.jitter;
        const ey = def.end.y + (Math.random() - 0.5) * def.jitter;
        const cx = def.control.x + (Math.random() - 0.5) * def.jitter * 2;
        const cy = def.control.y + (Math.random() - 0.5) * def.jitter * 2;

        const steps = 60;
        const path = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const t1 = 1 - t;
          path.push({
            x: t1 * t1 * sx + 2 * t1 * t * cx + t * t * ex,
            y: t1 * t1 * sy + 2 * t1 * t * cy + t * t * ey,
          });
        }

        g.lineStyle(glowSize, colorGlow, 0.25);
        g.moveTo(path[0].x, path[0].y);
        for (let i = 1; i <= steps; i++) g.lineTo(path[i].x, path[i].y);

        g.lineStyle(thickness, colorMain, 1);
        g.moveTo(path[0].x, path[0].y);
        for (let i = 1; i <= steps; i++) g.lineTo(path[i].x, path[i].y);

        return g;
      }

      const rayPurple = createCurvedRay(0xff60ff, 0xc020ff, 1, 6, {
        start: { x: 320, y: -260 },
        end: { x: -320, y: 260 },
        control: { x: -180, y: -360 },
        jitter: 30,
      });
      rayPurple.alpha = 0;
      fxLayer.addChild(rayPurple);

      const rayGreen = createCurvedRay(0x60ff60, 0x20ff40, 1, 6, {
        start: { x: 200, y: 240 },
        end: { x: -480, y: 40 },
        control: { x: 120, y: 320 },
        jitter: 30,
      });
      rayGreen.alpha = 0;
      fxLayer.addChild(rayGreen);

      // 新金线：三线（绿/紫/对角线）消失后出现，穿过纺车右下角
      const rayGold = createCurvedRay(0xffd700, 0xffaa00, 2, 8, {
        start: { x: -620, y: -420 },
        end: { x: 580, y: 400 },
        control: { x: 220, y: 360 },
        jitter: 20,
      });
      rayGold.alpha = 0;
      fxLayer.addChild(rayGold);

      // 3. 弧形环绕线条
      const arcLayer = new PIXI.Container();
      fxLayer.addChild(arcLayer);

      const arcs = [];
      const arcCount = 18;
      for (let i = 0; i < arcCount; i++) {
        const g = new PIXI.Graphics();
        g.blendMode = ADD;
        arcLayer.addChild(g);
        arcs.push({
          g,
          radius: 320 + Math.random() * 220,
          angle: (i / arcCount) * Math.PI * 2,
          arcLen: 0.3 + Math.random() * 0.5,
          speed: 0.005 + Math.random() * 0.01,
          tilt: (Math.random() - 0.5) * 0.6,
          phase: Math.random() * Math.PI * 2,
          fromCenter: i < arcCount * 0.67, // 2/3 从中心发出
        });
      }

      // 挑出最长的、不与纺车连接的金线，作为"左上→右下"对角线弧线
      let longestIdx = -1;
      let longestScore = 0;
      arcs.forEach((arc, i) => {
        if (!arc.fromCenter && arc.radius * arc.arcLen > longestScore) {
          longestScore = arc.radius * arc.arcLen;
          longestIdx = i;
        }
      });

      // 绘制从左上穿到右下的弧线（二次贝塞尔）
      function drawDiagonalArc(g, alpha) {
        const sx = -540, sy = -300; // 左上
        const ex = 540, ey = 300;   // 右下
        const cxm = -60, cym = -560; // 控制点：让弧线向上拱起
        const steps = 60;
        g.lineStyle(4, 0xffd700, alpha * 0.9);
        for (let i = 0; i <= steps; i++) {
          const tt = i / steps;
          const t1 = 1 - tt;
          const x = t1 * t1 * sx + 2 * t1 * tt * cxm + tt * tt * ex;
          const y = t1 * t1 * sy + 2 * t1 * tt * cym + tt * tt * ey;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
      }

      // 闪光粒子
      const sparkleLayer = new PIXI.Container();
      sparkleLayer.position.set(HUB_ROOT.x, HUB_ROOT.y);
      root.addChild(sparkleLayer);
      const sparkles = [];
      function createSparkleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,250,220,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
        return PIXI.Texture.from(canvas);
      }
      const sparkleTex = createSparkleTexture();

      function spawnSparkle(x, y, count = 1) {
        for (let i = 0; i < count; i++) {
          const s = new PIXI.Sprite(sparkleTex);
          s.anchor.set(0.5);
          s.blendMode = ADD;
          s.x = x + (Math.random() - 0.5) * 40;
          s.y = y + (Math.random() - 0.5) * 40;
          s.scale.set(0.2 + Math.random() * 0.4);
          s.alpha = 0.9;
          s.life = 1;
          s.decay = 0.02 + Math.random() * 0.02;
          sparkleLayer.addChild(s);
          sparkles.push(s);
        }
      }

      function onResize() {
        const s = scaleFactor() * (2 / 3);
        root.x = cx();
        root.y = cy();
        root.scale.set(s);
        partsRoot.scale.set(WHEEL_SCALE_BASE);
      }
      window.addEventListener('resize', onResize);
      onResize();

      // 动画时间线（总时长 6 秒循环）
      const CYCLE = 6;
      let time = 0;

      function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      }
      function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
      function clamp01(t) { return Math.max(0, Math.min(1, t)); }

      app.ticker.add((delta) => {
        time += 0.032 * delta;
        const t = time % CYCLE;

        // ===== 车轮旋转（每周期 0~1s 按速度函数 v(x) 转动，之后静止保持） =====
        // cycleIndex 保证跨周期角度累加、连续无跳变
        const cycleIdx = Math.floor(time / CYCLE);
        wheelPivot.rotation = SPIN_DIR * 2 * Math.PI * (cycleIdx * WHEEL_TURNS_PER_CYCLE + wheelTurns(t));

        // 中心核呼吸
        core.scale.set(0.85 + Math.sin(time * 3) * 0.12);
        core.alpha = 0.75 + Math.sin(time * 2.5) * 0.15;

        // 背景光晕
        glow.scale.set(0.9 + Math.sin(time * 1.3) * 0.12);
        glow.alpha = 0.65 + Math.sin(time * 1.8) * 0.1;

        // ===== 阶段 1：水平金线（0 ~ 0.8s） =====
        if (t < 0.8) {
          const p = t / 0.8;
          const s = easeOutCubic(p);
          horizontalBeam.alpha = 0.8 * (1 - p * 0.3);
          horizontalBeam.scale.set(s, 1);
          horizontalCore.alpha = 1 * (1 - p * 0.2);
          horizontalCore.scale.set(s, 1);
          if (p > 0.5 && Math.random() < 0.3) spawnSparkle((Math.random()-0.5)*600, (Math.random()-0.5)*20, 2);
        } else {
          horizontalBeam.alpha *= 0.92;
          horizontalCore.alpha *= 0.92;
        }

        // ===== 阶段 2：三角形 + 钱币 投掷（0.5 ~ 1.8s） =====
        if (t >= 0.5 && t < 1.8) {
          const p = clamp01((t - 0.5) / 1.3);

          // 实心三角形：向左上飞出
          const s1 = p < 0.15 ? easeOutBack(p / 0.15) : 1 - (p - 0.15) * 0.3;
          solidTri.alpha = Math.sin(p * Math.PI) * 0.9;
          solidTri.scale.set(s1 * 1.2);
          solidTri.x = -p * 360;
          solidTri.y = -p * 200;
          solidTri.rotation = -p * 0.8;

          // 钱币：向右偏上 11° 飞出，速度为三角形的 3/7
          const s3 = p < 0.2 ? easeOutBack(p / 0.2) : 1 - (p - 0.2) * 0.25;
          coin.alpha = Math.sin(p * Math.PI) * 0.95;
          coin.scale.set(s3 * 1.2);
          // 三角形速度基准: p * 360 (x), p * 200 (y)，钱币速度为其 3/7
          const triSpeedX = 360;
          const triSpeedY = 200;
          const coinSpeed = 3 / 7;
          const angle = 11 * Math.PI / 180; // 向上偏 11°
          const dist = Math.sqrt(Math.pow(p * triSpeedX * coinSpeed, 2) + Math.pow(p * triSpeedY * coinSpeed, 2));
          coin.x = Math.cos(angle) * dist;
          coin.y = -Math.sin(angle) * dist;
          coin.rotation = p * 2.5;

          if (Math.random() < 0.2) {
            spawnSparkle(solidTri.x, solidTri.y, 1);
            spawnSparkle(coin.x, coin.y, 1);
          }

          if (Math.random() < 0.2) {
            spawnSparkle(solidTri.x, solidTri.y, 1);
            spawnSparkle(coin.x, coin.y, 1);
          }
        } else {
          solidTri.alpha = 0;
          coin.alpha = 0;
        }

        // ===== 阶段 2.5：绿线 + 紫线 同步出现消失（1.5 ~ 2.6s） =====
        if (t >= 1.5 && t < 2.6) {
          const p = clamp01((t - 1.5) / 1.1);
          const a = Math.sin(p * Math.PI) * 0.95;
          rayPurple.alpha = a;
          rayGreen.alpha = a;
        } else {
          rayPurple.alpha = 0;
          rayGreen.alpha = 0;
        }

        // ===== 阶段 2.6：对角线金线（1.8 ~ 3.5s，单独显示，纯金色不变色） =====
        if (t >= 1.8 && t < 3.5) {
          const p = clamp01((t - 1.8) / 0.8);
          const a = Math.sin(p * Math.PI);
          const diag = arcs[longestIdx];
          if (diag) {
            diag.g.clear();
            drawDiagonalArc(diag.g, a);
          }
        } else {
          const diag = arcs[longestIdx];
          if (diag) diag.g.clear();
        }

        // ===== 阶段 2.7：三线（绿/紫/对角线）消失后，新金线穿过纺车右下角（2.6 ~ 4s） =====
        if (t >= 2.6 && t < 4) {
          const p = clamp01((t - 2.6) / 1.0);
          rayGold.alpha = Math.sin(p * Math.PI) * 0.95;
        } else {
          rayGold.alpha = 0;
        }

        // ===== 阶段 3：弧形线条环绕（1.4s 后渐入，持续） =====
        const arcFadeIn = clamp01((t - 1.4) / 0.8);
        arcs.forEach((arc, idx) => {
          // 对角线金线由阶段 2.5 单独管理，这里跳过
          if (idx === longestIdx) return;

          arc.g.clear();
          const alpha = arcFadeIn * (0.25 + Math.sin(time * 2 + arc.phase) * 0.2);
          const a = arc.angle + time * arc.speed;
          const r = arc.radius * (0.9 + Math.sin(time + arc.phase) * 0.1);

          // 3D 倾斜效果：用椭圆弧
          const startAngle = a;
          const endAngle = a + arc.arcLen * Math.PI;

          arc.g.lineStyle(1.5, 0xffcc88, alpha);
          // 绘制椭圆弧
          const steps = 24;
          for (let j = 0; j < steps; j++) {
            const theta1 = startAngle + (j / steps) * (endAngle - startAngle);
            const theta2 = startAngle + ((j + 1) / steps) * (endAngle - startAngle);

            let r1, r2;
            if (arc.fromCenter) {
              // 从中心发出：半径从 0 渐变到 r
              r1 = r * (j / steps);
              r2 = r * ((j + 1) / steps);
            } else {
              // 环绕弧线：固定半径
              r1 = r;
              r2 = r;
            }

            const x1 = Math.cos(theta1) * r1 * Math.cos(arc.tilt);
            const y1 = Math.sin(theta1) * r1;
            const x2 = Math.cos(theta2) * r2 * Math.cos(arc.tilt);
            const y2 = Math.sin(theta2) * r2;
            if (j === 0) arc.g.moveTo(x1, y1);
            arc.g.lineTo(x2, y2);
          }
        });

        // 闪光粒子更新
        for (let i = sparkles.length - 1; i >= 0; i--) {
          const s = sparkles[i];
          s.life -= s.decay * delta;
          s.alpha = Math.max(0, s.life);
          s.scale.set(s.scale.x * 0.97);
          if (s.life <= 0) {
            sparkleLayer.removeChild(s);
            sparkles.splice(i, 1);
          }
        }
      });
      window.__reimuLoaderAnime = {
        pause: function () { try { app.ticker.stop(); } catch (e) {} },
        resume: function () { try { app.ticker.start(); } catch (e) {} },
        destroy: function () { try { window.removeEventListener('resize', onResize); app.destroy(true, { children: true, texture: true, baseTexture: true }); } catch (e) {} }
      };
    }
  tryInit();
})();