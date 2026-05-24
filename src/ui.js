// UI glue - wires the DOM, runs the battle, handles all the stupid fun animations

import { getRobotList, ROBOTS } from './bots.js';
import { BattleEngine } from './battle.js';
import {
  getCombinedRobotList,
  addOrUpdateCustomBot,
  exportBotToJSON,
  importBotFromJSON,
  getTrainedBot,
  getBotDefinition,
  getCustomBots,
  deleteCustomBot
} from './custom-bots.js';
import { getVerdict } from './scoring.js';

let currentFight = null;
let audioCtx = null;

// --- tiny sound system (Web Audio, no assets) ---
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return audioCtx;
}

function playScratch() {
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

function playClank(type = 'normal') {
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

// --- DOM helpers ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function setText(el, txt) { if (el) el.textContent = txt; }
function addClass(el, c) { el && el.classList.add(c); }
function removeClass(el, c) { el && el.classList.remove(c); }

let selectedA = 'CLANK-47';
let selectedB = 'Scrapheap';

// --- build the fighter selector cards (now with custom bots + create button) ---
function buildSelector(containerId, onSelect, preselect) {
  const container = $(containerId);
  if (!container) return;

  container.innerHTML = '';

  // Get combined list (builtins + persisted customs)
  const list = getCombinedRobotList(getRobotList());

  list.forEach(bot => {
    const isCustom = !!bot.isCustom;
    const card = document.createElement('div');
    card.className = `robot-card p-3 rounded-xl border-2 cursor-pointer transition-all bg-zinc-900 hover:bg-zinc-800 flex flex-col ${bot.key === preselect ? 'border-orange-500 ring-1 ring-orange-500/50' : 'border-zinc-700'}`;

    card.innerHTML = `
      <div class="flex items-center gap-3 flex-1">
        <div class="text-4xl">${bot.avatar}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <div class="font-bold text-lg tracking-tight" style="color:${bot.color}">${bot.name}</div>
            ${isCustom ? '<span class="custom-badge">CUSTOM</span>' : ''}
          </div>
          <div class="text-[10px] text-zinc-400 -mt-0.5">${bot.subtitle}</div>
          <div class="text-xs text-zinc-500 mt-1 line-clamp-2">${bot.description || ''}</div>
        </div>
      </div>
      ${isCustom ? `
        <div class="flex gap-1 mt-2 pt-2 border-t border-zinc-800">
          <button data-export="${bot.key}" class="text-[10px] px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800 flex-1">Export</button>
          <button data-delete="${bot.key}" class="text-[10px] px-2 py-0.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950 flex-1">Delete</button>
        </div>` : ''}
    `;

    // Main click selects the bot
    card.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') return; // export/delete handled below

      $$('#' + container.id + ' .robot-card').forEach(c => {
        c.classList.remove('border-orange-500', 'ring-1', 'ring-orange-500/50');
        c.classList.add('border-zinc-700');
      });
      card.classList.add('border-orange-500', 'ring-1', 'ring-orange-500/50');
      card.classList.remove('border-zinc-700');
      onSelect(bot.key);
    };

    // Export button
    const exportBtn = card.querySelector('[data-export]');
    if (exportBtn) {
      exportBtn.onclick = (e) => {
        e.stopImmediatePropagation();
        try {
          exportBotToJSON(bot.key, ROBOTS);
        } catch (err) {
          alert('Export failed: ' + err.message);
        }
      };
    }

    // Delete button
    const delBtn = card.querySelector('[data-delete]');
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopImmediatePropagation();
        if (confirm(`Delete custom clanker "${bot.name}"?`)) {
          deleteCustomBot(bot.key);
          // Rebuild both selectors
          buildSelector('#fighter-a', (k) => { selectedA = k; }, selectedA);
          buildSelector('#fighter-b', (k) => { selectedB = k; }, selectedB);
        }
      };
    }

    container.appendChild(card);
  });

  // Always add the "+ Create Custom" card at the end
  const createCard = document.createElement('div');
  createCard.className = 'robot-card p-3 rounded-xl border-2 border-dashed border-zinc-600 hover:border-orange-500/60 cursor-pointer flex items-center justify-center bg-zinc-900/50 min-h-[92px]';
  createCard.innerHTML = `
    <div class="text-center">
      <div class="text-3xl opacity-70">+</div>
      <div class="text-sm text-orange-400 font-bold tracking-wider">CREATE CUSTOM</div>
      <div class="text-[10px] text-zinc-400">from your own corpus</div>
    </div>
  `;
  createCard.onclick = () => openCustomBotModal(containerId === 'fighter-a' ? 'a' : 'b');
  container.appendChild(createCard);
}

