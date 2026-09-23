const defaults = {
  interrupted: { at: 'done', ms: 650 },
  flash: { at: 1500, ms: 130, times: 2, gap: 650 },
};
const tasks = ['cloud', 'trace', 'sequence', 'hold'];
export const spikeOf = step => (tasks.includes(step.type) ? step.spike ?? step.phase?.spike ?? null : null);
const timing = at => (at === 'done' ? { at: 'done', delay: 0 } : { at: 'start', delay: at });
export function planStimuli(step, carry = null) {
  const authored = (step.sub || []).flatMap((entry, index) => {
    const d = { ...defaults[entry.mode], ...entry };
    const key = `${step.id}:${index}`;
    if (d.mode !== 'flash') return [{ key, mode: d.mode, text: d.text, ms: d.ms, ...timing(d.at) }];
    return Array.from({ length: d.times }, (_, t) => ({ key: `${key}:${t}`, mode: 'flash', text: d.text, ms: d.ms, ...timing(d.at), delay: timing(d.at).delay + t * d.gap }));
  });
  if (carry) { const offset = step.id.length % carry.length; for (let i = 0; i < 8; i++) authored.push({ key: `${step.id}:spike:${i}`, mode: 'flash', text: carry[(i + offset) % carry.length], ms: 320, at: 'start', delay: i * 130 }); }
  if (step.between) authored.push({ key: `${step.id}:between`, mode: 'flash', text: step.between, ms: 120, at: 'done', delay: 300 });
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
