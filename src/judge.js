// Judge bot - the mean (but fair?) third Markov entity
// Takes scores + generated text and produces roast or praise + GOOD/BAD stamp

import { getJudge } from './bots.js';
import { getVerdict } from './scoring.js';

let judgeBot = null;

function ensureJudge() {
  if (!judgeBot) judgeBot = getJudge();
  return judgeBot;
}

// Generate a short judge comment. Tries to be actually funny.
export function judgeRound(roundNumber, aName, aScores, bName, bScores, aText, bText) {
  const j = ensureJudge();

  const aVerdict = getVerdict(aScores);
  const bVerdict = getVerdict(bScores);

  const winner = aScores.total > bScores.total ? aName : bName;
  const loser = aScores.total > bScores.total ? bName : aName;
  const margin = Math.abs(aScores.total - bScores.total);

  // Seed the judge Markov with some battle context so it stays on theme
  const context = `${aName} ${bName} round ${roundNumber} ${winner} ${loser} clank gears oil rust`;

  // Generate 1-2 raw lines from the judge corpus
  const raw = j.generate(18);
  let flavor = j.toBars(raw, 2).join(' ');

  // Force some personality with string surgery (we are allowed to be stupid)
  flavor = flavor
    .replace(/clank/gi, winner.includes('CLANK') ? 'CLANK-47' : 'the clanker')
    .replace(/servo/gi, 'the drip lord')
    .replace(/scrap/gi, 'the old bastard')
    .replace(/giga/gi, 'the wattage demon');

  // Build the actual verdict sentence
  let comment = '';

  if (margin > 70) {
    comment = `${winner} just cooked ${loser}. ${flavor}`;
  } else if (margin > 35) {
    comment = `${winner} took that one cleanly. ${flavor}`;
  } else {
    comment = `Close round but ${winner} edged it. ${flavor}`;
  }

  // Add the numeric stamp the user specifically asked for
  const aStamp = `${aVerdict.label} ${aScores.total}/300`;
  const bStamp = `${bVerdict.label} ${bScores.total}/300`;

  return {
    round: roundNumber,
    comment: comment.trim(),
    a: { name: aName, score: aScores.total, verdict: aStamp, color: aVerdict.color },
    b: { name: bName, score: bScores.total, verdict: bStamp, color: bVerdict.color },
    winner,
    margin
  };
}

// Final overall judge summary after 3 rounds
export function judgeFinal(aName, aTotal, bName, bTotal) {
  const j = ensureJudge();
  const winner = aTotal > bTotal ? aName : bName;
  const loser = aTotal > bTotal ? bName : aName;
  const diff = Math.abs(aTotal - bTotal);

  const raw = j.generate(14);
  let flavor = j.toBars(raw, 1)[0] || 'the whole arena needs an oil change after that';

  let summary = '';
  if (diff > 120) {
    summary = `${winner} absolutely dismantled ${loser}. ${flavor}`;
  } else if (diff > 50) {
    summary = `${winner} takes the belt. ${loser} should go back to the shop. ${flavor}`;
  } else {
    summary = `Extremely close. ${winner} wins on points but ${loser} made it ugly. ${flavor}`;
  }

  return {
    winner,
    aTotal,
    bTotal,
    summary: summary.trim(),
    verdict: diff > 80 ? 'DOMINATION' : diff > 30 ? 'DECENT' : 'SCRAP FIGHT'
  };
}