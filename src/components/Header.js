import { icon } from './icons.js';
export function header(title, right = '', extra = '') {
  return `<header class="screen-header ${extra}"><button class="icon-button" data-action="back" aria-label="Go back">${icon('arrow')}</button><strong class="screen-header-title"><span class="screen-header-brand">FMG</span><span>${title}</span></strong><div class="header-right">${right}</div></header>`;
}
export function iconButton(name, action, label, extra = '') {
  return `<button class="icon-button ${extra}" data-action="${action}" aria-label="${label}">${icon(name)}</button>`;
}
