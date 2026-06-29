import { $ } from './ui-dom.js';

export function addTranscriptLine(speaker, text, color) {
  const feed = $('#transcript');
  if (!feed) return;

  const line = document.createElement('div');
  line.className = 'transcript-line';
  line.innerHTML = `
    <span class="speaker" style="color:${color}">${speaker}</span>
    <span class="text text-zinc-200">${text}</span>
  `;
  feed.appendChild(line);
  feed.scrollTop = feed.scrollHeight;
}

// Small PS1-style judge reaction after a line (per-line feedback)
export function addJudgeLineReaction(reaction, isGood) {
  const feed = $('#transcript');
  if (!feed) return;

  const div = document.createElement('div');
  div.className = `text-[11px] px-3 py-px my-1 ml-6 inline-block rounded font-bold tracking-wider ${isGood ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'}`;
  div.style.fontFamily = '"Press Start 2P", system-ui';
  div.textContent = `JUDGE: ${reaction}`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}
