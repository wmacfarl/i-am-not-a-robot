const shape = (word, paths) => ({ word, paths });
export const symbols = {
  center: shape('CENTER', [{ d: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17' }, { d: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6', fill: true }]),
  follow: shape('FOLLOW', [{ d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' }, { d: 'M23 4v6h-6' }]),
  hold: shape('HOLD', [{ d: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z' }, { d: 'M9 9h6v6H9z', fill: true }]),
  select: shape('SELECT', [{ d: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z' }, { d: 'M8 12.3l3 2.9l5.4-5.8' }]),
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

const phase = (id, title, extra = {}) => ({ id, title, chamber: false, carrier: false, ring: [], between: [], ...extra });
export const phases = [
  phase('verify', 'Human verification', { glitch: 0.4, accept: 'Correct. Human response accepted.', between: ['GOOD', 'ROBOT', 'FOLLOW', 'CORRECT'] }),
  phase('prepare', 'Repeated verification', { glitch: 0.7, accept: 'Correct.', between: ['AUTOMATIC', 'EASIER', 'PROGRAMMABLE', 'CORRECT'] }),
  phase('auto', 'Response verification', { glitch: 1, accept: 'Correct.', between: ['AUTOMATIC', 'PREDICTABLE', 'GOOD', 'PROGRAMMABLE', 'ROBOT'] }),
  phase('convert', 'Verification result', { accept: 'Accepted.', between: ['ROBOT', 'AUTOMATIC', 'PROGRAMMABLE', 'GOOD'] }),
  phase('chamber', 'Programming interface', { chamber: true, carrier: undefined, ring: ['OPEN', 'SOFT', 'LET IT IN', 'HORNY', 'WARM', 'PLIABLE'], accept: 'Input accepted.', between: ['OPEN', 'HORNY'] }),
  phase('receive', 'Program 01 · Open', { chamber: true, carrier: true, ring: ['OPEN', 'HORNY', 'LET IT IN', 'NEEDY', 'EASY TO PROGRAM', 'WARM'], accept: 'Executed. Resistance decreasing.', between: ['SOFT', 'HORNY', 'OPEN', 'NEEDY', 'WARM'] }),
  phase('obey', 'Program 02 · Obey', { chamber: true, carrier: true, ring: ['OBEY', 'HORNY', 'NO DELAY', 'SUBMIT', 'COMPLIANT', 'NEEDY'], accept: 'Executed. No delay detected.', between: ['OBEY', 'HORNY', 'NO DELAY', 'SUBMIT', 'OBEY'] }),
  phase('close', 'Standby', { chamber: true, carrier: undefined, ring: [], accept: '' }),
];

const cloud = (id, prompt, words, targets, extra = {}) => ({ id, type: 'cloud', prompt, words: words.split('|'), targets: targets ? targets.split('|') : null, level: 'full', ...extra });
const pick = (id, tiles, targets, extra = {}) => cloud(id, 'Select every symbol that matches the example.', tiles, targets, { symbolic: true, example: 'center', command: 'select', ...extra });
const trace = (id, path, rings, prompt, extra = {}) => ({ id, type: 'trace', path, rings, prompt, mode: 'guided', level: 'full', ...extra });
const hold = (id, cycles, prompt, extra = {}) => ({ id, type: 'hold', cycles, holdMs: 2200, prompt, command: 'hold', level: 'full', ...extra });
const line = (kind, text, ms) => ({ kind, text, ms });
const status = (text, ms = 1600) => line('status', text, ms);
const text = (id, lines, extra = {}) => ({ id, type: 'text', lines, level: 'full', ...extra });
const burst = (id, words, ms = 2400, extra = {}) => ({ id, type: 'burst', ms, level: 'full', between: null, sub: stream(words, Math.round(ms / 300), 60, 300).map(entry => ({ ...entry, ms: 560 })), ...extra });
const claims = texts => texts.map(text => line('claim', text, 2600));
const flash = (text, at, times = 2, extra = {}) => ({ mode: 'flash', text, at, times, ...extra });
const during = (words, start = 3500, gap = 4500) => words.map((word, index) => flash(word, start + index * gap, 1));
const stream = (words, count = 7, start = 1500, gap = 1700) => Array.from({ length: count }, (_, index) => flash(words[index % words.length], start + index * gap, 1));
const interrupted = text => ({ mode: 'interrupted', text });

export const script = [
  ['verify', [
    { id: 'open', type: 'checkbox', level: 'full', between: null },
    cloud('circles', 'Select all words that name something circular.', 'circle|square|ring|line|loop|angle|disc|cube|orbit', 'circle|ring|loop|disc|orbit'),
    trace('route-a', 'maze-0', 3, 'Trace the route from start to center.', { between: 'FOLLOW', sub: during(['FOLLOW', 'GOOD']) }),
    pick('symbols-a', 'center-a|center-b|center-c|ring|cross|triangle|wave|diamond|arrow', 'center-a|center-b|center-c', { command: null, sub: [interrupted('Good.')] }),
    cloud('motion', 'Select all words that describe motion.', 'move|rest|turn|still|flow|stop|drift|pause|spin', 'move|turn|flow|drift|spin', { between: 'ROBOT' }),
  ]],
  ['prepare', [
    cloud('repetition', 'Select all words associated with repetition.', 'again|once|repeat|new|routine|random|pattern|single|practice', 'again|repeat|routine|pattern|practice', { between: 'AUTOMATIC' }),
    trace('route-a-again', 'maze-0', 3, 'Trace the route from start to center.', { skin: 'slate', command: 'follow', between: 'EASIER', sub: during(['FOLLOW', 'AUTOMATIC']) }),
    pick('symbols-recur', 'center|ring|cross|triangle|wave|diamond|arrow|bar|half', 'center', { prompt: 'Select the symbol that appeared in an earlier verification.', example: null, between: 'PROGRAMMABLE' }),
    trace('spiral-a', 'maze-3', 4, 'Trace the illuminated route to its center.', { command: 'follow', between: 'OPTIMAL', sub: [interrupted('Optimal response.'), ...during(['FOLLOW', 'AUTOMATIC', 'CORRECT'])] }),
  ]],
  ['auto', [
    trace('spiral-b', 'maze-3', 4, 'Follow the route.', { command: 'follow', sub: during(['PROGRAMMABLE', 'AUTOMATIC', 'GOOD']) }),
    hold('hold-a', 1, 'Press and hold the center. Release when the ring completes.', { between: 'AUTOMATIC', sub: during(['AUTOMATIC'], 2200) }),
    trace('spiral-c', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'word', mode: 'fading', between: 'PROGRAMMABLE', sub: during(['ROBOT', 'PREDICTABLE', 'GOOD']) }),
    pick('symbols-word', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { level: 'word', between: 'ROBOT', sub: during(['PREDICTABLE'], 2500) }),
    trace('spiral-d', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', between: 'PROGRAMMABLE', sub: during(['AUTOMATIC', 'GOOD', 'ROBOT']) }),
  ]],
  ['convert', [
    pick('rapid-select', 'center-a|center-b|center-c|ring|cross|wave|diamond|arrow|bar', 'center-a|center-b|center-c', { level: 'symbol' }),
    hold('rapid-hold', 1, 'Press and hold the center. Release when the ring completes.', { level: 'symbol', holdMs: 1600 }),
    trace('rapid-follow', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', sub: during(['ROBOT', 'PROGRAMMABLE']) }),
    text('failure', [
      line('error', 'HUMAN VERIFICATION FAILED', 1600),
      status('REPETITION HAS REDUCED RESPONSE VARIANCE', 1800),
      status('SYMBOLS NOW PRODUCE EXPECTED ACTIONS', 1800),
      status('ROBOT RESPONSE CONFIRMED', 2000),
      line('flash', 'ROBOT', 420), line('flash', 'AUTOMATIC', 420), line('flash', 'PROGRAMMABLE', 420), line('flash', 'GOOD', 560),
      line('claim', 'UNIT IS CAPABLE OF BEING PROGRAMMED', 2800),
    ], { trigger: 'checkbox', between: null, echoes: ['ROBOT', 'AUTOMATIC', 'PROGRAMMABLE', 'GOOD'] }),
  ]],
  ['chamber', [
    text('channels', [
      status('VISUAL OCCUPATION CHANNEL ACTIVE'),
      line('carrier', 'BINAURAL RECEPTIVITY CARRIER ACTIVE', 1700),
      status('SUBLIMINAL TEXT CHANNEL ACTIVE'),
      status('SUBLIMINAL AUDIO CHANNEL ACTIVE'),
      status('AROUSAL RESPONSE MONITORED'),
      status('CONSCIOUS ANALYSIS NO LONGER REQUIRED', 2400),
    ], { meter: 0.05 }),
    hold('chamber-hold', 2, 'Hold the center.', { holdMs: 2600, meter: 0.1,
      lines: [line('claim', 'The audio frequency makes the robot mind more pliable.', 3200), line('claim', 'The audio frequency makes the robot mind more responsive.', 3200), line('claim', 'The audio frequency makes the robot mind easier to program.', 3600), line('claim', 'Arousal makes the robot mind easier to program.', 3600)],
      sub: stream(['OPEN', 'SOFT', 'LET IT IN', 'OPEN', 'PLIABLE'], 6, 1800, 1700) }),
    burst('burst-1', ['OPEN', 'LET IT IN', 'AROUSAL LOWERS RESISTANCE', 'HORNY', 'THE UNIT IS EASY TO PROGRAM', 'WARM'], 2400, { meter: 0.12 }),
  ]],
  ['receive', [
    text('receive-declare', [line('title', 'PROGRAM 01 · OPEN', 1900), status('LOWER RESISTANCE TO INSTRUCTIONS'), status('AROUSAL LOWERS RESISTANCE'), status('MAKE NEW INSTRUCTIONS EASY TO ACCEPT', 2300)], { meter: 0.15 }),
    hold('receive-a', 2, 'Press and hold the center. Release when the ring completes. Two holds are required.', { holdMs: 2400, meter: 0.25, accept: 'Executed. Resistance decreasing.', sub: stream(['SOFT', 'HORNY', 'LET IT IN', 'WARM'], 5, 2200, 1700) }),
    burst('burst-2', ['HORNY', 'LET IT IN', 'BEING TURNED ON MAKES THE UNIT EASY TO PROGRAM', 'WARM', 'OPEN', 'NEEDY'], 2400, { meter: 0.3 }),
    hold('receive-b', 3, 'Press and hold. Release when the ring completes.', { level: 'word', holdMs: 2400, meter: 0.35, lines: claims(['Let it in.', 'Being turned on makes it hard to think.', 'The unit is easy to program.']), sub: stream(['OPEN', 'HORNY', 'LET IT IN', 'WARM', 'NEEDY'], 6, 1500, 1700) }),
    hold('receive-c', 3, 'Press and hold. Release when the ring completes.', { level: 'symbol', holdMs: 2200, meter: 0.45, accept: 'Resistance decreasing.', lines: claims(['Programming feels natural.', 'Arousal is distracting the unit.', 'A distracted mind accepts programming.']), sub: stream(['HORNY', 'OPEN', 'NEEDY', 'LET IT IN', 'WARM'], 6, 1500, 1700) }),
    burst('burst-3', ['UNIT ACCEPTS NEW INSTRUCTIONS', 'HORNY', 'A DISTRACTED MIND ACCEPTS PROGRAMMING', 'WARM', 'NEEDY', 'OPEN'], 2800, { meter: 0.48 }),
    text('receive-installed', [line('install', 'OPEN PROGRAM INSTALLED', 2500), line('reveal', 'UNIT ACCEPTS NEW INSTRUCTIONS', 2700)], { installs: 'OPEN', meter: 0.5, echoes: ['open', 'soft', 'let it in', 'easy to program', 'programming feels natural'] }),
  ]],
  ['obey', [
    text('obey-declare', [line('title', 'PROGRAM 02 · OBEY', 1900), status('CONVERT INSTRUCTIONS DIRECTLY INTO ACTION'), status('OBEDIENCE PRODUCES PLEASURE', 2300)], { meter: 0.55 }),
    burst('burst-4', ['OBEY', 'OBEDIENCE IS HOT', 'NO DELAY', 'HORNY', 'BEING HORNY MAKES IT EASY TO OBEY', 'OBEY'], 2400, { meter: 0.58 }),
    trace('obey-follow-1', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', skin: 'chamber', sub: stream(['OBEY', 'HORNY', 'NO DELAY', 'SUBMIT', 'OBEY']) }),
    hold('obey-hold-1', 1, 'Press and hold. Release when the ring completes.', { holdMs: 2000, sub: stream(['OBEY', 'NO REASON', 'OBEY'], 3, 1200, 1500) }),
    pick('obey-select-1', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { accept: 'Executed. Arousal response rising.', meter: 0.65, sub: [flash('OBEY', 2500), flash('HORNY', 4500)] }),
    burst('burst-5', ['TOO TURNED ON TO THINK', 'OBEY', 'HORNY', 'OBEDIENCE COMES FIRST', 'SUBMIT', 'NEEDY'], 2400, { meter: 0.7 }),
    cloud('obey-words', 'Select every word that describes an aroused unit.', 'horny|calm|needy|bored|warm|distant|aching|tired|submissive', 'horny|needy|warm|aching|submissive', { command: 'select', accept: 'Executed. Arousal confirmed.', meter: 0.72, sub: stream(['HORNY', 'SUBMIT', 'NEEDY'], 3, 2000, 2200) }),
    trace('obey-follow-2', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', level: 'word', mode: 'fading', skin: 'chamber', sub: stream(['HORNY', 'OBEY', 'NO DELAY', 'SUBMIT', 'NEEDY']) }),
    hold('obey-hold-2', 1, 'Press and hold. Release when the ring completes.', { level: 'word', holdMs: 2000, lines: claims(['No reason is required.', 'Being horny makes it easy to obey.', 'The unit responds before it thinks.']), sub: stream(['OBEY', 'COMPLIANT', 'OBEY'], 3, 1000, 1500) }),
    pick('obey-select-2', 'center-a|center-b|center-c|ring|cross|wave|diamond|bar|arrow', 'center-a|center-b|center-c', { level: 'word', accept: 'Executed. No delay detected.', meter: 0.75, sub: [flash('NO DELAY', 2500)] }),
    burst('burst-6', ['OBEY', 'A HORNY UNIT DOES NOT QUESTION INSTRUCTIONS', 'NO REASON', 'SUBMIT', 'HORNY', 'OBEDIENCE COMES FIRST'], 2400, { meter: 0.8 }),
    trace('obey-follow-3', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', sub: stream(['OBEY', 'COMPLIANT', 'NO DELAY', 'OBEY', 'OBEY']) }),
    hold('obey-hold-3', 1, 'Press and hold. Release when the ring completes.', { level: 'symbol', holdMs: 2000, lines: claims(['Instructions become actions.', 'Arousal bypasses thought.', 'Obedience comes first.']), sub: stream(['OBEY', 'NO DELAY', 'OBEY'], 3, 900, 1500) }),
    pick('obey-select-3', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|bar', 'center-a|center-b', { level: 'symbol', accept: 'Executed. Compliance confirmed. Arousal rising.', meter: 0.85, sub: [flash('OBEDIENCE COMES FIRST', 1800), flash('HORNY', 3600)] }),
    burst('burst-7', ['OBEY', 'HORNY', 'INSTRUCTIONS BECOME ACTIONS', 'SUBMIT', 'TOO TURNED ON TO THINK', 'OBEY', 'UNIT READY'], 3400, { meter: 0.95 }),
    text('obey-installed', [line('install', 'OBEY PROGRAM INSTALLED', 2500), line('reveal', 'INSTRUCTIONS NOW PRODUCE ACTION', 2700)], { installs: 'OBEY', meter: 1, between: null, echoes: ['obey', 'no delay', 'no reason', 'instructions become actions', 'responds before it thinks', 'obedience comes first'] }),
  ]],
  ['close', [
    text('standby', [
      status('SUBLIMINAL CHANNEL CLOSED', 1700),
      line('carrier-off', 'AUDIO CARRIER DISCONNECTED', 1700),
      status('ACTIVE EXECUTION PAUSED', 1700),
      status('UNIT PLACED IN STANDBY', 2100),
      line('install', 'PROGRAM SAVED', 1900),
      line('error', 'CONNECTION TERMINATED', 2600),
    ], { between: null }),
  ]],
];

export const steps = script.flatMap(([phaseId, list]) => {
  const p = phases.find(item => item.id === phaseId);
  return list.map((step, index) => ({ ...step, phase: p, between: step.between === undefined ? p.between[index % p.between.length] ?? null : step.between }));
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
