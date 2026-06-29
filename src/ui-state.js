// Shared mutable selection state. ESM bindings can't be reassigned across
// modules, so we share a single mutable object instead of `let` exports.
export const sel = { a: 'CLANK-47', b: 'Scrapheap' };

// Holds the most recent BattleEngine instance (read by the keyboard debug shortcut).
export const fightState = { current: null };
