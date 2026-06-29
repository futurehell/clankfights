// --- DOM helpers ---
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function setText(el, txt) { if (el) el.textContent = txt; }
export function addClass(el, c) { el && el.classList.add(c); }
export function removeClass(el, c) { el && el.classList.remove(c); }
