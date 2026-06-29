// =====================================================
// DEBUG / STRESS TEST TOOLS (use from console)
// =====================================================

import { getRobotList } from './bots.js';
import { BattleEngine } from './battle.js';

export function _simpleRepetitionScore(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 6) return 0;
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const repeats = Object.values(freq).filter(c => c > 1).length;
  return repeats / words.length; // higher = more repetitive
}

export function _textSimilarity(aText, bText) {
  const a = new Set(aText.toLowerCase().split(/\s+/).filter(Boolean));
  const b = new Set(bText.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export const clankDebug = {
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

window.clankDebug = clankDebug;

console.log('%c[CLANK DEBUG] Stress test tools ready. Try: clankDebug.runMirrorTest(50) or clankDebug.runRandomTest(50)', 'color:#666');
