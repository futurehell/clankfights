// Custom Bots — friends can create, save, export, and import Markov clankers
// Everything lives in localStorage under "clank-fights-custom-bots"

import { createBot } from './markov.js';

const STORAGE_KEY = 'clank-fights-custom-bots';

let customBots = []; // array of bot definitions

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      customBots = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load custom bots from localStorage', e);
    customBots = [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customBots));
  } catch (e) {
    console.warn('Failed to save custom bots', e);
  }
}

export function getCustomBots() {
  if (customBots.length === 0) loadFromStorage();
  return [...customBots];
}

export function getAllBots() {
  // This will be used by the UI to merge with builtins
  // We return them in a normalized shape
  return getCustomBots().map(b => ({
    ...b,
    isCustom: true
  }));
}

// Generate a stable-ish key for a custom bot
function makeCustomKey(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  return `custom-${Date.now().toString(36)}-${slug}`;
}

// Add or update a custom bot definition (does NOT train yet — training is lazy)
export function addOrUpdateCustomBot(def) {
  if (!def.name || !def.corpus || def.corpus.trim().length < 20) {
    throw new Error('Custom bot needs a name and a decent-sized corpus (at least ~20 chars)');
  }

  const key = def.key || makeCustomKey(def.name);

  const botDef = {
    key,
    name: def.name.trim(),
    subtitle: (def.subtitle || 'Custom Clanker').trim(),
    avatar: def.avatar || '🤖',
    color: def.color || '#fb923c',
    order: def.order || 2,
    corpus: def.corpus.trim(),
    createdAt: def.createdAt || Date.now()
  };

  // Remove any previous with same key
  customBots = customBots.filter(b => b.key !== key);
  customBots.push(botDef);

  saveToStorage();
  return botDef;
}

export function deleteCustomBot(key) {
  customBots = customBots.filter(b => b.key !== key);
  saveToStorage();
}

// Create a live Markov instance for a custom bot (or builtin key)
export function getTrainedBot(key, builtinRobots) {
  // Make sure custom bots are loaded from localStorage
  if (customBots.length === 0) {
    // trigger load (safe to call multiple times)
    // We call the public getter which does the load
    getCustomBots();
  }

  // First check if it's a builtin
  if (builtinRobots && builtinRobots[key]) {
    const def = builtinRobots[key];
    return createBot(def.corpus, def.order || 2);
  }

  // Then check customs
  const custom = customBots.find(b => b.key === key);
  if (custom) {
    return createBot(custom.corpus, custom.order || 2);
  }

  throw new Error('Unknown bot key: ' + key);
}

// Get the full definition for a key (builtin or custom)
export function getBotDefinition(key, builtinRobots) {
  if (builtinRobots && builtinRobots[key]) {
    return { ...builtinRobots[key], key, isCustom: false };
  }
  const c = customBots.find(b => b.key === key);
  if (c) return { ...c, isCustom: true };
  return null;
}

// Export a single bot as a nice JSON file
export function exportBotToJSON(key, builtinRobots) {
  const def = getBotDefinition(key, builtinRobots);
  if (!def) throw new Error('Bot not found');

  const exportData = {
    _clankFightsBot: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    ...def
  };

  // Remove internal fields we don't want to export
  delete exportData.isCustom;
  delete exportData.createdAt;

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${def.name.replace(/\s+/g, '-')}-clanker.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import from JSON string or object (from friend)
export function importBotFromJSON(jsonOrString) {
  let data;
  if (typeof jsonOrString === 'string') {
    data = JSON.parse(jsonOrString);
  } else {
    data = jsonOrString;
  }

  if (!data._clankFightsBot) {
    throw new Error('This doesn\'t look like a Clank Fights bot export');
  }

  // Re-create with fresh key so we don't collide if the same file is imported twice
  const newDef = {
    name: data.name,
    subtitle: data.subtitle,
    avatar: data.avatar,
    color: data.color,
    order: data.order,
    corpus: data.corpus
  };

  const saved = addOrUpdateCustomBot(newDef);
  return saved;
}

// For the UI: returns a combined list ready for rendering cards
export function getCombinedRobotList(builtinList) {
  const customs = getCustomBots().map(b => ({
    key: b.key,
    name: b.name,
    subtitle: b.subtitle,
    avatar: b.avatar,
    color: b.color,
    description: 'Custom • trained on ' + b.corpus.split(/\s+/).length + ' words',
    isCustom: true
  }));

  return [...builtinList, ...customs];
}