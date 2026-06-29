import { $, setText } from './ui-dom.js';

// --- helpers for the new stage ---
export function shakePerformer(side) {
  const el = $('#' + side + '-performer');
  if (!el) return;
  el.classList.add('shaking');
  setTimeout(() => el.classList.remove('shaking'), 700);
}

export function setPerformer(side, def) {
  const prefix = side; // left or right
  setText($('#' + prefix + '-name'), def.name);
  setText($('#' + prefix + '-subtitle'), def.subtitle || '');
  const av = $('#' + prefix + '-avatar');
  if (av) av.textContent = def.avatar || '🤖';

  // store color on the element for transcript lines
  const performerEl = $('#' + prefix + '-performer');
  if (performerEl) performerEl.dataset.color = def.color || '#f97316';
}

// Central judge face reactions - text faces on the body image
export function updateJudgeFace(tierOrReaction) {
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
export function showSideReaction(side, text, isGood = true) {
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
export function pulseRobotRing(side, type = 'meh') {
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
export function showRoundWinner(roundNumber, winnerName) {
  const el = $('#round-winner');
  if (!el) return;
  el.textContent = `ROUND ${roundNumber} WINNER: ${winnerName.toUpperCase()}`;
  el.classList.remove('hidden');
}
