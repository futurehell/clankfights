// Scoring engine - the "backend" that the judge robot reads
// Three axes: wordsUsed, clarity, meaning → total 0-300 per round

import { ROBOTS } from './bots.js';

// Robot-themed power words that give "meaning" points in a battle
const BATTLE_KEYWORDS = [
  'clank', 'rust', 'gear', 'piston', 'hydraulic', 'servo', 'scrap', 'oil', 'bolt',
  'weld', 'grind', 'overclock', 'segfault', 'cpu', 'motherboard', 'circuit',
  'drip', 'torque', 'valve', 'thermal', 'fan', 'kernel', 'cache', 'binary',
  'destroy', 'clank you', 'your mom', 'trash', 'weak', 'rust bucket', 'toaster',
  'defeat', 'win', 'lose', 'bars', 'flow', 'verse', 'spit', 'mic', 'crowd'
];

// Naive but hilarious rhyme detector
function lastSyllable(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 2) return clean;
  return clean.slice(-3);
}

function countRhymes(lines) {
  if (!lines || lines.length < 2) return 0;

  let hits = 0;
  let pairs = 0;

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1].split(' ').pop() || '';
    const curr = lines[i].split(' ').pop() || '';
    pairs++;

    if (lastSyllable(prev) === lastSyllable(curr)) {
      hits++;
    }
  }
  return pairs > 0 ? (hits / pairs) : 0;
}

// Extract words, remove boring ones
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'you', 'that', 'for', 'are'].includes(w));
}

export function computeRoundScores(rapperText, opponentText, botKey) {
  const words = tokenize(rapperText);
  const unique = new Set(words);
  const totalWords = words.length || 1;

  // 1. WORDS USED (lexical diversity + fancy word bonus)
  // Very generous — these robots are proud of their limited vocab and catchphrases
  const diversity = Math.min(1, (unique.size + 3) / Math.max(6, totalWords * 0.38));
  const longWordBonus = words.filter(w => w.length >= 7).length * 0.06;
  const robotWordBonus = words.filter(w => BATTLE_KEYWORDS.some(k => w.includes(k))).length * 0.035;

  const wordsUsed = Math.round(
    Math.min(100, (diversity * 48) + (longWordBonus * 95) + (robotWordBonus * 105) + 35)
  );

  // 2. CLARITY - we will pass in the actual Markov avg prob from the generator
  // For now a placeholder that gets overridden by battle.js
  let clarity = 50;

  // 3. MEANING - battle energy + rhyme + aggression
  const rhymeDensity = countRhymes(rapperText.split('\n').filter(l => l.trim()));
  const keywordHits = words.filter(w =>
    BATTLE_KEYWORDS.some(kw => w.includes(kw) || kw.includes(w))
  ).length;

  const aggression = Math.min(1, keywordHits / Math.max(5, totalWords * 0.32));
  const mentionedOpponent = /clank|servo|scrap|giga|rust|bucket|toaster|weak|trash/i.test(opponentText) ? 9 : 0;

  const meaning = Math.round(
    Math.min(100,
      (rhymeDensity * 42) +
      (aggression * 38) +
      mentionedOpponent +
      (keywordHits * 2.4) +
      (words.length > 18 ? 22 : 8)
    )
  );

  // Weighted total (fun to tweak)
  const total = Math.round(
    (wordsUsed * 0.28) + (clarity * 0.26) + (meaning * 0.46)
  );

  return {
    wordsUsed: Math.max(8, Math.min(100, wordsUsed)),
    clarity: Math.max(8, Math.min(100, clarity)),
    meaning: Math.max(8, Math.min(100, meaning)),
    total: Math.max(30, Math.min(300, total))
  };
}

// Called by battle engine after we have real Markov probabilities
export function applyClarityScore(scores, avgProb) {
  // avgProb is 0-1 from markov.getAverageProbability
  // Higher prob = bot was "confident" in its own style → clearer
  const clarity = Math.round(
    38 + (avgProb * 58) + (Math.random() * 7 - 3) // tiny chaos
  );
  scores.clarity = Math.max(12, Math.min(100, clarity));

  // Recalculate total
  scores.total = Math.round(
    (scores.wordsUsed * 0.28) + (scores.clarity * 0.26) + (scores.meaning * 0.46)
  );
  scores.total = Math.max(30, Math.min(300, scores.total));
  return scores;
}

// Verdict based on average performance (0-100 scale)
// User buckets: 0-25 BAD, 25-50 MEH, 50-75 GOOD, 75+ HELL YEAH
export function getVerdict(scores) {
  // scores can be the round object {wordsUsed, clarity, meaning, total} or just a number
  let avg = 0;

  if (typeof scores === 'number') {
    avg = scores / 3; // fallback if someone passes total
  } else {
    const { wordsUsed = 0, clarity = 0, meaning = 0 } = scores;
    avg = (wordsUsed + clarity + meaning) / 3;
  }

  if (avg >= 75) {
    return { label: 'HELL YEAH', color: '#fde047', tier: 'great', avg: Math.round(avg) };
  }
  if (avg >= 50) {
    return { label: 'GOOD', color: '#4ade80', tier: 'solid', avg: Math.round(avg) };
  }
  if (avg >= 25) {
    return { label: 'MEH', color: '#facc15', tier: 'meh', avg: Math.round(avg) };
  }
  return { label: 'BAD', color: '#f87171', tier: 'garbage', avg: Math.round(avg) };
}