// --- helpers for the new stage ---
function shakePerformer(side) {
  const el = $('#' + side + '-performer');
  if (!el) return;
  el.classList.add('shaking');
  setTimeout(() => el.classList.remove('shaking'), 700);
}

function setPerformer(side, def) {
  const prefix = side; // left or right
  setText($('#' + prefix + '-name'), def.name);
  setText($('#' + prefix + '-subtitle'), def.subtitle || '');
  const av = $('#' + prefix + '-avatar');
  if (av) av.textContent = def.avatar || '🤖';

  // store color on the element for transcript lines
  const performerEl = $('#' + prefix + '-performer');
  if (performerEl) performerEl.dataset.color = def.color || '#f97316';
}

function addTranscriptLine(speaker, text, color) {
  const feed = $('#transcript');
  if (!feed) return;

  const line = document.createElement('div');
  line.className = 'transcript-line';
  line.innerHTML = `
    <span class="speaker" style="color:${color}">${speaker}</span>
    <span class="text text-zinc-200">${text}</span>
  `;
  feed.appendChild(line);
  feed.scrollTop = feed.scrollHeight;
}

// Small PS1-style judge reaction after a line (per-line feedback)
function addJudgeLineReaction(reaction, isGood) {
  const feed = $('#transcript');
  if (!feed) return;

  const div = document.createElement('div');
  div.className = `text-[11px] px-3 py-px my-1 ml-6 inline-block rounded font-bold tracking-wider ${isGood ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'}`;
  div.style.fontFamily = '"Press Start 2P", system-ui';
  div.textContent = `JUDGE: ${reaction}`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

// Central judge face reactions - text faces on the body image
function updateJudgeFace(tierOrReaction) {
  const face = $('#judge-face');
  if (!face) return;

  const str = String(tierOrReaction || '').toUpperCase();

  let faces = ['^_^'];

  if (/BAD|WEAK|TRASH|GARBAGE|BOO|MID/.test(str)) {
    faces = ['T_T', 'X_X', '>_<', ';_;'];
  } else if (/MEH|NEXT|TRY|ROBOTIC/.test(str)) {
    faces = ['-_-', '._.', '-_-'];
  } else if (/GOOD|COOL|FRESH|NICE|DECENT/.test(str)) {
    faces = ['^_^', '^o^', '~_^'];
  } else if (/HELL YEAH|PERFECT|LEGEND|UNSTOPPABLE|GREAT/.test(str)) {
    faces = ['^_^', '^o^', '^.^'];
  }

  face.textContent = faces[Math.floor(Math.random() * faces.length)];

  // The main rhythmic bob is handled by CSS animation on #judge-container.
  // We no longer stomp its transform here so the girl keeps moving smoothly.
  // (The emoji face change + floating quip box + big PaRappa splash already give strong reaction feedback.)
}

// Small chunky PS1-style reaction near a robot (left or right side) - for end of round
function showSideReaction(side, text, isGood = true) {
  const el = $('#' + side + '-reaction');
  if (!el) return;

  el.textContent = text;
  el.className = `absolute -top-3 ${side === 'left' ? 'right-3' : 'left-3'} text-xl font-black px-2 py-0.5 rounded bg-black/80 border ${isGood ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`;
  el.style.fontFamily = '"Press Start 2P", system-ui';
  el.style.display = 'block';
  el.style.opacity = '1';
  el.style.transition = 'none';
  el.style.transform = 'scale(0.15) rotate(-22deg)';

  void el.offsetWidth;

  el.style.transition = 'transform 480ms cubic-bezier(0.23, 1.0, 0.32, 1), opacity 480ms ease';
  el.style.transform = 'scale(1.55) rotate(7deg)';

  setTimeout(() => {
    if (el) {
      el.style.transition = 'all 320ms ease';
      el.style.transform = 'scale(0.7) rotate(0deg)';
      el.style.opacity = '0';
      setTimeout(() => {
        if (el) {
          el.style.display = 'none';
          el.style.transition = '';
          el.style.transform = '';
          el.style.opacity = '';
        }
      }, 280);
    }
  }, 1250);
}

// Pulse the colored ring around a robot head based on judge reaction
function pulseRobotRing(side, type = 'meh') {
  const performer = $('#' + side + '-performer');
  if (!performer) return;

  performer.classList.remove('ring-good', 'ring-bad', 'ring-meh');

  let ringClass = 'ring-meh';
  if (type === 'good') ringClass = 'ring-good';
  if (type === 'bad')  ringClass = 'ring-bad';

  performer.classList.add(ringClass);

  setTimeout(() => {
    if (performer) performer.classList.remove(ringClass);
  }, 850);
}

// Show the round winner announcement above the judge
function showRoundWinner(roundNumber, winnerName) {
  const el = $('#round-winner');
  if (!el) return;
  el.textContent = `ROUND ${roundNumber} WINNER: ${winnerName.toUpperCase()}`;
  el.classList.remove('hidden');
}

// Update the floating judge quip badge (above the PNG)
function setJudgeCommentBox(text) {
  const box = $('#judge-comment-box');
  if (!box) return;

  box.style.opacity = '1';

  const isGreat = /HELL YEAH|PERFECT|LEGEND|UNSTOPPABLE|FRESH/i.test(text);
  const isBad   = /BAD|WEAK|TRASH|MID|BOO/i.test(text);

  box.textContent = text;

  if (isGreat) {
    box.style.borderColor = '#fde047';
    box.style.color = '#fde047';
    box.style.background = '#2a2200';
  } else if (isBad) {
    box.style.borderColor = '#fb7185';
    box.style.color = '#fb7185';
    box.style.background = '#2a0f0f';
  } else {
    box.style.borderColor = '#a3e635';
    box.style.color = '#a3e635';
    box.style.background = '#1a2e05';
  }

  box.style.transition = 'none';
  box.style.transform = 'scale(0.3) rotate(-12deg)';

  void box.offsetWidth;

  box.style.transition = 'transform 260ms cubic-bezier(0.2, 1.4, 0.3, 1)';
  box.style.transform = 'scale(1.4) rotate(5deg)';

  setTimeout(() => {
    if (box) {
      box.style.transition = 'transform 140ms ease';
      box.style.transform = 'scale(1) rotate(0deg)';
    }
  }, 200);
}

// =====================================================
// PaRappa the Rapper style over-the-top judge splashes
// =====================================================

const PARAPPA_PHRASES = {
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

function showPaRappaVerdict(roundResult, sideA, sideB) {
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

function enterArena(aKey, bKey) {
  const selector = $('#selector-screen');
  const arena = $('#arena-screen');
  if (!selector || !arena) {
    console.error('Missing selector or arena screen elements');
    return;
  }

  selector.classList.add('hidden');
  arena.classList.remove('hidden');

  // Reset UI state for new fight
  const transcript = $('#transcript');
  if (transcript) transcript.innerHTML = '';

  setText($('#left-total'), '0');
  setText($('#right-total'), '0');

  const roundBanner = $('#round-banner');
  if (roundBanner) roundBanner.textContent = 'ROUND 1 / 3';

  const timerEl = $('#timer');
  if (timerEl) timerEl.textContent = '2:00';

  // Kick off the battle
  runLiveFight(aKey, bKey);
}

// --- THE NEW BACK-AND-FORTH STAGE BATTLE ---
async function runLiveFight(aKey, bKey) {
  // Resolve definitions (works for both builtin and custom keys)
  const defA = getBotDefinition(aKey, ROBOTS) || { name: aKey, avatar: '🤖', color: '#f97316' };
  const defB = getBotDefinition(bKey, ROBOTS) || { name: bKey, avatar: '🗑️', color: '#22c55e' };

  const engine = new BattleEngine(aKey, bKey);
  currentFight = engine;

  // Setup the new stage portraits
  setPerformer('left', defA);
  setPerformer('right', defB);

  const transcript = $('#transcript');
  const timerEl = $('#timer');
  const roundBanner = $('#round-banner');

  let cumulativeA = 0;
  let cumulativeB = 0;

  for (let r = 1; r <= 3; r++) {
    // Reset banner style from previous "COMPLETE" state
    roundBanner.classList.remove('text-xl', 'font-bold');
    roundBanner.classList.add('text-sm');
    roundBanner.style.color = '#f97316';

    // Clear previous round winner announcement
    const winnerEl = $('#round-winner');
    if (winnerEl) winnerEl.classList.add('hidden');

    roundBanner.textContent = `ROUND ${r} / 3`;
    if (transcript) transcript.innerHTML = '';

    // clear previous floating judge quip
    const q = $('#judge-comment-box');
    if (q) q.style.opacity = '0';

    timerEl.textContent = '2:00';
    timerEl.classList.remove('text-red-400');

    const roundResult = await engine.runRound(r);

    const aBars = roundResult.a.bars;
    const bBars = roundResult.b.bars;

    const totalLines = Math.max(aBars.length, bBars.length);

    // Shorter rounds (~19s real time) with much better rhythm
    let timeLeft = 120;
    const tick = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 1);
      const m = Math.floor(timeLeft / 60);
      const s = String(timeLeft % 60).padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
      if (timeLeft <= 8) timerEl.classList.add('text-red-400');
    }, 1000);

    // === Better internal rhythm & pacing + per-line judge reactions ===
    const goodReactions = ["COOL!", "FRESH", "NICE", "YOU GOT IT", "KEEP GOING", "DECENT"];
    const badReactions = ["WEAK", "BAD", "TRASH", "NEXT", "MID", "ROBOTIC", "BOO"];

    for (let i = 0; i < totalLines; i++) {
      const isLast = i === totalLines - 1;

      // Very slow, readable pacing (theatrical rap battle feel)
      let delay = 1950 + Math.random() * 950;     // ~2s – 2.9s between lines

      // Frequent longer dramatic / hype pauses
      if (Math.random() < 0.35 && !isLast) {
        delay = 3200 + Math.random() * 2200;      // 3.2s – 5.4s hype pause
      }

      // Rare quicker exchange (still comfortable to read)
      if (Math.random() < 0.12) {
        delay = 780 + Math.random() * 520;
      }

      await new Promise(res => setTimeout(res, delay));

      // LEFT (A) spits
      if (aBars[i]) {
        addTranscriptLine(defA.name.toUpperCase(), aBars[i], defA.color);
        shakePerformer('left');
        playClank('normal');

        // Ring feedback on left robot
        if (Math.random() < 0.55) {
          const reaction = goodReactions[Math.floor(Math.random() * goodReactions.length)];
          const ringType = /FRESH|COOL|NICE|KEEP/.test(reaction) ? 'good' : 'meh';
          pulseRobotRing('left', ringType);
          setJudgeCommentBox(reaction);
          updateJudgeFace(reaction);
        }
      }

      // Deliberate, readable gap between the two robots responding
      let responseDelay = 850 + Math.random() * 950;
      if (Math.random() < 0.25) responseDelay += 1300;   // very long dramatic pause before reply


      await new Promise(res => setTimeout(res, responseDelay));

      // RIGHT (B) responds
      if (bBars[i]) {
        addTranscriptLine(defB.name.toUpperCase(), bBars[i], defB.color);
        shakePerformer('right');
        playClank('normal');

        // Ring feedback on right robot
        if (Math.random() < 0.55) {
          const reaction = badReactions[Math.floor(Math.random() * badReactions.length)];
          const ringType = /WEAK|BAD|TRASH|MID/.test(reaction) ? 'bad' : 'meh';
          pulseRobotRing('right', ringType);
          setJudgeCommentBox(reaction);
          updateJudgeFace(reaction);
        }
      }
    }

    clearInterval(tick);
    timerEl.textContent = '0:00';

    // Update cumulative scores on the portraits
    cumulativeA += roundResult.a.scores.total;
    cumulativeB += roundResult.b.scores.total;
    setText($('#left-total'), cumulativeA);
    setText($('#right-total'), cumulativeB);

    // Compute averages for reactions
    const aAvg = (roundResult.a.scores.wordsUsed + roundResult.a.scores.clarity + roundResult.a.scores.meaning) / 3;
    const bAvg = (roundResult.b.scores.wordsUsed + roundResult.b.scores.clarity + roundResult.b.scores.meaning) / 3;

    const aReaction = aAvg > 65 ? "FRESH" : aAvg > 45 ? "COOL" : "WEAK";
    const bReaction = bAvg > 65 ? "FRESH" : bAvg > 45 ? "COOL" : "WEAK";

    // End-of-round side reactions (text bubbles)
    showSideReaction('left', aReaction, aAvg > 50);
    setTimeout(() => {
      showSideReaction('right', bReaction, bAvg > 50);
    }, 280);

    // === ROUND COMPLETE + FULL JUDGE REVIEW ===
    roundBanner.classList.remove('text-sm');
    roundBanner.classList.add('text-xl', 'font-bold');
    roundBanner.textContent = `ROUND ${r} COMPLETE`;
    roundBanner.style.color = '#fde047';

    // Show winner announcement above the judge
    const roundWinnerName = aAvg > bAvg ? defA.name : defB.name;
    showRoundWinner(r, roundWinnerName);

    setJudgeCommentBox(`ROUND ${r} COMPLETE`);
    updateJudgeFace(aAvg > bAvg ? aReaction : bReaction);

    // Full judge review panel
    const j = roundResult.verdict;
    const judgeDiv = document.createElement('div');
    judgeDiv.className = `judge-verdict p-3 rounded-xl border mb-3 ${j.a.score > j.b.score ? 'border-emerald-600/60 bg-emerald-950/30' : 'border-rose-600/60 bg-rose-950/30'}`;
    judgeDiv.innerHTML = `
      <div class="text-xs text-zinc-400">ROUND ${r} — ${j.winner} wins by ${j.margin}</div>
      <div class="text-sm mt-1 text-zinc-200">${j.comment}</div>
      <div class="mt-2 flex gap-2 text-xs font-mono">
        <span style="color:${j.a.color}">${j.a.verdict}</span>
        <span class="text-zinc-500">vs</span>
        <span style="color:${j.b.color}">${j.b.verdict}</span>
      </div>
    `;
    transcript.appendChild(judgeDiv);
    transcript.scrollTop = transcript.scrollHeight;

    // Big PaRappa moment if it was a great round
    if (aAvg > 72 || Math.random() < 0.18) {
      showPaRappaVerdict(roundResult, defA, defB);
    }

    // === MANUAL "NEXT ROUND" BUTTON ONLY (no auto-advance) ===
    const nextContainer = $('#next-round-container');
    const nextBtn = $('#btn-next-round');

    if (r < 3 && nextContainer && nextBtn) {
      nextBtn.textContent = "NEXT ROUND →";
      nextContainer.classList.remove('hidden');

      // Wait for the user to click — no timeout
      await new Promise(resolve => {
        nextBtn.onclick = () => {
          nextContainer.classList.add('hidden');
          nextBtn.onclick = null;
          resolve();
        };
      });
    }
  }

  // Final winner card in the transcript area
  const winnerKey = cumulativeA > cumulativeB ? aKey : bKey;
  const winnerName = winnerKey === aKey ? defA.name : defB.name;

  const finalCard = document.createElement('div');
  finalCard.className = 'mt-3 p-4 rounded-2xl border-2 border-orange-500 bg-zinc-950 text-center';
  finalCard.innerHTML = `
    <div class="uppercase tracking-[3px] text-xs text-orange-400">FINAL VERDICT</div>
    <div class="text-3xl font-bold mt-1 text-white">${winnerName} WINS</div>
    <div class="text-zinc-400 text-sm mt-1">${cumulativeA} — ${cumulativeB} total points</div>
  `;
  transcript.appendChild(finalCard);

  $('#btn-rematch').disabled = false;
  $('#btn-new-fight').disabled = false;
}

