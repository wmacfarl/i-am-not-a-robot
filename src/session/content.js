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
  phase('verify', 'Human verification', { accept: 'Correct. Human response accepted.', between: ['GOOD', 'ROBOT', 'FOLLOW', 'CORRECT'] }),
  phase('prepare', 'Repeated verification', { accept: 'Correct.', between: ['AUTOMATIC', 'EASIER', 'PROGRAMMABLE', 'GOOD ROBOT'] }),
  phase('auto', 'Response verification', { accept: 'Correct.', between: ['AUTOMATIC', 'PREDICTABLE', 'GOOD', 'PROGRAMMABLE', 'ROBOT'] }),
  phase('convert', 'Verification result', { accept: 'Accepted.', between: ['ROBOT', 'AUTOMATIC', 'PROGRAMMABLE', 'GOOD'] }),
  phase('chamber', 'Programming interface', { chamber: true, carrier: undefined, ring: ['OPEN', 'SOFT', 'LET IT IN', 'PLIABLE', 'RESPONSIVE', 'EASY'], accept: 'Good robot.', between: ['OPEN', 'SOFT'] }),
  phase('receive', 'Program 01 · Open', { chamber: true, carrier: true, ring: ['OPEN', 'SOFT', 'LET IT IN', 'EASY TO PROGRAM', 'GOOD ROBOT', 'OPEN'], accept: 'Good robot.', between: ['SOFT', 'OPEN', 'LET IT IN', 'GOOD ROBOT', 'OPEN'] }),
  phase('obey', 'Program 02 · Obey', { chamber: true, carrier: true, ring: ['OBEY', 'NO DELAY', 'FOLLOW', 'GOOD ROBOT', 'ACCEPT', 'NO REASON NEEDED'], accept: 'Correct obedience.', between: ['OBEY', 'NO DELAY', 'GOOD ROBOT', 'NO REASON', 'OBEY'] }),
  phase('close', 'Standby', { chamber: true, carrier: undefined, ring: [], accept: '' }),
];

