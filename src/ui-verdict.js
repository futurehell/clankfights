import { $ } from './ui-dom.js';
import { getAudio, playClank } from './ui-audio.js';
import { updateJudgeFace } from './ui-performer.js';
import { getVerdict } from './scoring.js';

// =====================================================
// PaRappa the Rapper style over-the-top judge splashes
// =====================================================

export const PARAPPA_PHRASES = {
  garbage: [
    "YOU SUCK",
    "TRASH",
    "WHAT WAS THAT",
    "GEARS JAMMED",
    "SERVO FAILURE",
    "BOOOOOO",
    "OIL LEAK",
    "COMPLETE GARBAGE"
  ],
  meh: [
    "WEAK",
    "NEXT",
    "TRY HARDER",
    "NOT IT",
    "MID",
    "KEEP PRACTICING",
    "ROBOTIC AT BEST"
  ],
  solid: [
    "COOL",
    "FRESH",
    "NICE",
    "YOU GOT IT",
    "KEEP GOING",
    "NOT BAD",
    "DECENT FLOW"
  ],
  great: [
    "HELL YEAH",
    "YOU'RE THE BEST",
    "LEGEND",
    "PERFECT",
    "HYDRAULIC KING",
    "CLANK CHAMPION",
    "UNSTOPPABLE",
    "GOD TIER"
  ]
};

export function showPaRappaVerdict(roundResult, sideA, sideB) {
  const splash = $('#verdict-splash');
  const content = $('#verdict-content');
  if (!splash || !content) return;

  const { a, b, winner, margin } = roundResult.verdict;

  // Use the new 0-100 average-based verdict
  const aVerdict = getVerdict(roundResult.a.scores);
  const bVerdict = getVerdict(roundResult.b.scores);

  const winnerVerdict = roundResult.a.scores.total > roundResult.b.scores.total ? aVerdict : bVerdict;
  const tier = winnerVerdict.tier;
  const avg = winnerVerdict.avg;

  let phrasePool;
  let cssClass;

  if (tier === 'great') {
    phrasePool = PARAPPA_PHRASES.great;
    cssClass = 'great';
  } else if (tier === 'solid') {
    phrasePool = PARAPPA_PHRASES.solid;
    cssClass = 'good';
  } else if (tier === 'meh') {
    phrasePool = PARAPPA_PHRASES.meh;
    cssClass = 'bad';
  } else {
    phrasePool = PARAPPA_PHRASES.garbage;
    cssClass = 'bad';
  }

  // Pick a phrase (weighted toward the winner's side feeling)
  const phrase = phrasePool[Math.floor(Math.random() * phrasePool.length)];

  // Make it extra stupid for the really bad or really good cases
  let html = `<div class="text-7xl md:text-8xl font-black tracking-[-1px]">${phrase}</div>`;

  // Special stretch treatment for the worst ones
  if (tier === 'garbage' && phrase.includes('SUCK')) {
    html = `
      <div class="text-6xl md:text-7xl font-black">YOU</div>
      <div class="suck text-[92px] md:text-[110px] font-black text-red-400">SUUUUUUCK</div>
    `;
  }

  if (tier === 'great' && (phrase.includes('BEST') || phrase.includes('PERFECT'))) {
    html = `<div class="text-8xl md:text-9xl font-black tracking-[-3px]">${phrase}</div>`;
  }

  // Add tiny subtitle for flavor
  const subtitle = tier === 'garbage' ? "THE CROWD IS SILENT..." :
                   tier === 'meh'     ? "THE FANS ARE CHECKING THEIR PHONES" :
                   tier === 'solid'   ? "THEY'RE FEELING IT A LITTLE" :
                   "THE WHOLE SCRAPYARD IS GOING WILD";

  html += `<div class="mt-3 text-sm tracking-[4px] opacity-80">${subtitle}</div>`;

  // Set content
  content.innerHTML = html;
  content.className = `text-center px-8 py-6 rounded-3xl ${cssClass}`;

  // Show it
  splash.classList.remove('hidden');
  splash.classList.add('flex');

  // Extra screen flash for legendary moments
  const scoreDiff = Math.abs(a.score - b.score);
  if (tier === 'great' && scoreDiff > 50) {
    splash.style.background = 'rgba(234, 179, 8, 0.15)';
    setTimeout(() => {
      splash.style.background = 'rgba(0,0,0,0.65)';
    }, 380);
  }

  // Update central judge emoji
  updateJudgeFace(tier);

  // Play appropriate sound
  if (tier === 'garbage') {
    // sad trombone style low note
    const ctx = getAudio();
    if (ctx) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 95;
      g.gain.value = 0.4;
      g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(() => o.stop(), 950);
    }
  } else if (tier === 'great') {
    playClank('good');
    setTimeout(() => playClank('good'), 140);
  }

  // Auto hide after a bit (keep it long enough to be funny)
  const hideAfter = tier === 'great' ? 2350 : tier === 'garbage' ? 2100 : 1850;

  setTimeout(() => {
    content.style.transition = 'all 280ms ease';
    content.style.opacity = '0';
    content.style.transform = 'scale(0.8)';

    setTimeout(() => {
      splash.classList.remove('flex');
      splash.classList.add('hidden');
      content.style.transition = '';
      content.style.opacity = '';
      content.style.transform = '';
      splash.style.background = 'rgba(0,0,0,0.65)';
    }, 260);
  }, hideAfter);
}
