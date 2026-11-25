(function () {
  if (window.__reimuRandomBanner) return;
  window.__reimuRandomBanner = true;

  var FADE_MS = 1000;
  var SWITCH_INTERVAL = 7000;
  var MIRROR_BLUR = 12;
  var MIRROR_BRIGHT = 0.72;
  var MIRROR_SATURATE = 0.85;
  var MASK = "linear-gradient(to top, transparent, #fff 50%)";

  var images = [];
  var currentIndex = -1;
  var switching = false;
  var prefetched = null;
  var notified = false;
  var dimsCache = {};
  var bgWrap = null;
  var slots = [];
  var activeSlot = null;
  var activeSrc = null;

  function getBanner() {
    return (
      window.bannerElement ||
      document.querySelector("#header > img, #header > picture img")
    );
  }

  function pickIndex() {
    var idx;
    do {
      idx = Math.floor(Math.random() * images.length);
    } while (idx === currentIndex && images.length > 1);
    return idx;
  }

  function createEntry() {
    var idx = pickIndex();
    var src = images[idx];
    var img = new Image();
    img.src = src;
    return { idx: idx, src: src, img: img, failed: false };
  }

  function isPortrait(src) {
    var d = dimsCache[src];
    return !!d && d.h > d.w;
  }

  function settle(entry, cb) {
    var img = entry.img;
    var fired = false;
    function fire(failed) {
      if (fired) return;
      fired = true;
      entry.failed = !!failed;
      if (!failed && img.naturalWidth && img.naturalHeight) {
        dimsCache[entry.src] = {
          w: img.naturalWidth,
          h: img.naturalHeight
        };
      }
      cb(entry);
    }
    img.onload = function () {
      fire(false);
    };
    img.onerror = function () {
      fire(true);
    };
    if (img.complete) {
      fire(img.naturalWidth === 0);
    }
  }

  function notifyReady() {
    if (notified) return;
    notified = true;
    try {
      window.dispatchEvent(new Event("reimu:banner-ready"));
    } catch (e) {}
  }

  function createSlot() {
    var slot = document.createElement("div");
    slot.style.position = "absolute";
    slot.style.top = "0";
    slot.style.left = "0";
    slot.style.width = "100%";
    slot.style.height = "100%";
    slot.style.pointerEvents = "none";
    slot.style.opacity = "0";
    slot.style.transition = "opacity " + FADE_MS + "ms ease";
    slot.style.filter =
      "blur(" + MIRROR_BLUR + "px) saturate(" + MIRROR_SATURATE + ") brightness(" + MIRROR_BRIGHT + ")";

    var pair = [document.createElement("img"), document.createElement("img")];
    for (var i = 0; i < pair.length; i++) {
      var el = pair[i];
      el.alt = "";
      el.style.position = "absolute";
      el.style.transform = "scaleX(-1)";
      el.style.transition = "none";
      el.style.mask = "none";
      el.style.webkitMask = "none";
      el.style.pointerEvents = "none";
      slot.appendChild(el);
    }
    slot.__left = pair[0];
    slot.__right = pair[1];
    return slot;
  }

  function syncBgBox(banner) {
    if (!bgWrap) return;
    bgWrap.style.width = banner.clientWidth + "px";
    bgWrap.style.height = banner.clientHeight + "px";
  }

  function ensureBgLayer(banner) {
    if (bgWrap) {
      syncBgBox(banner);
      return;
    }
    bgWrap = document.createElement("div");
    bgWrap.style.position = "absolute";
    bgWrap.style.top = "0";
    bgWrap.style.left = "0";
    bgWrap.style.zIndex = "-2";
    bgWrap.style.overflow = "hidden";
    bgWrap.style.pointerEvents = "none";
    bgWrap.style.mask = MASK;
    bgWrap.style.webkitMask = MASK;

    var a = createSlot();
    var b = createSlot();
    bgWrap.appendChild(a);
    bgWrap.appendChild(b);
    banner.parentNode.insertBefore(bgWrap, banner);
    slots = [a, b];
    syncBgBox(banner);
  }

  function positionSlot(slot, src) {
    var banner = getBanner();
    var dims = dimsCache[src];
    if (!banner || !dims || !bgWrap) return;

    var bw = banner.clientWidth;
    var bh = banner.clientHeight;
    if (!bw || !bh) return;

    var scale = Math.min(bw / dims.w, bh / dims.h);
    var dw = dims.w * scale;
    var dh = dims.h * scale;
    var x0 = (bw - dw) / 2;
    var y0 = (bh - dh) / 2;

    var L = slot.__left;
    var R = slot.__right;
    L.src = src;
    R.src = src;

    L.style.width = dw + "px";
    L.style.height = dh + "px";
    L.style.left = x0 - dw + "px";
    L.style.top = y0 + "px";

    R.style.width = dw + "px";
    R.style.height = dh + "px";
    R.style.left = x0 + dw + "px";
    R.style.top = y0 + "px";
  }

  function crossfade(banner, nextSrc) {
    if (switching) return;
    switching = true;

    var portrait = isPortrait(nextSrc);

    ensureBgLayer(banner);

    if (portrait) {
      var incoming = slots[0] === activeSlot ? slots[1] : slots[0];
      positionSlot(incoming, nextSrc);
      incoming.style.transition = "none";
      incoming.style.opacity = "0";
      void incoming.offsetWidth;
      incoming.style.transition = "opacity " + FADE_MS + "ms ease";
      incoming.style.opacity = "1";
      if (activeSlot) {
        activeSlot.style.transition = "opacity " + FADE_MS + "ms ease";
        activeSlot.style.opacity = "0";
      }
      activeSlot = incoming;
      activeSrc = nextSrc;
    } else if (activeSlot) {
      activeSlot.style.transition = "opacity " + FADE_MS + "ms ease";
      activeSlot.style.opacity = "0";
      activeSlot = null;
      activeSrc = null;
    }

    var overlay = banner.cloneNode(false);
    overlay.src = nextSrc;
    overlay.style.transition = "none";
    overlay.style.opacity = "0";
    overlay.style.objectPosition = "50% 50%";
    overlay.style.objectFit = portrait ? "contain" : "cover";
    overlay.style.filter = "";
    banner.parentNode.insertBefore(overlay, banner.nextSibling);
    void overlay.offsetWidth;
    overlay.style.transition = "opacity " + FADE_MS + "ms ease";
    overlay.style.opacity = "1";

    banner.style.transition = "opacity " + FADE_MS + "ms ease";
    banner.style.opacity = "0";

    setTimeout(function () {
      banner.style.transition = "none";
      banner.src = nextSrc;
      banner.style.objectPosition = "50% 50%";
      banner.style.objectFit = portrait ? "contain" : "cover";
      banner.style.filter = "";

      var finish = function () {
        banner.onload = null;
        var doSwap = function () {
          banner.style.opacity = "";
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          switching = false;
          prefetched = createEntry();
          requestAnimationFrame(function () {
            banner.style.transition = "";
          });
        };
        if (banner.decode) {
          banner.decode().then(doSwap, doSwap);
        } else {
          doSwap();
        }
      };

      banner.onload = finish;
      if (banner.complete && banner.naturalWidth > 0) {
        finish();
      }

      if (window.generateSchemeHandler) {
        window.generateSchemeHandler();
      }
    }, FADE_MS);
  }

  function switchBanner() {
    if (switching) return;
    var banner = getBanner();
    if (!banner || images.length === 0) return;

    var entry = prefetched || createEntry();
    prefetched = null;

    settle(entry, function (e) {
      if (e.failed) {
        notifyReady();
        prefetched = createEntry();
        return;
      }
      currentIndex = e.idx;
      crossfade(banner, e.src);
      notifyReady();
    });
  }

  window.addEventListener("resize", function () {
    if (!bgWrap || !activeSlot || !activeSrc) return;
    var banner = getBanner();
    if (!banner) return;
    syncBgBox(banner);
    positionSlot(activeSlot, activeSrc);
  });

  fetch("/bannermanifest.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (list) {
      if (Array.isArray(list) && list.length > 0) {
        images = list;
        switchBanner();
        setInterval(switchBanner, SWITCH_INTERVAL);
      }
    })
    .catch(function () {});
})();