const cloud = (id, prompt, words, targets, extra = {}) => ({ id, type: 'cloud', prompt, words: words.split('|'), targets: targets ? targets.split('|') : null, level: 'full', ...extra });
const pick = (id, tiles, targets, extra = {}) => cloud(id, 'Select every symbol that matches the example.', tiles, targets, { symbolic: true, example: 'center', command: 'select', ...extra });
const trace = (id, path, rings, prompt, extra = {}) => ({ id, type: 'trace', path, rings, prompt, mode: 'guided', level: 'full', ...extra });
const hold = (id, cycles, prompt, extra = {}) => ({ id, type: 'hold', cycles, holdMs: 2200, prompt, command: 'hold', level: 'full', ...extra });
const report = (id, items, extra = {}) => ({ id, type: 'report', prompt: 'Respond to each statement.', items, level: 'full', ...extra });
const line = (kind, text, ms) => ({ kind, text, ms });
const status = (text, ms = 1600) => line('status', text, ms);
const text = (id, lines, extra = {}) => ({ id, type: 'text', lines, level: 'full', ...extra });
const note = (text, at, extra = {}) => ({ mode: 'note', text, at, ...extra });
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
    trace('route-a-again', 'maze-0', 3, 'Trace the route from start to center.', { skin: 'slate', command: 'follow', between: 'EASIER', sub: [note('This route was shown before. A familiar response is expected.', 2500), ...during(['FOLLOW', 'AUTOMATIC'])] }),
    pick('symbols-recur', 'center|ring|cross|triangle|wave|diamond|arrow|bar|half', 'center', { prompt: 'Select the symbol that appeared in an earlier verification.', example: null, between: 'PROGRAMMABLE' }),
    trace('spiral-a', 'maze-3', 4, 'Trace the illuminated route to its center.', { command: 'follow', between: 'GOOD ROBOT', sub: [interrupted('Good robot.'), ...during(['FOLLOW', 'AUTOMATIC', 'GOOD ROBOT'])] }),
  ]],
  ['auto', [
    trace('spiral-b', 'maze-3', 4, 'Follow the route.', { command: 'follow', sub: [note('Response time is decreasing.', 1500), ...during(['PROGRAMMABLE', 'AUTOMATIC', 'GOOD'])] }),
    hold('hold-a', 1, 'Press and hold the center. Release when the ring completes.', { between: 'AUTOMATIC', sub: [note('Your hand is responding before the instruction finishes.', 1200)] }),
    trace('spiral-c', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'word', mode: 'fading', between: 'PROGRAMMABLE', sub: [note('Your responses are becoming predictable.', 4000), ...during(['ROBOT', 'PREDICTABLE', 'GOOD'])] }),
    report('feels', ['I have traced this route before.', 'The route was easier this time.', 'I did not need the guide to finish.', 'I knew where the route went.'], { accept: 'Response description accepted.', sub: [note('Response time is decreasing.', 2000, { ms: 2400 })] }),
    pick('symbols-word', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { level: 'word', between: 'ROBOT', sub: [note('Your responses are becoming predictable.', 1500)] }),
    trace('spiral-d', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', between: 'PROGRAMMABLE', sub: [note('This is the fourth time you have traced this route.', 2500), ...during(['AUTOMATIC', 'GOOD', 'ROBOT'])] }),
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
      status('CONSCIOUS ANALYSIS NO LONGER REQUIRED', 2400),
    ], { meter: 0.05 }),
    hold('chamber-hold', 2, 'Hold the center.', { holdMs: 2600, meter: 0.1,
      lines: [line('claim', 'The audio frequency makes the robot mind more pliable.', 3200), line('claim', 'The audio frequency makes the robot mind more responsive.', 3200), line('claim', 'The audio frequency makes the robot mind easier to program.', 3600)],
      sub: stream(['OPEN', 'SOFT', 'LET IT IN', 'OPEN', 'PLIABLE'], 6, 1800, 1700) }),
  ]],
  ['receive', [
    text('receive-declare', [line('title', 'PROGRAM 01 · OPEN', 1900), status('LOWER RESISTANCE TO INSTRUCTIONS'), status('MAKE NEW INSTRUCTIONS EASY TO ACCEPT', 2300)], { meter: 0.15 }),
    hold('receive-a', 2, 'Press and hold the center. Release when the ring completes. Two holds are required.', { holdMs: 2400, meter: 0.25, accept: 'Good robot. Resistance decreasing.', sub: [note('Let it in.', 1000), note('The unit is easy to program.', 6000), ...stream(['SOFT', 'OPEN', 'LET IT IN', 'SOFT'], 5, 2200, 1700)] }),
    hold('receive-b', 3, 'Press and hold. Release when the ring completes.', { level: 'word', holdMs: 2400, meter: 0.35, sub: [note('Programming feels natural.', 4000), ...stream(['OPEN', 'SOFT', 'LET IT IN', 'OPEN', 'EASY'], 6, 1500, 1700)] }),
    hold('receive-c', 3, 'Press and hold. Release when the ring completes.', { level: 'symbol', holdMs: 2200, meter: 0.45, accept: 'Resistance decreasing.', sub: [note('The unit is easy to program.', 5500, { ms: 2600 }), ...stream(['OPEN', 'SOFT', 'OPEN', 'LET IT IN', 'OPEN'], 6, 1500, 1700)] }),
    text('receive-installed', [line('install', 'OPEN PROGRAM INSTALLED', 2500), line('reveal', 'UNIT ACCEPTS NEW INSTRUCTIONS', 2700)], { installs: 'OPEN', meter: 0.5, echoes: ['open', 'soft', 'let it in', 'easy to program', 'programming feels natural'] }),
  ]],
  ['obey', [
    text('obey-declare', [line('title', 'PROGRAM 02 · OBEY', 1900), status('CONVERT INSTRUCTIONS DIRECTLY INTO ACTION', 2300)], { meter: 0.55 }),
    trace('obey-follow-1', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', skin: 'chamber', sub: [note('No delay is required.', 2000), ...stream(['OBEY', 'NO DELAY', 'GOOD ROBOT', 'OBEY', 'NO REASON'])] }),
    hold('obey-hold-1', 1, 'Press and hold. Release when the ring completes.', { holdMs: 2000, sub: [note('No reason is required.', 1000), note('The unit responds before it thinks.', 4200), ...stream(['OBEY', 'NO REASON', 'OBEY'], 3, 1200, 1500)] }),
    pick('obey-select-1', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { accept: 'Correct obedience. Good robot.', meter: 0.65, sub: [flash('OBEY', 2500), note('Instructions become actions.', 4000, { ms: 2200 })] }),
    trace('obey-follow-2', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', level: 'word', mode: 'fading', skin: 'chamber', sub: [note('Obedience comes first.', 6000), ...stream(['GOOD ROBOT', 'OBEY', 'NO DELAY', 'OBEY', 'INSTRUCTION'])] }),
    hold('obey-hold-2', 1, 'Press and hold. Release when the ring completes.', { level: 'word', holdMs: 2000, sub: stream(['OBEY', 'GOOD ROBOT', 'OBEY'], 3, 1000, 1500) }),
    pick('obey-select-2', 'center-a|center-b|center-c|ring|cross|wave|diamond|bar|arrow', 'center-a|center-b|center-c', { level: 'word', accept: 'Good robot.', meter: 0.75, sub: [note('No delay is required.', 1500), note('Instructions become actions.', 4500, { ms: 2000 })] }),
    trace('obey-follow-3', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', sub: [note('Good robot.', 5000), ...stream(['OBEY', 'GOOD ROBOT', 'NO DELAY', 'OBEY', 'OBEY'])] }),
    hold('obey-hold-3', 1, 'Press and hold. Release when the ring completes.', { level: 'symbol', holdMs: 2000, sub: stream(['OBEY', 'NO DELAY', 'OBEY'], 3, 900, 1500) }),
    pick('obey-select-3', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|bar', 'center-a|center-b', { level: 'symbol', accept: 'Correct obedience. Good robot.', meter: 0.85, sub: [flash('OBEDIENCE COMES FIRST', 1800), note('Good robot.', 4000, { ms: 1800 })] }),
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
