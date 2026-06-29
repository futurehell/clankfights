import { $ } from './ui-dom.js';
import { sel, fightState } from './ui-state.js';
import { playClank } from './ui-audio.js';
import { buildSelector } from './ui-selector.js';
import { initCustomModal } from './ui-custom.js';
import { enterArena } from './ui-arena.js';
import { getRobotList } from './bots.js';
import { getCustomBots, importBotFromJSON } from './custom-bots.js';
// Side-effect import: installs window.clankDebug + logs readiness (matches original ui.js behavior).
import './debug.js';

// --- boot everything ---
export function init() {
  // Fighter selectors (now includes persisted custom bots)
  buildSelector('#fighter-a', (k) => sel.a = k, 'CLANK-47');
  buildSelector('#fighter-b', (k) => sel.b = k, 'Scrapheap');

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
          buildSelector('#fighter-a', (k) => sel.a = k, sel.a);
          buildSelector('#fighter-b', (k) => sel.b = k, sel.b);
        } catch (e) {
          alert('Import failed: ' + e.message);
        }
      };
      input.click();
    };
  }

  // Start button
  $('#btn-throw-down').onclick = () => {
    enterArena(sel.a, sel.b);
  };

  // Rematch
  $('#btn-rematch').onclick = () => {
    const leftName = $('#left-name')?.textContent;
    const rightName = $('#right-name')?.textContent;

    // Try to find keys by name (works for custom too)
    const all = [...getRobotList(), ...getCustomBots()];
    const keyA = all.find(b => b.name === leftName)?.key || sel.a;
    const keyB = all.find(b => b.name === rightName)?.key || sel.b;

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
    if (e.key.toLowerCase() === '?' && fightState.current) {
      console.log('%c[CLANK FIGHTS] last fight data:', 'color:#f97316', fightState.current);
    }
  });

  console.log('%c[CLANK FIGHTS] Stage + custom bots ready. Double-click the title to import a friend\'s .json bot.', 'color:#666');
}
