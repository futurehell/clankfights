import { $ } from './ui-dom.js';

// Update the floating judge quip badge (above the PNG)
export function setJudgeCommentBox(text) {
  const box = $('#judge-comment-box');
  if (!box) return;

  box.style.opacity = '1';

  const isGreat = /HELL YEAH|PERFECT|LEGEND|UNSTOPPABLE|FRESH/i.test(text);
  const isBad   = /BAD|WEAK|TRASH|MID|BOO/i.test(text);

  box.textContent = text;

  if (isGreat) {
    box.style.borderColor = '#fde047';
    box.style.color = '#fde047';
    box.style.background = '#2a2200';
  } else if (isBad) {
    box.style.borderColor = '#fb7185';
    box.style.color = '#fb7185';
    box.style.background = '#2a0f0f';
  } else {
    box.style.borderColor = '#a3e635';
    box.style.color = '#a3e635';
    box.style.background = '#1a2e05';
  }

  box.style.transition = 'none';
  box.style.transform = 'scale(0.3) rotate(-12deg)';

  void box.offsetWidth;

  box.style.transition = 'transform 260ms cubic-bezier(0.2, 1.4, 0.3, 1)';
  box.style.transform = 'scale(1.4) rotate(5deg)';

  setTimeout(() => {
    if (box) {
      box.style.transition = 'transform 140ms ease';
      box.style.transform = 'scale(1) rotate(0deg)';
    }
  }, 200);
}