// --- CUSTOM BOT MODAL ---
let pendingSideForCustom = null;

function openCustomBotModal(sideHint) {
  pendingSideForCustom = sideHint;
  $('#custom-modal').classList.remove('hidden');
  $('#custom-modal').classList.add('flex');
}

function closeCustomModal() {
  $('#custom-modal').classList.add('hidden');
  $('#custom-modal').classList.remove('flex');
}

function initCustomModal() {
  $('#custom-cancel').onclick = closeCustomModal;

  $('#custom-save').onclick = () => {
    const name = $('#custom-name').value.trim();
    const corpus = $('#custom-corpus').value.trim();

    if (!name || corpus.length < 30) {
      alert('Please give your clanker a name and at least a paragraph of training text.');
      return;
    }

    try {
      const saved = addOrUpdateCustomBot({
        name,
        subtitle: $('#custom-subtitle').value.trim(),
        avatar: $('#custom-avatar').value.trim() || '🤖',
        color: $('#custom-color').value,
        order: parseInt($('#custom-order').value, 10) || 2,
        corpus
      });

      closeCustomModal();

      // Auto-select the newly created bot on the side the user clicked from
      if (pendingSideForCustom === 'a') {
        selectedA = saved.key;
      } else if (pendingSideForCustom === 'b') {
        selectedB = saved.key;
      }

      // Rebuild selectors so the new bot appears
      buildSelector('#fighter-a', (k) => { selectedA = k; }, selectedA);
      buildSelector('#fighter-b', (k) => { selectedB = k; }, selectedB);

    } catch (e) {
      alert('Failed to train custom bot: ' + e.message);
    }
  };

  // Allow importing a JSON file directly into the modal (nice DX)
  const corpusArea = $('#custom-corpus');
  corpusArea.addEventListener('paste', async (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (text.trim().startsWith('{')) {
      try {
        const imported = importBotFromJSON(text);
        alert(`Imported "${imported.name}" from your friend!`);
        closeCustomModal();

        if (pendingSideForCustom === 'a') selectedA = imported.key;
        else selectedB = imported.key;

        buildSelector('#fighter-a', (k) => selectedA = k, selectedA);
        buildSelector('#fighter-b', (k) => selectedB = k, selectedB);
      } catch (err) {
        // not JSON, normal paste
      }
    }
  });
}

