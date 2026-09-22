const defaults = {
  peripheral: { at: 1200, ms: 2200, anchor: 'corner' },
  interrupted: { at: 'done', ms: 650, anchor: 'below' },
  flash: { at: 1500, ms: 140, times: 3, gap: 650, anchor: 'backdrop' },
};
const timing = at => (at === 'done' ? { at: 'done', delay: 0 } : { at: 'start', delay: at });
export function planStimuli(step, { flash = true } = {}) {
  return (step.sub || []).flatMap((entry, index) => {
    const d = { ...defaults[entry.mode], ...entry };
    const key = `${step.id}:${index}`;
    if (d.mode !== 'flash') return [{ key, mode: d.mode, text: d.text, anchor: d.anchor, ms: d.ms, ...timing(d.at) }];
    if (!flash) return [{ key, mode: 'peripheral', text: d.text, anchor: 'backdrop', ms: Math.max(1400, d.times * d.gap), ...timing(d.at) }];
    return Array.from({ length: d.times }, (_, t) => ({ key: `${key}:${t}`, mode: 'flash', text: d.text, anchor: d.anchor, ms: d.ms, ...timing(d.at), delay: timing(d.at).delay + t * d.gap }));
  });
}
export function runStimuli(plan, { show, hide }) {
  const timers = new Set();
  const later = (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
  const fire = entry => { show(entry); later(() => hide(entry.key), entry.ms); };
  const schedule = phase => plan.filter(entry => entry.at === phase).forEach(entry => later(() => fire(entry), entry.delay));
  schedule('start');
  return { done: () => schedule('done'), stop: () => { timers.forEach(clearTimeout); timers.clear(); } };
}
