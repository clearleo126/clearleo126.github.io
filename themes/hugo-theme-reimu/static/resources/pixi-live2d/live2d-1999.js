/**
 * 看板娘加载器（Q版 Spine 终版 · 全动作随机版）
 * 用官方 spine-player（自包含，不依赖 PIXI）加载重返未来1999的 Q 版骨骼动画。
 * 复用原 plugin-live2d 的 DOM 结构与 CSS（#live2d-plugin / #live2d-tips / #live2d-tool）。
 *
 * 三个骨骼变体（同一造型，动画分散在不同 skel 里）：
 *   - room ：idle/click/sleep/walk/hit/idle_birthday_up/_loop
 *   - fight：born/idle/hit/die/victory/skill1/skill2/freeze/giddy/posture/unique
 *   - ui   ：born/idle/sleep/walk
 *
 * 策略：默认跑 room（互动动作最全）。点击时从"全动作池"随机抽一个——
 * 若该动作在当前骨骼里，直接播；不在则热切换到对应 skel 再播（透明无感）。
 * 播完（complete 事件）自动回 idle；idle 循环中 3 分钟无操作进入 sleep。
 *
 * 页面用法（等价于原 live2d.init）：
 *   live2d.init('', { themeTipsPath: '' });
 */
window.live2d = new (function () {
  const CHIBI = "/live2d/sonnet-chibi/302301_shisihangshi";
  const VARIANTS = ["room", "fight", "ui"];
  const DEFAULT_VARIANT = "room";

  // 全动作池（点击随机抽取；每个动作可配一句提示文案）
  const ACTION_POOL = [
    { name: "click", tips: ["May the peace be with us."] },
    { name: "hit", tips: ["It's alright."] },
    { name: "victory", tips: ["I will pray for you ... sorry."] },
    { name: "skill1", tips: ["Regna sereno intenso ed infinito."] },
    { name: "skill2", tips: ["So long lives this, and this gives power to thee."] },
    { name: "unique", tips: ["Each moment, now night."] },
    { name: "giddy", tips: ["呜……有点头晕……"] },
    { name: "freeze", tips: ["冻、冻住了……"] },
    { name: "posture", tips: ["Depict the world I have never seen before."] },
    { name: "die", tips: ["倒下了……（逗你的）"] },
    { name: "born", tips: ["又见面了！"] },
    { name: "walk", tips: [""] },
  ];

  // 动作 → 所在变体（按三个 skel 的动画清单静态指定；共有动作优先 room/fight）
  const ACTION_VARIANT = {
    click: "room", walk: "room", hit: "room",
    born: "fight", victory: "fight", skill1: "fight", skill2: "fight",
    unique: "fight", giddy: "fight", freeze: "fight", posture: "fight", die: "fight",
  };

  const loadScript = (url) =>
    new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = url;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error("load fail: " + url));
      document.head.appendChild(tag);
    });

  const loadCss = (url) =>
    new Promise((resolve, reject) => {
      const tag = document.createElement("link");
      tag.rel = "stylesheet";
      tag.href = url;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error("load fail: " + url));
      document.head.appendChild(tag);
    });

  // ---- 消息提示（复用原插件 tips DOM）----
  let tipsTimer = null;
  function showTips(html, timeout = 4000) {
    const tips = document.getElementById("live2d-tips");
    if (!tips) return;
    tips.innerHTML = html;
    tips.classList.add("live2d-tips-active");
    if (tipsTimer) clearTimeout(tipsTimer);
    tipsTimer = setTimeout(() => tips.classList.remove("live2d-tips-active"), timeout);
  }

  function welcomeText() {
    const h = new Date().getHours();
    if (h < 6) return "夜深了，早点休息吧。";
    if (h < 10) return "您好！今天的衬衫与您的眼睛颜色很相称。";
    if (h < 12) return "早上好！我今天看到了关于意大利贴面礼的报道……呃、我的意思是说，如果能实践一下也不错。";
    if (h < 18) return "这样无所事事真的可以吗？在基金会的时候，从来都没有如此闲寂的夜晚……谢谢您教会我这一切。";
    if (h < 23) return "晚上好，欢迎回来。";
    return "夜深了，早点休息吧。";
  }

  function init(path, config = {}) {
    if (screen.width < 768) return; // 与原插件一致：小屏不加载
    Promise.all([
      loadCss("/resources/D-Sketon/plugin-live2d/css/live2d.css"),
      loadCss("/resources/spine-player/spine-player.min.css"),
      loadScript("/resources/spine-player/spine-player.min.js"),
    ]).then(() => {
      createDom();
      const stage = document.getElementById("live2d");

      // ---- 运行时状态 ----
      let player = null;          // 当前 SpinePlayer 实例
      let variant = DEFAULT_VARIANT; // 当前骨骼变体
      let curAnims = [];          // 当前骨骼的动作名集合
      let switching = false;      // 是否正在热切换骨骼
      let pending = null;         // 切换后要播的动作
      let sleeping = false;
      let sleepTimer = null;

      // 清空 stage 并重建 player（spine-player 实例不可复用，需销毁重建）
      const mount = (v, startAnim) => {
        variant = v;
        switching = true;
        // 先销毁再清空 DOM：顺序反了会让 dispose 内部的 removeChild 抛错，组件假死
        try { if (player && player.dispose) player.dispose(); } catch (e) { /* 忽略 */ }
        stage.innerHTML = "";
        player = new spine.SpinePlayer(stage, {
          binaryUrl: `${CHIBI}_${v}.skel`,
          atlasUrl: `${CHIBI}.atlas`,
          animation: "idle", // 始终先按 idle 建视口，目标动作在 success 里再播
          showControls: false,
          alpha: true,
          backgroundColor: "#00000000",
          success: (p) => {
            player = p;
            // 锁定视口：之后所有动作沿用 idle 的包围盒，相机不再随动作重算。
            // 否则 born/skill 等大特效动画会把镜头拉远，人物直接"消失"。
            try {
              p.setViewport("idle");
              const vp = p.currentViewport;
              p.config.viewport.x = vp.x;
              p.config.viewport.y = vp.y;
              p.config.viewport.width = vp.width;
              p.config.viewport.height = vp.height;
            } catch (e) {
              console.warn("[live2d-1999] 视口锁定失败，回退动态计算", e);
            }
            const state = p.animationState;
            curAnims = state.data.skeletonData.animations.map((a) => a.name);
            const has = (n) => curAnims.includes(n);

            // 非循环动作播完 → 回 idle；如果正好在切换，播 pending
            // 注意：sleep / 生日动作是循环或链式，complete 时不打断
            state.addListener({
              complete: (entry) => {
                const name = entry.animation && entry.animation.name;
                if (!name || name === "idle" || name === "sleep" ||
                    name === "idle_birthday_up" || name === "idle_birthday_loop") return;
                if (pending) {
                  const next = pending;
                  pending = null;
                  if (has(next)) {
                    player.setAnimation(next, false); // 视口已锁定，不会重算相机
                    return;
                  }
                }
                playIdle();
              },
            });

            switching = false;

            // 有排队的动作就播，否则回待机
            if (pending) {
              const next = pending;
              pending = null;
              if (has(next)) {
                player.setAnimation(next, false);
                p.play();
                return;
              }
            }
            if (!startAnim || startAnim === "idle") playIdle();
            // 视口在 success 里已就绪时，loadSkeleton 会跳过内部 play()，手动补上
            p.play();
          },
          error: (e) => console.error("[live2d-1999]", e),
        });
      };

      const has = (n) => curAnims.includes(n);

      const armSleepTimer = () => {
        if (sleepTimer) clearTimeout(sleepTimer);
        sleepTimer = setTimeout(() => {
          if (has("sleep") && !switching) {
            sleeping = true;
            player.setAnimation("sleep", true);
            showTips("zzZ…… 她睡着了。动动鼠标叫醒她吧。", 6000);
          }
        }, 180000);
      };

      const playIdle = () => {
        sleeping = false;
        armSleepTimer();
        if (player && !switching) player.setAnimation("idle", true);
      };

      // 跨变体播放：动作在当前骨骼 → 直接播；否则切基底再播
      const playCross = (name, tips) => {
        if (switching) { pending = name; return; }
        if (has(name)) {
          sleeping = false;
          if (sleepTimer) clearTimeout(sleepTimer);
          armSleepTimer();
          if (tips) showTips(Array.isArray(tips) ? tips[Math.floor(Math.random() * tips.length)] : tips);
          player.setAnimation(name, false);
        } else {
          // 该动作在另一个变体里 → 精确切到对应基底（pending 会在 success 里自动播出）
          pending = name;
          mount(ACTION_VARIANT[name] || "fight", name);
        }
      };

      // 初次加载
      mount(DEFAULT_VARIANT, "idle");

      // ---- 鼠标静止 3 分钟 → 睡；动 → 醒 ----
      const wake = () => {
        if (sleeping && !switching) {
          sleeping = false;
          playOnceOrQueue("idle", "……嗯？我醒啦！");
        }
        armSleepTimer();
      };
      const playOnceOrQueue = (name, tips) => playCross(name, tips);
      window.addEventListener("mousemove", wake);

      // ---- 点击：从全动作池随机触发 ----
      stage.style.cursor = "pointer";
      let tapCount = 0, tapTimer = null;
      stage.addEventListener("click", () => {
        if (!player || switching) return;
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => (tapCount = 0), 2500);
        // 狂点 5 次必然触发受击（保证"被惹恼"的反馈）
        if (tapCount >= 5) {
          playCross("hit", "别打啦！怕了怕了！");
          tapCount = 0;
          return;
        }
        const pick = ACTION_POOL[Math.floor(Math.random() * ACTION_POOL.length)];
        playCross(pick.name, pick.tips);
      });

      // ---- 消息联动 ----
      setTimeout(() => showTips(welcomeText(), 7000), 1200);
      window.addEventListener("copy", () => {
        showTips("咦？你复制了什么？要写进诗里吗？");
        playCross("click", "咦？你复制了什么？");
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          showTips("……这是昨天的报纸。上面这座大桥，我们也可以去吗？它看起来真的很漂亮！","能够用于释放神秘术的诗句并不好找。它们必须情绪饱满、时机恰当，可遇不可求。不过，如果我能认识一个诗人，或许……一切就简单多了。");
          playCross("walk");
        }
      });
      // ---- 生日彩蛋（把月日改成你想要的日期）----
      const now = new Date();
      if (now.getMonth() + 1 === 6 && now.getDate() === 15 && player && has("idle_birthday_up")) {
        player.setAnimation("idle_birthday_up", false);
        player.animationState.addAnimation(0, "idle_birthday_loop", true, 0);
        showTips("今天是特别的日子！生日快乐！", 8000);
      }
    });
  }

  function createDom() {
    if (document.getElementById("live2d-plugin")) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="live2d-plugin">
          <div id="live2d-tips"></div>
          <div id="live2d" style="width:220px;height:300px"></div>
          <div id="live2d-tool"></div>
      </div>`
    );
    const dom = document.getElementById("live2d-plugin");
    // 放在右下角（原 CSS 默认 left:0）
    dom.style.left = "auto";
    dom.style.right = "30px";
    setTimeout(() => (dom.style.bottom = 0), 0);
  }

  return { init };
})();
