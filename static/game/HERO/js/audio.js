/* Local chip SFX — no samples, no network. */
window.HERO_AUDIO = (() => {
  let ctx = null;
  let muted = false;
  let thrustOsc = null;
  let thrustGain = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, vol, slide) {
    if (muted) return;
    const a = ac();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }

  function noise(dur, vol, hp) {
    if (muted) return;
    const a = ac();
    const n = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = n;
    const f = a.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp || 400;
    const g = a.createGain();
    g.gain.setValueAtTime(vol || 0.12, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start();
  }

  return {
    resume() { ac(); },
    isMuted() { return muted; },
    toggle() { muted = !muted; if (muted) this.thrust(false); return muted; },
    menu() { beep(440, 0.06, "square", 0.06); },
    start() { beep(330, 0.08, "square", 0.07); setTimeout(() => beep(440, 0.1, "square", 0.07), 90); setTimeout(() => beep(660, 0.16, "square", 0.07), 180); },
    laser() { beep(980, 0.05, "square", 0.035, 420); },
    place() { beep(180, 0.08, "triangle", 0.08); },
    boom() { noise(0.28, 0.2, 180); beep(140, 0.22, "sawtooth", 0.08, 50); },
    die() { beep(220, 0.35, "sawtooth", 0.1, 60); noise(0.2, 0.12, 300); },
    zap() { beep(720, 0.07, "square", 0.06, 180); },
    lantern() { beep(260, 0.12, "triangle", 0.05, 90); },
    extra() { beep(520, 0.08, "square", 0.07); setTimeout(() => beep(780, 0.14, "square", 0.07), 90); },
    powerlow() { beep(160, 0.08, "square", 0.05); },
    rescue() {
      const notes = [392, 494, 587, 784];
      notes.forEach((n, i) => setTimeout(() => beep(n, 0.14, "square", 0.07), i * 110));
    },
    win() {
      [523, 659, 784, 1046].forEach((n, i) => setTimeout(() => beep(n, 0.18, "square", 0.08), i * 140));
    },
    thrust(on) {
      if (muted) on = false;
      const a = ac();
      if (on) {
        if (thrustOsc) return;
        thrustOsc = a.createOscillator();
        thrustGain = a.createGain();
        thrustOsc.type = "sawtooth";
        thrustOsc.frequency.value = 78;
        thrustGain.gain.value = 0.018;
        thrustOsc.connect(thrustGain);
        thrustGain.connect(a.destination);
        thrustOsc.start();
      } else if (thrustOsc) {
        try { thrustOsc.stop(); } catch (_) {}
        thrustOsc.disconnect();
        thrustGain.disconnect();
        thrustOsc = null;
        thrustGain = null;
      }
    }
  };
})();
