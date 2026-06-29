import { $, setText } from './ui-dom.js';
import { fightState } from './ui-state.js';
import { playClank } from './ui-audio.js';
import { addTranscriptLine } from './ui-transcript.js';
import { setJudgeCommentBox } from './ui-judge.js';
import {
  shakePerformer,
  setPerformer,
  updateJudgeFace,
  showSideReaction,
  pulseRobotRing,
  showRoundWinner
} from './ui-performer.js';
import { showPaRappaVerdict } from './ui-verdict.js';
import { BattleEngine } from './battle.js';
import { ROBOTS } from './bots.js';
import { getBotDefinition } from './custom-bots.js';

export function enterArena(aKey, bKey) {
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
export async function runLiveFight(aKey, bKey) {
  // Resolve definitions (works for both builtin and custom keys)
  const defA = getBotDefinition(aKey, ROBOTS) || { name: aKey, avatar: '🤖', color: '#f97316' };
  const defB = getBotDefinition(bKey, ROBOTS) || { name: bKey, avatar: '🗑️', color: '#22c55e' };

  const engine = new BattleEngine(aKey, bKey);
  fightState.current = engine;

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
