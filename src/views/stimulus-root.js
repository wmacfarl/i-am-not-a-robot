export function stimulusRoot(id, className) {
  const el = html`<div id="${id}" class="${className}"></div>`;
  el.isSameNode = (target) => Boolean(target) && target.id === id && target.className === className;
  return el;
}
