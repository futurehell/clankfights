// MarkovChain - word-level n-gram text generator for the clank bots
// Stupid but effective. Higher order = more coherent (less funny). Lower = pure chaos.

export class MarkovChain {
  constructor(order = 2) {
    this.order = order;
    this.chain = new Map(); // key: "word1 word2" -> array of follower words
    this.starters = [];     // possible starting n-grams
    this.wordList = [];     // all words seen (for fallback)
  }

  // Train on a big string of rap text
  train(text) {
    if (!text || text.trim().length === 0) return;

    // Normalize: lowercase for matching, keep some flavor
    const normalized = text.toLowerCase()
      .replace(/[^\w\s'!?,.]/g, ' ') // keep basic punctuation
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized.split(' ').filter(w => w.length > 0);
    if (words.length < this.order + 1) return;

    this.wordList = [...new Set(words)];

    // Build n-gram chain
    for (let i = 0; i <= words.length - this.order; i++) {
      const keyArr = words.slice(i, i + this.order);
      const key = keyArr.join(' ');
      const next = words[i + this.order];

      if (!this.chain.has(key)) {
        this.chain.set(key, []);
      }
      this.chain.get(key).push(next);

      if (i === 0) {
        this.starters.push(key);
      }
    }
  }

  // Get a random follower for a key, or null
  _getNext(key) {
    const followers = this.chain.get(key);
    if (!followers || followers.length === 0) return null;
    return followers[Math.floor(Math.random() * followers.length)];
  }

  // Same as _getNext but tries to avoid recently used words when possible
  _getNextAvoiding(key, recentSet) {
    const followers = this.chain.get(key);
    if (!followers || followers.length === 0) return null;

    const fresh = followers.filter(w => !recentSet.has(w));
    if (fresh.length > 0) {
      return fresh[Math.floor(Math.random() * fresh.length)];
    }
    // fallback to normal if everything is recent
    return followers[Math.floor(Math.random() * followers.length)];
  }

  // Generate a sequence of words. Returns array of words.
  // Now more persistent: restarts from new starters when the chain dies (sounds like new lines)
  generate(maxWords = 40, options = {}) {
    if (this.chain.size === 0 || this.starters.length === 0) {
      return ['clank', 'clank', 'my', 'gears', 'are', 'stuck', 'in', 'a', 'loop'];
    }

    const { forceRhymeWith = null } = options;
    let result = [];

    // Light anti-repetition: rolling window of recently used words
    let recent = [];
    const recentSet = new Set();
    const RECENT_WINDOW = 13;

    const addRecent = (word) => {
      recent.push(word);
      recentSet.add(word);
      if (recent.length > RECENT_WINDOW) {
        const old = recent.shift();
        recentSet.delete(old);
      }
    };

    while (result.length < maxWords) {
      // Start a fresh "line" from the starters
      let currentKey = this.starters[Math.floor(Math.random() * this.starters.length)];
      let line = currentKey.split(' ');

      // Walk until we hit a dead end or we have enough
      while (line.length < 11 && result.length + line.length < maxWords) {
        const next = this._getNextAvoiding(currentKey, recentSet);
        if (!next) break;
        line.push(next);
        addRecent(next);

        const newKeyArr = line.slice(line.length - this.order);
        currentKey = newKeyArr.join(' ');
      }

      // Avoid super short fragments
      if (line.length >= 3) {
        result.push(...line);
        // Also add the starter words of this line to recent so we don't loop the same opening
        line.slice(0, 2).forEach(addRecent);
      } else {
        // fallback filler so we always produce something funny
        const fillers = ['clank', 'clank', 'the', 'beat', 'keeps', 'grinding'];
        result.push(...fillers);
        fillers.forEach(addRecent);
      }

      // Small chance to stop early and let toBars chunk it
      if (result.length > maxWords * 0.65 && Math.random() < 0.3) break;
    }

    // Crude rhyme nudge on the very last word
    if (forceRhymeWith && result.length > 4) {
      const last = result[result.length - 1];
      if (!this._rhymesWith(last, forceRhymeWith)) {
        const lastKey = result.slice(-this.order).join(' ');
        const candidates = this.chain.get(lastKey) || this.wordList;
        const better = candidates.find(w => this._rhymesWith(w, forceRhymeWith));
        if (better) result[result.length - 1] = better;
      }
    }

    return result;
  }

  // Turn word array into rap "bars" (array of strings)
  toBars(words, lines = 6) {
    const bars = [];
    let i = 0;
    const chunkSizes = [7, 8, 9, 6, 10, 8];

    const variants = [
      'CLANK... the loop is real',
      'CLANK CLANK the beat just died',
      'My servos are cooked, send help',
      'Hydraulics failed, still spitting',
      'Error 47: flow not found'
    ];

    for (let l = 0; l < lines; l++) {
      const size = chunkSizes[l % chunkSizes.length];
      const slice = words.slice(i, i + size);
      if (slice.length === 0) break;

      let line = slice.join(' ');

      line = line.replace(/\bclank\b/gi, 'CLANK')
                 .replace(/\bclank-?47\b/gi, 'CLANK-47')
                 .replace(/\bgears?\b/gi, 'gears');

      // Replace the "stuck" meme with rotating variants so it feels fresh
      if (/stuck in a loop/i.test(line)) {
        line = variants[l % variants.length];
      }

      if (Math.random() > 0.5) {
        const enders = ['!', '.', '!?', '...', ''];
        line += enders[Math.floor(Math.random() * enders.length)];
      }

      line = line.charAt(0).toUpperCase() + line.slice(1);
      bars.push(line);
      i += size;
    }

    while (bars.length < lines) {
      bars.push(variants[bars.length % variants.length]);
    }

    return bars;
  }

  // Extremely naive rhyme detector (last 2-3 chars)
  _rhymesWith(a, b) {
    if (!a || !b) return false;
    const aa = a.toLowerCase().replace(/[^a-z]/g, '');
    const bb = b.toLowerCase().replace(/[^a-z]/g, '');
    if (aa.length < 2 || bb.length < 2) return false;

    return aa.slice(-2) === bb.slice(-2) || aa.slice(-3) === bb.slice(-3);
  }

  // Average transition probability for a generated sequence (for "clarity" scoring)
  // Returns 0-1 value. Higher = the bot was very confident in these choices.
  getAverageProbability(words) {
    if (words.length < this.order + 1) return 0.3;

    let totalProb = 0;
    let count = 0;

    for (let i = 0; i <= words.length - this.order; i++) {
      const key = words.slice(i, i + this.order).join(' ');
      const followers = this.chain.get(key);
      if (!followers || followers.length === 0) continue;

      const next = words[i + this.order];
      const freq = followers.filter(w => w === next).length;
      const prob = freq / followers.length;

      totalProb += prob;
      count++;
    }

    return count > 0 ? (totalProb / count) : 0.25;
  }

  // For debug / retrain
  stats() {
    return {
      order: this.order,
      keys: this.chain.size,
      starters: this.starters.length,
      totalWords: this.wordList.length
    };
  }
}

// Tiny helper to quickly make a trained bot from a string
export function createBot(corpus, order = 2) {
  const bot = new MarkovChain(order);
  bot.train(corpus);
  return bot;
}