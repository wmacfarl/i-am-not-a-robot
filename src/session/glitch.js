let active = null;
let filter = null;
function ensureFilter() {
  if (filter) return filter;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = '<filter id="signal-tear" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox">'
    + '<feFlood flood-color="#000" x="0" y="0" width="1" height="0" result="m1"/>'
    + '<feFlood flood-color="#000" x="0" y="0" width="1" height="0" result="m2"/>'
    + '<feOffset in="SourceGraphic" dx="0" dy="0" x="0" y="0" width="1" height="0" result="s1"/>'
    + '<feOffset in="SourceGraphic" dx="0" dy="0" x="0" y="0" width="1" height="0" result="s2"/>'
    + '<feComposite in="SourceGraphic" in2="m1" operator="out" result="c1"/>'
    + '<feComposite in="c1" in2="m2" operator="out" result="c2"/>'
    + '<feMerge><feMergeNode in="c2"/><feMergeNode in="s1"/><feMergeNode in="s2"/></feMerge>'
    + '</filter>';
  document.documentElement.appendChild(svg);
  filter = { floods: [...svg.querySelectorAll('feFlood')], offsets: [...svg.querySelectorAll('feOffset')] };
  return filter;
}
function setSlice(index, y, height, dx) {
  const { floods, offsets } = ensureFilter();
  for (const node of [floods[index], offsets[index]]) { node.setAttribute('y', y); node.setAttribute('height', height); }
  offsets[index].setAttribute('dx', dx);
}
export function mountGlitch(stage, { intensity }) {
  if (active?.stage === stage) { active.intensity = intensity; return; }
  unmountGlitch();
  active = { stage, intensity, timer: null };
  scheduleTear();
}
export function unmountGlitch() {
  if (!active) return;
  clearTimeout(active.timer);
  active.stage.classList.remove('is-tearing');
  active = null;
}
function scheduleTear() {
  active.timer = setTimeout(tear, (4000 + Math.random() * 6000) / active.intensity);
}
export function tear() {
  if (!active) return;
  clearTimeout(active.timer);
  const { stage, intensity } = active;
  let remaining = 2 + Math.floor(Math.random() * 3);
  const jitter = () => {
    const dx = (Math.random() < 0.5 ? -1 : 1) * (0.01 + Math.random() * 0.035 * intensity);
    setSlice(0, Math.random() * 0.9, 0.03 + Math.random() * 0.07, dx);
    if (Math.random() < 0.6) setSlice(1, Math.random() * 0.9, 0.015 + Math.random() * 0.03, -dx * 0.6);
    else setSlice(1, 0, 0, 0);
    stage.classList.add('is-tearing');
    remaining--;
    active.timer = setTimeout(remaining > 0 ? jitter : () => { stage.classList.remove('is-tearing'); scheduleTear(); }, 40 + Math.random() * 50);
  };
  jitter();
}