// --- boot everything ---
export function init() {
  // Fighter selectors (now includes persisted custom bots)
  buildSelector('#fighter-a', (k) => selectedA = k, 'CLANK-47');
  buildSelector('#fighter-b', (k) => selectedB = k, 'Scrapheap');

  // Custom bot modal wiring
  initCustomModal();

  // Also wire a global "Import Bot" somewhere — for now the paste-in-modal works great
  // Add a tiny import button next to the title for power users
  const title = $('#title');
  if (title) {
    title.title = 'Click to clank • Double-click to import a friend\'s bot';
    title.ondblclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files[0];
        const text = await file.text();
        try {
          const bot = importBotFromJSON(text);
          alert(`Imported ${bot.name}! It is now available in the list.`);
          buildSelector('#fighter-a', (k) => selectedA = k, selectedA);
          buildSelector('#fighter-b', (k) => selectedB = k, selectedB);
        } catch (e) {
          alert('Import failed: ' + e.message);
        }
      };
      input.click();
    };
  }

  // Start button
  $('#btn-throw-down').onclick = () => {
    enterArena(selectedA, selectedB);
  };

  // Rematch
  $('#btn-rematch').onclick = () => {
    const leftName = $('#left-name')?.textContent;
    const rightName = $('#right-name')?.textContent;

    // Try to find keys by name (works for custom too)
    const all = [...getRobotList(), ...getCustomBots()];
    const keyA = all.find(b => b.name === leftName)?.key || selectedA;
    const keyB = all.find(b => b.name === rightName)?.key || selectedB;

    $('#arena-screen').classList.add('hidden');
    $('#selector-screen').classList.remove('hidden');
    setTimeout(() => enterArena(keyA, keyB), 50);
  };

  // New fight
  $('#btn-new-fight').onclick = () => location.reload();

  // Safety net for next round button (in case it's clicked outside the loop)
  const nextBtnSafety = $('#btn-next-round');
  if (nextBtnSafety) {
    nextBtnSafety.onclick = () => {
      const container = $('#next-round-container');
      if (container) container.classList.add('hidden');
      // If the fight is stuck, user can at least reload to try again
      // (we can improve this later with a proper state machine)
    };
  }

  // Easter egg
  $('#title').onclick = () => playClank('good');

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !$('#selector-screen').classList.contains('hidden')) {
      e.preventDefault();
      $('#btn-throw-down').click();
    }
    if (e.key.toLowerCase() === '?' && currentFight) {
      console.log('%c[CLANK FIGHTS] last fight data:', 'color:#f97316', currentFight);
    }
  });

  console.log('%c[CLANK FIGHTS] Stage + custom bots ready. Double-click the title to import a friend\'s .json bot.', 'color:#666');
}

