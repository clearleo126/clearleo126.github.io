(function () {
  var LIB_URL = "/resources/material-theme@1.0.0/dist/material-theme.umd.js";
  var BANNER_SELECTOR = "#header > img, #header > picture img";
  var THUMB_SIZE = 64;
  var handled = new WeakSet();

  var CSS_BLOCK = [
    ":root {",
    "  --red-0: var(--md-sys-color-primary-light);",
    "  --red-1: color-mix(in srgb, var(--md-sys-color-primary-light) 90%, white);",
    "  --red-2: color-mix(in srgb, var(--md-sys-color-primary-light) 75%, white);",
    "  --red-3: color-mix(in srgb, var(--md-sys-color-primary-light) 55%, white);",
    "  --red-4: color-mix(in srgb, var(--md-sys-color-primary-light) 40%, white);",
    "  --red-5: color-mix(in srgb, var(--md-sys-color-primary-light) 15%, white);",
    "  --red-5-5: color-mix(in srgb, var(--md-sys-color-primary-light) 10%, white);",
    "  --red-6: color-mix(in srgb, var(--md-sys-color-primary-light) 5%, white);",
    "  --color-border: var(--red-3);",
    "  --color-link: var(--red-1);",
    "  --color-meta-shadow: var(--red-6);",
    "  --color-h2-after: var(--red-1);",
    "  --color-red-6-shadow: var(--red-2);",
    "  --color-red-3-shadow: var(--red-3);",
    "}",
    '[data-theme="dark"]:root {',
    "  --red-0: var(--red-1);",
    "  --red-1: color-mix(in srgb, var(--md-sys-color-primary-dark) 90%, white);",
    "  --red-2: color-mix(in srgb, var(--md-sys-color-primary-dark) 80%, white);",
    "  --red-3: color-mix(in srgb, var(--md-sys-color-primary-dark) 75%, white);",
    "  --red-4: color-mix(in srgb, var(--md-sys-color-primary-dark) 30%, transparent);",
    "  --red-5: color-mix(in srgb, var(--md-sys-color-primary-dark) 20%, transparent);",
    "  --red-5-5: color-mix(in srgb, var(--md-sys-color-primary-dark) 10%, transparent);",
    "  --red-6: color-mix(in srgb, var(--md-sys-color-primary-dark) 5%, transparent);",
    "  --color-border: var(--red-5);",
    "}",
    ""
  ].join("\n");

  function loadLibrary() {
    return new Promise(function (resolve, reject) {
      if (window.materialTheme) {
        resolve(window.materialTheme);
        return;
      }
      var script = document.createElement("script");
      script.src = LIB_URL;
      script.onload = function () {
        resolve(window.materialTheme);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function makeThumbnail(img) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    var canvas = document.createElement("canvas");
    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    var scale = Math.min(THUMB_SIZE / iw, THUMB_SIZE / ih);
    var dw = Math.max(1, Math.round(iw * scale));
    var dh = Math.max(1, Math.round(ih * scale));
    var dx = Math.round((THUMB_SIZE - dw) / 2);
    var dy = Math.round((THUMB_SIZE - dh) / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    ctx.drawImage(img, dx, dy, dw, dh);
    return canvas;
  }

  function thumbnailToImage(canvas) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = canvas.toDataURL("image/jpeg", 0.9);
    });
  }

  function appendStylesheet() {
    if (document.getElementById("reimu-generated-theme-style")) return;
    var style = document.createElement("style");
    style.id = "reimu-generated-theme-style";
    style.textContent = CSS_BLOCK;
    document.body.appendChild(style);
  }

  function applyScheme(extractor, scheme) {
    var root = document.documentElement;
    root.style.setProperty(
      "--md-sys-color-primary-light",
      extractor.hexFromArgb(scheme.schemes.light.props.primary)
    );
    requestAnimationFrame(function () {
      root.style.setProperty(
        "--md-sys-color-primary-dark",
        extractor.hexFromArgb(scheme.schemes.dark.props.primary)
      );
      requestAnimationFrame(appendStylesheet);
    });
  }

  function generateFromImage(extractor, img) {
    var thumb = makeThumbnail(img);
    if (!thumb) return;
    thumbnailToImage(thumb).then(function (smallImg) {
      if (!smallImg) return;
      var run = function () {
        extractor
          .generateThemeSchemeFromImage(smallImg)
          .then(function (scheme) {
            applyScheme(extractor, scheme);
          })
          .catch(function () {});
      };
      if (window.requestIdleCallback) {
        window.requestIdleCallback(run, { timeout: 2000 });
      } else {
        setTimeout(run, 200);
      }
    });
  }

  function handleBanner(extractor, img) {
    if (!img || handled.has(img)) return;
    if (!img.src) return;
    handled.add(img);
    if (img.complete && img.naturalWidth > 0) {
      generateFromImage(extractor, img);
    } else {
      img.addEventListener(
        "load",
        function () {
          generateFromImage(extractor, img);
        },
        { once: true }
      );
    }
  }

  function init() {
    loadLibrary()
      .then(function (lib) {
        var extractor = new lib.ColorThemeExtractor({ needTransition: false });
        function scan() {
          var imgs = document.querySelectorAll(BANNER_SELECTOR);
          for (var i = 0; i < imgs.length; i++) {
            handleBanner(extractor, imgs[i]);
          }
        }
        scan();
        var observer = new MutationObserver(function (mutations) {
          var needScan = false;
          for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
              needScan = true;
              break;
            }
          }
          if (needScan) scan();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
