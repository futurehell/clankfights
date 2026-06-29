import { $, $$ } from './ui-dom.js';
import { sel } from './ui-state.js';
import { getRobotList, ROBOTS } from './bots.js';
import {
  getCombinedRobotList,
  exportBotToJSON,
  deleteCustomBot
} from './custom-bots.js';
import { openCustomBotModal } from './ui-custom.js';

// --- build the fighter selector cards (now with custom bots + create button) ---
export function buildSelector(containerId, onSelect, preselect) {
  const container = $(containerId);
  if (!container) return;

  container.innerHTML = '';

  // Get combined list (builtins + persisted customs)
  const list = getCombinedRobotList(getRobotList());

  list.forEach(bot => {
    const isCustom = !!bot.isCustom;
    const card = document.createElement('div');
    card.className = `robot-card p-3 rounded-xl border-2 cursor-pointer transition-all bg-zinc-900 hover:bg-zinc-800 flex flex-col ${bot.key === preselect ? 'border-orange-500 ring-1 ring-orange-500/50' : 'border-zinc-700'}`;

    card.innerHTML = `
      <div class="flex items-center gap-3 flex-1">
        <div class="text-4xl">${bot.avatar}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <div class="font-bold text-lg tracking-tight" style="color:${bot.color}">${bot.name}</div>
            ${isCustom ? '<span class="custom-badge">CUSTOM</span>' : ''}
          </div>
          <div class="text-[10px] text-zinc-400 -mt-0.5">${bot.subtitle}</div>
          <div class="text-xs text-zinc-500 mt-1 line-clamp-2">${bot.description || ''}</div>
        </div>
      </div>
      ${isCustom ? `
        <div class="flex gap-1 mt-2 pt-2 border-t border-zinc-800">
          <button data-export="${bot.key}" class="text-[10px] px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-800 flex-1">Export</button>
          <button data-delete="${bot.key}" class="text-[10px] px-2 py-0.5 rounded border border-red-900/60 text-red-400 hover:bg-red-950 flex-1">Delete</button>
        </div>` : ''}
    `;

    // Main click selects the bot
    card.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') return; // export/delete handled below

      $$('#' + container.id + ' .robot-card').forEach(c => {
        c.classList.remove('border-orange-500', 'ring-1', 'ring-orange-500/50');
        c.classList.add('border-zinc-700');
      });
      card.classList.add('border-orange-500', 'ring-1', 'ring-orange-500/50');
      card.classList.remove('border-zinc-700');
      onSelect(bot.key);
    };

    // Export button
    const exportBtn = card.querySelector('[data-export]');
    if (exportBtn) {
      exportBtn.onclick = (e) => {
        e.stopImmediatePropagation();
        try {
          exportBotToJSON(bot.key, ROBOTS);
        } catch (err) {
          alert('Export failed: ' + err.message);
        }
      };
    }

    // Delete button
    const delBtn = card.querySelector('[data-delete]');
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopImmediatePropagation();
        if (confirm(`Delete custom clanker "${bot.name}"?`)) {
          deleteCustomBot(bot.key);
          // Rebuild both selectors
          buildSelector('#fighter-a', (k) => { sel.a = k; }, sel.a);
          buildSelector('#fighter-b', (k) => { sel.b = k; }, sel.b);
        }
      };
    }

    container.appendChild(card);
  });

  // Always add the "+ Create Custom" card at the end
  const createCard = document.createElement('div');
  createCard.className = 'robot-card p-3 rounded-xl border-2 border-dashed border-zinc-600 hover:border-orange-500/60 cursor-pointer flex items-center justify-center bg-zinc-900/50 min-h-[92px]';
  createCard.innerHTML = `
    <div class="text-center">
      <div class="text-3xl opacity-70">+</div>
      <div class="text-sm text-orange-400 font-bold tracking-wider">CREATE CUSTOM</div>
      <div class="text-[10px] text-zinc-400">from your own corpus</div>
    </div>
  `;
  createCard.onclick = () => openCustomBotModal(containerId === 'fighter-a' ? 'a' : 'b');
  container.appendChild(createCard);
}
