import { $ } from './ui-dom.js';
import { sel } from './ui-state.js';
import { buildSelector } from './ui-selector.js';
import {
  addOrUpdateCustomBot,
  importBotFromJSON
} from './custom-bots.js';

// --- CUSTOM BOT MODAL ---
let pendingSideForCustom = null;

export function openCustomBotModal(sideHint) {
  pendingSideForCustom = sideHint;
  $('#custom-modal').classList.remove('hidden');
  $('#custom-modal').classList.add('flex');
}

export function closeCustomModal() {
  $('#custom-modal').classList.add('hidden');
  $('#custom-modal').classList.remove('flex');
}

export function initCustomModal() {
  $('#custom-cancel').onclick = closeCustomModal;

  $('#custom-save').onclick = () => {
    const name = $('#custom-name').value.trim();
    const corpus = $('#custom-corpus').value.trim();

    if (!name || corpus.length < 30) {
      alert('Please give your clanker a name and at least a paragraph of training text.');
      return;
    }

    try {
      const saved = addOrUpdateCustomBot({
        name,
        subtitle: $('#custom-subtitle').value.trim(),
        avatar: $('#custom-avatar').value.trim() || '🤖',
        color: $('#custom-color').value,
        order: parseInt($('#custom-order').value, 10) || 2,
        corpus
      });

      closeCustomModal();

      // Auto-select the newly created bot on the side the user clicked from
      if (pendingSideForCustom === 'a') {
        sel.a = saved.key;
      } else if (pendingSideForCustom === 'b') {
        sel.b = saved.key;
      }

      // Rebuild selectors so the new bot appears
      buildSelector('#fighter-a', (k) => { sel.a = k; }, sel.a);
      buildSelector('#fighter-b', (k) => { sel.b = k; }, sel.b);

    } catch (e) {
      alert('Failed to train custom bot: ' + e.message);
    }
  };

  // Allow importing a JSON file directly into the modal (nice DX)
  const corpusArea = $('#custom-corpus');
  corpusArea.addEventListener('paste', async (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (text.trim().startsWith('{')) {
      try {
        const imported = importBotFromJSON(text);
        alert(`Imported "${imported.name}" from your friend!`);
        closeCustomModal();

        if (pendingSideForCustom === 'a') sel.a = imported.key;
        else sel.b = imported.key;

        buildSelector('#fighter-a', (k) => sel.a = k, sel.a);
        buildSelector('#fighter-b', (k) => sel.b = k, sel.b);
      } catch (err) {
        // not JSON, normal paste
      }
    }
  });
}
