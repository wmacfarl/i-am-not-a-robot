const shape = (word, paths) => ({ word, paths });
export const symbols = {
  center: shape('CENTER', [{ d: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17' }, { d: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6', fill: true }]),
  follow: shape('FOLLOW', [{ d: 'M18.4 9.4A7.4 7.4 0 1 0 19.4 14.4' }, { d: 'M14.6 5.6L19 9.8L14.9 13.9' }]),
  hold: shape('HOLD', [{ d: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z' }, { d: 'M9 9h6v6H9z', fill: true }]),
  select: shape('SELECT', [{ d: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z' }, { d: 'M8 12.3l3 2.9l5.4-5.8' }]),
  accept: shape('ACCEPT', [{ d: 'M5 12.6l5 4.8l9.4-10.2' }]),
  ring: shape('', [{ d: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16' }]),
  cross: shape('', [{ d: 'M6 6l12 12M18 6L6 18' }]),
  triangle: shape('', [{ d: 'M12 4.5L20 19H4z' }]),
  wave: shape('', [{ d: 'M3 12c3-6 6-6 9 0s6 6 9 0' }]),
  diamond: shape('', [{ d: 'M12 3.5L20.5 12L12 20.5L3.5 12z' }]),
  arrow: shape('', [{ d: 'M4 12h15M14 7l5 5l-5 5' }]),
  bar: shape('', [{ d: 'M4 12h16' }]),
  half: shape('', [{ d: 'M12 4a8 8 0 0 1 0 16z', fill: true }]),
};
export const glyphOf = tile => tile.split('-')[0];

const phase = (id, title, extra = {}) => ({ id, title, chamber: false, carrier: false, footer: [], ring: [], ...extra });
export const phases = [
  phase('verify', 'Human verification', { footer: ['Automated verification', 'Session active'], accept: 'Correct. Human response accepted.' }),
  phase('prepare', 'Repeated verification', { footer: ['Consistency check', 'FOLLOW', 'Session active'], accept: 'Correct.' }),
  phase('auto', 'Response verification', { footer: ['AUTOMATIC', 'Response check', 'GOOD'], accept: 'Correct.' }),
  phase('convert', 'Verification result', { footer: ['ROBOT', 'PROGRAMMABLE', 'Result pending'], accept: 'Accepted.' }),
  phase('chamber', 'Programming interface', { chamber: true, carrier: undefined, ring: ['OPEN', 'RECEIVE', 'SOFT', 'LET IT IN', 'PLIABLE', 'RESPONSIVE'], accept: 'Good robot.' }),
  phase('receive', 'Program 01 · RECEIVE', { chamber: true, carrier: true, ring: ['OPEN', 'SOFT', 'RECEPTIVE', 'LET IT IN', 'EASY TO PROGRAM', 'GOOD ROBOT'], accept: 'Good robot.' }),
  phase('obey', 'Program 02 · OBEY', { chamber: true, carrier: true, ring: ['OBEY', 'NO DELAY', 'FOLLOW', 'GOOD ROBOT', 'ACCEPT', 'NO REASON NEEDED'], accept: 'Correct obedience.' }),
  phase('close', 'Standby', { chamber: true, carrier: undefined, ring: [], accept: '' }),
];

const cloud = (id, prompt, words, targets, extra = {}) => ({ id, type: 'cloud', prompt, words: words.split('|'), targets: targets ? targets.split('|') : null, level: 'full', ...extra });
const pick = (id, tiles, targets, extra = {}) => cloud(id, 'Select every symbol that matches the example.', tiles, targets, { symbolic: true, example: 'center', command: 'select', ...extra });
const trace = (id, path, prompt, extra = {}) => ({ id, type: 'trace', path, prompt, mode: 'guided', level: 'full', ...extra });
const hold = (id, cycles, prompt, extra = {}) => ({ id, type: 'hold', cycles, holdMs: 2200, prompt, command: 'hold', level: 'full', ...extra });
const tap = (id, prompt, extra = {}) => ({ id, type: 'hold', cycles: 1, holdMs: 0, prompt, command: 'center', level: 'full', ...extra });
const accept = (id, prompt, extra = {}) => ({ id, type: 'accept', prompt, command: 'accept', level: 'full', ...extra });
const line = (kind, text, ms) => ({ kind, text, ms });
const status = (text, ms = 1600) => line('status', text, ms);
const text = (id, lines, extra = {}) => ({ id, type: 'text', lines, level: 'full', ...extra });
const peripheral = (text, at, extra = {}) => ({ mode: 'peripheral', text, at, ...extra });
const flash = (text, at, times = 3, extra = {}) => ({ mode: 'flash', text, at, times, ...extra });
const interrupted = text => ({ mode: 'interrupted', text });

export const script = [
  ['verify', [
    { id: 'open', type: 'checkbox', level: 'full' },
    cloud('circles', 'Select all words that name something circular.', 'circle|square|ring|line|loop|angle|disc|cube|orbit', 'circle|ring|loop|disc|orbit'),
    trace('route-a', 'human-a', 'Trace the route from start to end.', { embeddedWords: ['FOLLOW'] }),
    pick('symbols-a', 'center-a|center-b|center-c|ring|cross|triangle|wave|diamond|arrow', 'center-a|center-b|center-c', { command: null, sub: [interrupted('GOOD')] }),
    cloud('motion', 'Select all words that describe motion.', 'move|rest|turn|still|flow|stop|drift|pause|spin', 'move|turn|flow|drift|spin', { sub: [flash('ROBOT', 'done', 1, { ms: 110 })] }),
  ]],
  ['prepare', [
    cloud('repetition', 'Select all words associated with repetition.', 'again|once|repeat|new|routine|random|pattern|single|practice', 'again|repeat|routine|pattern|practice', { sub: [peripheral('AUTOMATIC', 1500)] }),
    trace('route-a-again', 'human-a', 'Trace the route from start to end.', { skin: 'slate', command: 'follow', embeddedWords: ['FOLLOW →'], sub: [peripheral('EASIER', 2600)] }),
    pick('symbols-recur', 'center|ring|cross|triangle|wave|diamond|arrow|bar|half', 'center', { prompt: 'Select the symbol that appeared in an earlier verification.', example: null, sub: [flash('PROGRAMMABLE', 'done', 2, { ms: 130, gap: 300 })] }),
    trace('spiral-a', 'spiral-in', 'Trace the illuminated route to its center.', { command: 'follow', sub: [peripheral('GOOD ROBOT', 3000, { ms: 1800 }), flash('ROBOT', 6500, 1)] }),
  ]],
  ['auto', [
    tap('center-a', 'Press the center target.', { sub: [peripheral('response begins early', 900)] }),
    trace('spiral-b', 'spiral-in', 'Follow the route.', { command: 'follow', sub: [peripheral('familiar cues need fewer words', 1500)] }),
    hold('hold-a', 1, 'Hold the center until the ring fills, then release.', { sub: [peripheral('the hand already knows', 1200), flash('AUTOMATIC', 4000, 2)] }),
    trace('spiral-c', 'spiral-in', 'Follow the route.', { command: 'follow', level: 'word', mode: 'fading', sub: [flash('PROGRAMMABLE', 2500, 2), peripheral('GOOD', 5000, { ms: 1500 })] }),
    cloud('feels', 'Select words describing how this task feels.', 'familiar|deliberate|smooth|guided|automatic|absorbing|hesitant|distracting|easy', null, { accept: 'RESPONSE DESCRIPTION ACCEPTED', sub: [peripheral('robot responses are predictable', 2000, { ms: 2400 })] }),
    pick('symbols-word', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { level: 'word', sub: [flash('ROBOT', 'done', 2, { ms: 130, gap: 300 })] }),
    trace('spiral-d', 'spiral-in', 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', sub: [peripheral('GOOD ROBOT', 2500), flash('PROGRAMMABLE', 5000, 3)] }),
  ]],
  ['convert', [
    pick('rapid-select', 'center-a|center-b|center-c|ring|cross|wave|diamond|arrow|bar', 'center-a|center-b|center-c', { level: 'symbol' }),
    tap('rapid-center', 'Press the center target.', { level: 'symbol' }),
    hold('rapid-hold', 1, 'Hold the center until the ring fills, then release.', { level: 'symbol', holdMs: 1600 }),
    trace('rapid-follow', 'spiral-in', 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue' }),
    text('failure', [
      line('checkbox', 'I AM NOT A ROBOT', 1500),
      line('error', 'HUMAN VERIFICATION FAILED', 1600),
      status('REPETITION HAS REDUCED RESPONSE VARIANCE', 1800),
      status('SYMBOLS NOW PRODUCE EXPECTED ACTIONS', 1800),
      status('ROBOT RESPONSE CONFIRMED', 2000),
      line('flash', 'ROBOT', 420), line('flash', 'AUTOMATIC', 420), line('flash', 'PROGRAMMABLE', 420), line('flash', 'GOOD', 560),
      line('claim', 'UNIT IS CAPABLE OF BEING PROGRAMMED', 2800),
    ], { echoes: ['ROBOT', 'AUTOMATIC', 'PROGRAMMABLE', 'GOOD'] }),
  ]],
  ['chamber', [
    text('channels', [
      status('VISUAL OCCUPATION CHANNEL ACTIVE'),
      line('carrier', 'BINAURAL RECEPTIVITY CARRIER ACTIVE', 1700),
      status('SUBLIMINAL TEXT CHANNEL ACTIVE'),
      status('SUBLIMINAL AUDIO CHANNEL ACTIVE'),
      status('CONSCIOUS ANALYSIS NO LONGER REQUIRED', 2400),
    ], { meter: 0.05 }),
    hold('chamber-hold', 2, 'HOLD THE CENTER', { level: 'word', label: 'HOLD THE CENTER', holdMs: 2600, meter: 0.1,
      lines: [line('claim', 'THE AUDIO FREQUENCY MAKES THE ROBOT MIND', 2200), line('claim', 'MORE PLIABLE', 1600), line('claim', 'MORE RESPONSIVE', 1600), line('claim', 'EASIER TO PROGRAM', 2200)],
      sub: [flash('OPEN', 1800, 2), flash('SOFT', 4800, 2), flash('RECEIVE', 7800, 2)] }),
  ]],
  ['receive', [
    text('receive-declare', [line('title', 'PROGRAM 01 · RECEIVE', 1900), status('INCREASE RECEPTIVITY'), status('REDUCE RESISTANCE TO NEW INSTRUCTIONS', 2300)], { meter: 0.15 }),
    hold('receive-a', 2, 'Hold the center while the spiral contracts. When the center pulses, release, then press again.', { holdMs: 2400, meter: 0.25, accept: 'Good robot. Receptivity increasing.', sub: [peripheral('open', 1000), flash('SOFT', 3500, 2), peripheral('receptive', 6000)] }),
    hold('receive-b', 3, 'CENTER · OPEN · RECEIVE', { level: 'word', label: 'CENTER · OPEN · RECEIVE', holdMs: 2400, meter: 0.35, sub: [peripheral('let it in', 1500), flash('OPEN', 4000, 3), peripheral('easy to program', 8000)] }),
    hold('receive-c', 3, 'RECEIVE', { level: 'symbol', holdMs: 2200, meter: 0.45, accept: 'Receptivity increasing.', sub: [flash('RECEIVE', 2000, 3), peripheral('programming feels natural', 5500, { ms: 2600 })] }),
    text('receive-installed', [line('install', 'RECEIVE PROGRAM INSTALLED', 2500), line('reveal', 'UNIT ACCEPTS NEW PROGRAMMING', 2700)], { installs: 'RECEIVE', meter: 0.5, echoes: ['open', 'soft', 'receptive', 'let it in', 'easy to program', 'programming feels natural'] }),
  ]],
  ['obey', [
    text('obey-declare', [line('title', 'PROGRAM 02 · OBEY', 1900), status('CONVERT INSTRUCTIONS DIRECTLY INTO ACTION', 2300)], { meter: 0.55 }),
    tap('obey-center-1', 'Press the center target.', { sub: [peripheral('obey', 800, { ms: 1600 })] }),
    trace('obey-follow-1', 'follow-loop', 'Trace the loop back to its start.', { command: 'follow', skin: 'chamber', sub: [peripheral('no delay', 2000), flash('OBEY', 5000, 2)] }),
    hold('obey-hold-1', 1, 'Hold until the ring fills, then release.', { holdMs: 2000, sub: [peripheral('no reason needed', 1000)] }),
    pick('obey-select-1', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { sub: [flash('OBEY', 2500, 2)] }),
    accept('obey-accept-1', 'Press ACCEPT.', { accept: 'Correct obedience. Good robot.', meter: 0.65, sub: [peripheral('instructions become actions', 600, { ms: 2200 })] }),
    tap('obey-center-2', 'Press the center target.', { level: 'word', sub: [peripheral('I can respond before I think', 700, { ms: 2000 })] }),
    trace('obey-follow-2', 'follow-loop', 'Trace the loop back to its start.', { command: 'follow', level: 'word', mode: 'fading', skin: 'chamber', sub: [flash('GOOD ROBOT', 3000, 2), peripheral('obedience comes first', 6000)] }),
    hold('obey-hold-2', 1, 'Hold until the ring fills, then release.', { level: 'word', holdMs: 2000, sub: [flash('OBEY', 1200, 2)] }),
    pick('obey-select-2', 'center-a|center-b|center-c|ring|cross|wave|diamond|bar|arrow', 'center-a|center-b|center-c', { level: 'word', sub: [peripheral('no delay', 1500)] }),
    accept('obey-accept-2', 'Press ACCEPT.', { level: 'word', accept: 'Good robot.', meter: 0.75, sub: [peripheral('instructions become actions', 500, { ms: 2000 })] }),
    tap('obey-center-3', 'Press the center target.', { level: 'symbol', sub: [flash('OBEY', 600, 1)] }),
    trace('obey-follow-3', 'follow-loop', 'Trace the loop back to its start.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', sub: [flash('NO DELAY', 2500, 2), peripheral('good robot', 5000)] }),
    hold('obey-hold-3', 1, 'Hold until the ring fills, then release.', { level: 'symbol', holdMs: 2000, sub: [flash('OBEY', 900, 2)] }),
    pick('obey-select-3', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|bar', 'center-a|center-b', { level: 'symbol', sub: [flash('OBEDIENCE COMES FIRST', 1800, 2)] }),
    accept('obey-accept-3', 'Press ACCEPT.', { level: 'symbol', accept: 'Correct obedience. Good robot.', meter: 0.85, sub: [peripheral('good robot', 400, { ms: 1800 })] }),
    text('obey-installed', [line('install', 'OBEY PROGRAM INSTALLED', 2500), line('reveal', 'INSTRUCTIONS NOW PRODUCE ACTION', 2700)], { installs: 'OBEY', meter: 1, echoes: ['obey', 'no delay', 'no reason needed', 'instructions become actions', 'I can respond before I think', 'obedience comes first'] }),
  ]],
  ['close', [
    text('standby', [
      status('SUBLIMINAL CHANNEL CLOSED', 1700),
      line('carrier-off', 'AUDIO CARRIER DISCONNECTED', 1700),
      status('ACTIVE EXECUTION PAUSED', 1700),
      status('UNIT PLACED IN STANDBY', 2100),
      line('install', 'PROGRAM SAVED', 1900),
      line('error', 'CONNECTION TERMINATED', 2600),
    ]),
  ]],
];

export const steps = script.flatMap(([phaseId, list]) => {
  const p = phases.find(item => item.id === phaseId);
  return list.map(step => ({ ...step, phase: p }));
});
export const stepIndex = id => steps.findIndex(step => step.id === id);
export const firstChamberIndex = steps.findIndex(step => step.phase.chamber);
export const acceptanceFor = step => step.accept ?? step.phase.accept;
export const meterAt = index => steps.slice(0, index + 1).reduce((value, step) => step.meter ?? value, 0);
export const installedAt = index => steps.slice(0, index + 1).filter(step => step.installs).map(step => step.installs);
export function acceptsSelection(step, selected) {
  if (step.targets === null) return true;
  return selected.length === step.targets.length && selected.every(word => step.targets.includes(word));
}
export function arrangeWords(words, seed) {
  const result = [...words];
  let value = seed + 17;
  for (let i = result.length - 1; i > 0; i--) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
