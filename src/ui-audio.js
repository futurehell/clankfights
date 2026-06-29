// --- tiny sound system (Web Audio, no assets) ---
let audioCtx = null;

export function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return audioCtx;
}

export function playScratch() {
  const ctx = getAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = 380;
  g.gain.value = 0.35;
  g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  setTimeout(() => o.stop(), 280);
}

export function playClank(type = 'normal') {
  const ctx = getAudio();
  if (!ctx) return;

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();

  if (type === 'good') {
    o.type = 'sawtooth';
    o.frequency.value = 180;
    g.gain.value = 0.6;
    f.type = 'lowpass';
    f.frequency.value = 1200;
  } else if (type === 'bad') {
    o.type = 'square';
    o.frequency.value = 90;
    g.gain.value = 0.5;
  } else {
    o.type = 'triangle';
    o.frequency.value = 320 + Math.random() * 80;
    g.gain.value = 0.35;
  }

  g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + (type === 'good' ? 0.6 : 0.28));

  o.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  o.start();

  setTimeout(() => o.stop(), 800);
}
