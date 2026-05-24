// Battle engine - runs the 3-round fight, handles timing, generation, scoring

import { getBot } from './bots.js';
import { getTrainedBot } from './custom-bots.js';
import { ROBOTS } from './bots.js';
import { computeRoundScores, applyClarityScore } from './scoring.js';
import { judgeRound, judgeFinal } from './judge.js';

export class BattleEngine {
  constructor(fighterAKey, fighterBKey, opts = {}) {
    this.aKey = fighterAKey;
    this.bKey = fighterBKey;
    // Support both builtin presets and custom bots from localStorage
    this.aBot = getTrainedBot(fighterAKey, ROBOTS);
    this.bBot = getTrainedBot(fighterBKey, ROBOTS);

    this.rounds = opts.rounds || 3;
    this.linesPerRound = opts.linesPerRound || 7;
    this.roundDurationMs = opts.roundDurationMs || 28000; // ~28s real time feels like 2min

    this.currentRound = 0;
    this.history = []; // array of round results
    this.scores = { a: 0, b: 0 };
  }

  // Generate one side's performance for a round
  _generatePerformance(bot, opponentName, linesWanted) {
    // Generate more words than we need so we can cherry-pick
    const rawWords = bot.generate(52 + Math.floor(Math.random() * 12));

    // Occasionally force a "rhyme attempt" on the last line for comedy
    const lastWord = rawWords[rawWords.length - 4] || 'clank';
    const rhymeAttempt = bot.generate(6, { forceRhymeWith: lastWord });

    const combined = [...rawWords, ...rhymeAttempt];
    const bars = bot.toBars(combined, linesWanted);

    // Make it mention the opponent ~40% of the time for "meaning"
    let text = bars.join('\n');
    if (Math.random() < 0.4) {
      const insults = [
        `${opponentName} your whole crew is scrap`,
        `tell ${opponentName} to get back in the shop`,
        `${opponentName.toLowerCase()} can't even hold a charge`
      ];
      text += '\n' + insults[Math.floor(Math.random() * insults.length)];
    }

    const avgProb = bot.getAverageProbability(combined.slice(0, 28));

    return { text, bars: text.split('\n'), avgProb };
  }

  // Run a single round and return the full result object
  async runRound(roundNumber) {
    this.currentRound = roundNumber;

    // Generate both sides
    const aPerf = this._generatePerformance(this.aBot, this.bKey, this.linesPerRound);
    const bPerf = this._generatePerformance(this.bBot, this.aKey, this.linesPerRound);

    // Base scores
    let aScores = computeRoundScores(aPerf.text, bPerf.text, this.aKey);
    let bScores = computeRoundScores(bPerf.text, aPerf.text, this.bKey);

    // Apply real Markov clarity (the secret sauce)
    aScores = applyClarityScore(aScores, aPerf.avgProb);
    bScores = applyClarityScore(bScores, bPerf.avgProb);

    // Tiny random "mechanical failure" event (makes it funnier)
    let events = [];
    if (Math.random() < 0.22) {
      const victim = Math.random() < 0.5 ? 'a' : 'b';
      const name = victim === 'a' ? this.aKey : this.bKey;
      events.push(`${name} suffered a servo seizure mid-round!`);
      if (victim === 'a') aScores.total = Math.max(25, aScores.total - 28);
      else bScores.total = Math.max(25, bScores.total - 28);
    }

    // Judge verdict for this round
    const verdict = judgeRound(
      roundNumber,
      this.aKey, aScores,
      this.bKey, bScores,
      aPerf.text, bPerf.text
    );

    // Accumulate totals
    this.scores.a += aScores.total;
    this.scores.b += bScores.total;

    const roundResult = {
      round: roundNumber,
      a: { name: this.aKey, scores: aScores, bars: aPerf.bars, text: aPerf.text },
      b: { name: this.bKey, scores: bScores, bars: bPerf.bars, text: bPerf.text },
      verdict,
      events,
      timestamp: Date.now()
    };

    this.history.push(roundResult);
    return roundResult;
  }

  // Run all rounds sequentially (with caller-controlled pacing)
  async runFullFight(onRoundComplete, onProgress) {
    this.history = [];
    this.scores = { a: 0, b: 0 };

    for (let r = 1; r <= this.rounds; r++) {
      const result = await this.runRound(r);

      if (onProgress) onProgress(r, this.rounds);
      if (onRoundComplete) await onRoundComplete(result);

      // Tiny pause between rounds so UI can breathe
      if (r < this.rounds) {
        await new Promise(res => setTimeout(res, 420));
      }
    }

    const final = judgeFinal(this.aKey, this.scores.a, this.bKey, this.scores.b);

    return {
      a: { name: this.aKey, total: this.scores.a },
      b: { name: this.bKey, total: this.scores.b },
      final,
      history: this.history
    };
  }
}

// Convenience: create a fight instantly
export function createFight(aKey, bKey) {
  return new BattleEngine(aKey, bKey);
}