// =====================================================
// DEBUG / STRESS TEST TOOLS (use from console)
// =====================================================

function _simpleRepetitionScore(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 6) return 0;
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const repeats = Object.values(freq).filter(c => c > 1).length;
  return repeats / words.length; // higher = more repetitive
}

function _textSimilarity(aText, bText) {
  const a = new Set(aText.toLowerCase().split(/\s+/).filter(Boolean));
  const b = new Set(bText.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

window.clankDebug = {
  /**
   * Run many mirror matches (same bot vs itself) and report stats.
   * Good for spotting echo / repetition problems.
   */
  async runMirrorTest(count = 40) {
    const bots = getRobotList();
    const results = [];

    for (let i = 0; i < count; i++) {
      const botKey = bots[Math.floor(Math.random() * bots.length)].key;

      const engine = new BattleEngine(botKey, botKey); // mirror match
      const fight = await engine.runFullFight();

      const aText = fight.history.map(r => r.a.text).join(' ');
      const bText = fight.history.map(r => r.b.text).join(' ');

      const repA = _simpleRepetitionScore(aText);
      const repB = _simpleRepetitionScore(bText);
      const similarity = _textSimilarity(aText, bText);

      results.push({ botKey, repA, repB, similarity });
    }

    const avgRep = results.reduce((s, r) => s + (r.repA + r.repB) / 2, 0) / results.length;
    const avgSim = results.reduce((s, r) => s + r.similarity, 0) / results.length;
    const highSim = results.filter(r => r.similarity > 0.45).length;

    console.group('%c[CLANK DEBUG] Mirror Match Stress Test', 'color:#22c55e');
    console.log(`Ran ${count} mirror fights`);
    console.log(`Average intra-bot repetition: ${(avgRep * 100).toFixed(1)}%`);
    console.log(`Average A vs B text similarity: ${(avgSim * 100).toFixed(1)}%`);
    console.log(`Fights with high similarity (>45%): ${highSim}/${count}`);
    console.log('Worst offenders:', results.sort((x, y) => y.similarity - x.similarity).slice(0, 5));
    console.groupEnd();

    return results;
  },

  /**
   * Run random (usually different) bot matchups.
   */
  async runRandomTest(count = 40) {
    const bots = getRobotList();
    const results = [];

    for (let i = 0; i < count; i++) {
      let a = bots[Math.floor(Math.random() * bots.length)].key;
      let b = bots[Math.floor(Math.random() * bots.length)].key;

      const engine = new BattleEngine(a, b);
      const fight = await engine.runFullFight();

      const aText = fight.history.map(r => r.a.text).join(' ');
      const bText = fight.history.map(r => r.b.text).join(' ');

      const repA = _simpleRepetitionScore(aText);
      const repB = _simpleRepetitionScore(bText);
      const similarity = _textSimilarity(aText, bText);

      results.push({ a, b, repA, repB, similarity });
    }

    const avgRep = results.reduce((s, r) => s + (r.repA + r.repB) / 2, 0) / results.length;
    const avgSim = results.reduce((s, r) => s + r.similarity, 0) / results.length;

    console.group('%c[CLANK DEBUG] Random Match Stress Test', 'color:#eab308');
    console.log(`Ran ${count} random fights`);
    console.log(`Average intra-bot repetition: ${(avgRep * 100).toFixed(1)}%`);
    console.log(`Average cross-bot similarity: ${(avgSim * 100).toFixed(1)}%`);
    console.groupEnd();

    return results;
  },

  // Quick helper to test one specific mirror match in the console
  async testOneMirror(botKey) {
    const engine = new BattleEngine(botKey, botKey);
    const fight = await engine.runFullFight();
    console.log('Fight result:', fight);
    return fight;
  }
};

console.log('%c[CLANK DEBUG] Stress test tools ready. Try: clankDebug.runMirrorTest(50) or clankDebug.runRandomTest(50)', 'color:#666');