const defaults = {
  note: { at: 1200, ms: 2600 },
  interrupted: { at: 'done', ms: 650 },
  flash: { at: 1500, ms: 170, times: 2, gap: 650 },
};
const timing = at => (at === 'done' ? { at: 'done', delay: 0 } : { at: 'start', delay: at });
export function planStimuli(step) {
  const authored = (step.sub || []).flatMap((entry, index) => {
    const d = { ...defaults[entry.mode], ...entry };
    const key = `${step.id}:${index}`;
    if (d.mode !== 'flash') return [{ key, mode: d.mode, text: d.text, ms: d.ms, ...timing(d.at) }];
    return Array.from({ length: d.times }, (_, t) => ({ key: `${key}:${t}`, mode: 'flash', text: d.text, ms: d.ms, ...timing(d.at), delay: timing(d.at).delay + t * d.gap }));
  });
  if (step.between) authored.push({ key: `${step.id}:between`, mode: 'flash', text: step.between, ms: 150, at: 'done', delay: 320 });
  return authored;
}
export function runStimuli(plan, { show, hide }) {
  const timers = new Set();
  const later = (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
  const fire = entry => { show(entry); later(() => hide(entry.key), entry.ms); };
  const schedule = phase => plan.filter(entry => entry.at === phase).forEach(entry => later(() => fire(entry), entry.delay));
  schedule('start');
  return { done: () => schedule('done'), stop: () => { timers.forEach(clearTimeout); timers.clear(); } };
}
