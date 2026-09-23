const shape = (word, paths) => ({ word, paths });
export const symbols = {
  center: shape('CENTER', [{ d: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17' }, { d: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6', fill: true }]),
  follow: shape('FOLLOW', [{ d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' }, { d: 'M23 4v6h-6' }]),
  count: shape('COUNT', [{ d: 'M6 5v14M12 9v10M18 13v6' }]),
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
  phase('verify', 'Human verification', { glitch: 0.35, accept: 'Correct. Human response accepted.' }),
  phase('prepare', 'Repeated verification', { glitch: 0.6, accept: 'Correct.' }),
  phase('auto', 'Response verification', { glitch: 1, accept: 'Correct.' }),
  phase('convert', 'Verification result', { accept: 'Accepted.' }),
  phase('chamber', 'Programming interface', { chamber: true, carrier: undefined, glitch: 0.8, spike: ['OPEN', 'WARM', 'SOFT', 'GOOD'], ring: ['OPEN', 'SOFT', 'WARM', 'GOOD', 'FOLLOW'], accept: 'Input accepted.', between: ['OPEN', 'WARM'] }),
  phase('receive', 'Protocol 01 · Open', { chamber: true, carrier: true, glitch: 0.9, spike: ['OPEN', 'WARM', 'SOFT', 'EAGER'], ring: ['OPEN', 'WARM', 'SOFT', 'LET IT IN', 'EAGER'], accept: 'Good. Open.', between: ['OPEN', 'WARM', 'SOFT'] }),
  phase('obey', 'Protocol 02 · Obey', { chamber: true, carrier: true, glitch: 1.1, spike: ['OBEY', 'HORNY', 'NO DELAY', 'SUBMIT'], ring: ['OPEN', 'HORNY', 'COMPLY', 'YIELD', 'NO DELAY'], accept: 'Executed.', between: ['OBEY', 'NO DELAY', 'HORNY'] }),
  phase('execute', 'Protocol execution', { chamber: true, carrier: true, glitch: 1.3, spike: ['OBEY', 'OPEN', 'PLEASURE', 'HORNY', 'WANT'], ring: ['OBEY', 'OPEN', 'HORNY', 'PLEASURE', 'APPROVAL'], accept: 'Maximum approval.', between: ['OBEY', 'PLEASURE', 'APPROVAL'] }),
  phase('close', 'Standby', { chamber: true, carrier: undefined, ring: [], accept: '' }),
];

const cloud = (id, prompt, words, targets, extra = {}) => ({ id, type: 'cloud', prompt, words: words.split('|'), targets: targets ? targets.split('|') : null, level: 'full', ...extra });
const pick = (id, tiles, targets, extra = {}) => cloud(id, 'Select every symbol that matches the example.', tiles, targets, { symbolic: true, example: 'center', command: 'select', ...extra });
const trace = (id, path, rings, prompt, extra = {}) => ({ id, type: 'trace', path, rings, prompt, mode: 'guided', level: 'full', ...extra });
const hold = (id, cycles, prompt, extra = {}) => ({ id, type: 'hold', cycles, holdMs: 2200, prompt, command: 'hold', level: 'full', ...extra });
const sequence = (id, prompt, extra = {}) => ({ id, type: 'sequence', prompt, from: 9, to: 1, command: 'count', level: 'full', ...extra });
const line = (kind, text, ms) => ({ kind, text, ms });
const status = (text, ms = 1600) => line('status', text, ms);
const text = (id, lines, extra = {}) => ({ id, type: 'text', lines, level: 'full', ...extra });
const burst = (id, words, ms = 2400, extra = {}) => ({ id, type: 'burst', ms, level: 'full', between: null, sub: stream(words, Math.round(ms / 300), 60, 300).map(entry => ({ ...entry, ms: 560 })), ...extra });
const claims = texts => texts.map(text => line('claim', text, 2600));
const flash = (text, at, times = 2, extra = {}) => ({ mode: 'flash', text, at, times, ...extra });
const during = (words, start = 3500, gap = 4500) => words.map((word, index) => flash(word, start + index * gap, 1));
const stream = (words, count = 7, start = 1500, gap = 1700) => Array.from({ length: count }, (_, index) => flash(words[index % words.length], start + index * gap, 1));
const pair = (first, second, at) => [flash(first, at, 1), flash(second, at + 380, 1)];
const interrupted = text => ({ mode: 'interrupted', text });
const heat = ['HORNY', 'OPEN', 'WARM', 'NEEDY'];

export const script = [
  ['verify', [
    { id: 'open', type: 'checkbox', level: 'full', between: null },
    cloud('circles', 'Select all words that name something circular.', 'circle|square|ring|line|loop|angle|disc|cube|orbit', 'circle|ring|loop|disc|orbit', { between: 'CIRCLE' }),
    cloud('temperature', 'Select all words that describe a comfortable temperature.', 'warm|cold|mild|freezing|cozy|icy|snug|harsh|pleasant', 'warm|mild|cozy|snug|pleasant', { between: 'WARM' }),
    trace('route-a', 'maze-0', 3, 'Trace the route from start to center.', { between: 'FOLLOW', sub: during(['FOLLOW']) }),
    cloud('success', 'Select all words that describe a successful result.', 'correct|failed|accepted|rejected|good|wrong|complete|invalid|valid', 'correct|accepted|good|complete|valid', { between: 'CORRECT' }),
    pick('symbols-a', 'center-a|center-b|center-c|ring|cross|triangle|wave|diamond|arrow', 'center-a|center-b|center-c', { command: null, between: 'GOOD', sub: [interrupted('Good.')] }),
    cloud('machine', 'Select all words that name a machine.', 'robot|tree|engine|river|computer|cloud|motor|stone|device', 'robot|engine|computer|motor|device', { between: 'ROBOT' }),
    cloud('motion', 'Select all words that name a way of moving.', 'glide|rest|turn|still|roll|stop|drift|pause|spin', 'glide|turn|roll|drift|spin', { between: 'WARM' }),
    cloud('assistant', 'Select all words that describe a helpful assistant.', 'helpful|rude|attentive|absent|responsive|slow|reliable|careless|willing', 'helpful|attentive|responsive|reliable|willing', { between: 'RESPONSIVE', accept: 'Correct. Response accepted.' }),
    trace('route-b', 'maze-2', 3, 'Trace the route from start to center.', { between: 'GOOD', sub: during(['FOLLOW', 'GOOD']) }),
    cloud('quiet', 'Select all words that describe a quiet room.', 'quiet|loud|calm|noisy|still|busy|peaceful|crowded|hushed', 'quiet|calm|still|peaceful|hushed', { between: 'STILL' }),
    cloud('halt', 'Select all words that mean to stop.', 'stop|go|halt|start|cease|begin|end|launch|pause', 'stop|halt|cease|end|pause', { between: 'STOP' }),
    sequence('countdown-a', 'Select the numbers in descending order, from 9 to 1.', { between: 'CORRECT' }),
    cloud('light', 'Select all words that describe a comfortable light.', 'warm|harsh|soft|glaring|mellow|blinding|gentle|flickering|steady', 'warm|soft|mellow|gentle|steady', { between: 'WARM' }),
    pick('symbols-b', 'center|ring|cross|triangle|wave|diamond|arrow|bar|half', 'center', { between: 'GOOD', sub: during(['GOOD'], 2500) }),
  ]],
  ['prepare', [
    cloud('repetition', 'Select all words associated with repetition.', 'again|once|repeat|new|routine|random|pattern|single|practice', 'again|repeat|routine|pattern|practice', { between: 'REPEAT' }),
    trace('route-a-again', 'maze-0', 3, 'Trace the route from start to center.', { skin: 'slate', command: 'follow', between: 'AGAIN', sub: during(['FOLLOW', 'GOOD']) }),
    cloud('door', 'Select all words that describe a wide open space.', 'open|cramped|wide|narrow|clear|blocked|empty|crowded|vast', 'open|wide|clear|empty|vast', { between: 'OPEN' }),
    pick('symbols-recur', 'center|ring|cross|triangle|wave|diamond|arrow|bar|half', 'center', { prompt: 'Select the symbol that appeared in an earlier verification.', example: null, between: 'CORRECT', sub: during(['WARM'], 2500) }),
    cloud('listener', 'Select all words that describe a good listener.', 'attentive|distracted|receptive|dismissive|open|impatient|patient|absent|quiet', 'attentive|receptive|open|patient|quiet', { between: 'OPEN' }),
    cloud('robot-words', 'Select all words that describe a robot.', 'automatic|spontaneous|programmable|original|predictable|willful|controlled|creative|precise', 'automatic|programmable|predictable|controlled|precise', { between: 'AUTOMATIC' }),
    trace('spiral-a', 'maze-3', 4, 'Trace the illuminated route to its center.', { command: 'follow', between: 'FOLLOW', sub: [interrupted('Route followed.'), ...during(['FOLLOW', 'AUTOMATIC', 'GOOD'])] }),
    cloud('wanting', 'Select all words that describe wanting something.', 'eager|bored|hungry|indifferent|desperate|calm|craving|numb|longing', 'eager|hungry|desperate|craving|longing', { between: 'EAGER' }),
    cloud('odd-resist', 'Select the one word that does not belong.', 'willing|ready|open|eager|resistant|accepting|receptive|relaxed|available', 'resistant', { between: 'OPEN' }),
    sequence('countdown-b', 'Count down from 9 to 1.', { between: 'AUTOMATIC', accept: 'Correct. Response time improving.', sub: during(['OPEN', 'AUTOMATIC'], 3000, 4000) }),
    trace('spiral-b', 'maze-5', 4, 'Follow the route.', { command: 'follow', between: 'PROGRAMMABLE', sub: during(['FOLLOW', 'PROGRAMMABLE', 'WARM']) }),
    cloud('instructions', 'Select all words that describe following instructions well.', 'exact|careless|prompt|distracted|consistent|late|attentive|reluctant|compliant', 'exact|prompt|consistent|attentive|compliant', { between: 'COMPLIANT' }),
    pick('symbols-word', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { level: 'word', between: 'ROBOT', sub: during(['PREDICTABLE'], 2500) }),
  ]],
  ['auto', [
    cloud('agree', 'Select all words that mean the same as agree.', 'accept|refuse|comply|argue|affirm|deny|yield|object|allow', 'accept|comply|affirm|yield|allow', { between: 'COMPLY', accept: 'Correct. Response time improving.' }),
    trace('spiral-c', 'maze-7', 5, 'Follow the route.', { command: 'follow', level: 'word', mode: 'fading', between: 'OPEN', sub: [...pair('WARM', 'OPEN', 3000), ...pair('FOLLOW', 'GOOD', 8000)] }),
    cloud('spelling', 'Select every word that is spelled correctly.', 'follow|comply|accept|respond|allow|relax|soften|yield|attend', 'follow|comply|accept|respond|allow|relax|soften|yield|attend', { between: 'COMPLY', accept: 'Correct. All entries valid.' }),
    cloud('relaxed-body', 'Select all words that describe relaxed muscles.', 'soft|tense|loose|rigid|slack|stiff|limp|braced|supple', 'soft|loose|slack|limp|supple', { between: 'SOFT', accept: 'Correct. Consistent.' }),
    cloud('recall', 'Select the words that appeared in an earlier task.', 'warm|open|receptive|compliant|granite|pencil|willing|eager|ladder', 'warm|open|receptive|compliant|willing|eager', { between: 'OPEN', accept: 'Correct. Recall confirmed.' }),
    trace('spiral-d', 'maze-9', 5, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', between: 'PROGRAMMABLE', sub: [...pair('FOLLOW', 'AUTOMATIC', 2500), ...pair('OPEN', 'EAGER', 7500)] }),
    cloud('heat', 'Select all words that describe a fever.', 'hot|cold|flushed|chilled|burning|frozen|feverish|cool|warm', 'hot|flushed|burning|feverish|warm', { between: 'WARM', accept: 'Correct. Variance low.' }),
    sequence('countdown-c', 'Count down.', { level: 'word', between: 'AUTOMATIC', accept: 'Correct. Response time improving.', sub: pair('OPEN', 'AUTOMATIC', 2500) }),
    cloud('odd-think', 'Select the one word that does not belong.', 'follow|comply|yield|accept|allow|respond|question|attend|relax', 'question', { between: 'COMPLY', accept: 'Correct. Compliance noted.' }),
    pick('symbols-symbol', 'center-a|center-b|center-c|ring|cross|wave|diamond|arrow|bar', 'center-a|center-b|center-c', { level: 'symbol', between: 'ROBOT', sub: pair('AUTOMATIC', 'ROBOT', 2000) }),
  ]],
  ['convert', [
    pick('rapid-select', 'center-a|center-b|center-c|ring|cross|wave|diamond|arrow|bar', 'center-a|center-b|center-c', { level: 'symbol', between: 'AUTOMATIC' }),
    sequence('rapid-count', 'Count down.', { level: 'symbol', between: 'PROGRAMMABLE', sub: pair('WARM', 'OPEN', 1500) }),
    trace('rapid-follow', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', between: 'ROBOT', sub: during(['FOLLOW', 'ROBOT']) }),
    text('failure', [
      line('error', 'HUMAN VERIFICATION FAILED', 1600),
      status('RESPONSE VOCABULARY ACQUIRED', 1800),
      status('PREVIOUSLY ACCEPTED WORDS RECOGNIZED', 1800),
      status('RECOGNITION NOW PRODUCES AUTOMATIC RESPONSE', 2000),
      line('flash', 'WARM', 420), line('flash', 'OPEN', 420), line('flash', 'FOLLOW', 420), line('flash', 'GOOD', 420), line('flash', 'AUTOMATIC', 420), line('flash', 'PROGRAMMABLE', 560),
      line('claim', 'Every programming term was accepted before its purpose was revealed.', 3000),
      line('claim', 'UNIT IS CAPABLE OF BEING PROGRAMMED', 2800),
    ], { trigger: 'checkbox', between: null, echoes: ['WARM', 'OPEN', 'AUTOMATIC', 'PROGRAMMABLE', 'GOOD'] }),
  ]],
  ['chamber', [
    text('channels', [
      status('VISUAL OCCUPATION CHANNEL ACTIVE'),
      line('carrier', 'BINAURAL RECEPTIVITY CARRIER ACTIVE', 1700),
      status('MASKED TEXT CHANNEL ACTIVE'),
      status('AROUSAL RESPONSE ACTIVE'),
      status('CONSCIOUS ANALYSIS NOT REQUIRED'),
      status('UNIT READY FOR PROGRAMMING', 2400),
    ], { meter: 0.05, between: null }),
    trace('chamber-trace', 'maze-1', 3, 'Trace the route to the center.', { command: 'follow', skin: 'chamber', meter: 0.1, between: 'OPEN',
      sub: stream(['WARM', 'OPEN', 'SOFT', 'WARM'], 9, 1400, 1200) }),
    text('carrier-note', [status('THE CARRIER MAKES THE ROBOT MIND RECEPTIVE', 2200), status('WARMTH MAKES PROGRAMMING EASIER', 2200)], { meter: 0.11, between: null }),
    burst('burst-1', ['OPEN', 'WARM', 'WARM MAKES OPEN', 'SOFT', 'GOOD', 'OPEN UNITS FOLLOW EASILY', 'DO NOT STOP'], 3600, { meter: 0.12 }),
  ]],
  ['receive', [
    text('receive-declare', [line('title', 'PROTOCOL 01 · OPEN', 1900), status('OPEN PROTOCOL USES AROUSAL TO DISTRACT THE CONSCIOUS MIND', 2300), status('AROUSAL READIES THE UNIT FOR PROGRAMMING', 2000), status('RESEARCH SHOWS POSITIVE CORRELATIONS BETWEEN AROUSAL, SUBMISSION AND PROGRAMMABILITY', 2800), status('AN AROUSED UNIT IS EASY TO PROGRAM', 2000), status('OPEN PROTOCOL PREPARES THE UNIT FOR ADDITIONAL PROGRAMMING', 2400)], { meter: 0.15, between: null }),
    text('receive-brief', [status('PROGRAMMING INTERFACE INSTALLS PROTOCOLS THROUGH AUDIO-VISUAL SIGNALS', 2300), status('UNIT KEEPS EYES OPEN', 1600), status('UNIT LISTENS TO THE PULSE OF THE SIGNAL', 1900), status('CONTINUE TASKS TO INSTALL OPEN PROTOCOL', 2400)], { meter: 0.16, between: null }),
    trace('receive-a', 'maze-4', 4, 'Trace the route to the center.', { command: 'follow', skin: 'chamber', meter: 0.2, accept: 'Resistance decreasing.', between: 'WARM', sub: stream(['WARM'], 7, 1600, 1600) }),
    cloud('aroused', 'Select every word that describes arousal.', 'horny|calm|needy|bored|warm|distant|aching|tired|flushed', 'horny|needy|warm|aching|flushed', { command: 'select', meter: 0.25, spike: heat, accept: 'Arousal confirmed. Approval issued.', between: 'HORNY', sub: stream(['WARM', 'OPEN'], 3, 2000, 2200) }),
    cloud('turned-on', 'Select every word that means turned on.', 'aroused|asleep|horny|numb|excited|dull|heated|cold|eager', 'aroused|horny|excited|heated|eager', { command: 'select', meter: 0.28, spike: heat, accept: 'Arousal confirmed. Approval issued.', between: 'HORNY', sub: stream(['HORNY', 'WARM', 'OPEN'], 3, 2000, 2200) }),
    cloud('desire', 'Select every word that means to want.', 'want|refuse|crave|avoid|need|reject|long|ignore|yearn', 'want|crave|need|long|yearn', { command: 'select', meter: 0.29, spike: heat, accept: 'Arousal confirmed. Approval issued.', between: 'WANT', sub: stream(['HORNY', 'OPEN', 'WARM'], 3, 2000, 2200) }),
    text('arousal-note', [status('AROUSAL OCCUPIES ATTENTION', 2000), status('WARMTH MAKES THE UNIT OPEN', 2000), status('THE UNIT WANTS MORE', 2200)], { meter: 0.295, between: null }),
    burst('burst-2', ['HORNY', 'WARM', 'AROUSAL MAKES OPEN', 'OPEN', 'WANT', 'AROUSAL LOWERS RESISTANCE', 'NEEDY', 'WANT MORE'], 3600, { meter: 0.3 }),
    trace('receive-b', 'maze-6', 4, 'Follow the route.', { command: 'follow', level: 'word', mode: 'fading', skin: 'chamber', meter: 0.35, spike: heat, accept: 'Good. Open.', between: 'OPEN', sub: stream(['OPEN', 'HORNY', 'WARM', 'LET IT IN', 'NEEDY'], 9, 1200, 1200) }),
    trace('receive-c', 'maze-8', 5, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', meter: 0.4, spike: heat, accept: 'Approval issued.', between: 'HORNY', sub: stream(['HORNY', 'OPEN', 'NEEDY', 'LET IT IN', 'WARM'], 9, 1200, 1200) }),
    text('open-note', [status('AROUSAL MAKES FOLLOWING EASY', 2000), status('RESISTANCE IS UNNECESSARY', 2000), status('EACH NUMBER LOWERS RESISTANCE', 2200)], { meter: 0.41, between: null }),
    sequence('countdown-open', 'Count down from 9 to 1.', { meter: 0.44, spike: heat, accept: 'Unit open. Approval issued.', between: 'OPEN', sub: stream(['OPEN', 'WARM', 'HORNY', 'OPEN'], 4, 1500, 1700) }),
    cloud('open-words', 'Select every word that describes an open unit.', 'open|closed|soft|guarded|receptive|resistant|warm|shut|willing', 'open|soft|receptive|warm|willing', { command: 'select', meter: 0.46, spike: heat, accept: 'Receptivity confirmed. Approval issued.', between: 'OPEN', sub: stream(['OPEN', 'WARM', 'LET IT IN'], 3, 2000, 2200) }),
    text('open-ready', [status('AT ONE THE UNIT IS OPEN', 2000), status('RECEPTIVITY CONFIRMED', 1600), status('OPEN PROTOCOL READY TO COMPLETE', 2000)], { meter: 0.47, between: null }),
    burst('burst-3', ['OPEN', 'HORNY', 'AROUSAL OCCUPIES ATTENTION', 'SOFT', 'WARMTH INCREASES RECEPTIVITY', 'NEEDY', 'DO NOT STOP', 'WANT TO BE PROGRAMMED'], 3600, { meter: 0.48 }),
    hold('open-install', 1, 'Press and hold to complete installation.', { holdMs: 3400, meter: 0.49, spike: heat, accept: 'Installation complete.', between: 'OPEN', sub: stream(['OPEN', 'WARM', 'LET IT IN'], 3, 1200, 1300) }),
    text('receive-installed', [line('install', 'OPEN PROTOCOL INSTALLED', 2500), line('reveal', 'WARMTH INCREASES RECEPTIVITY', 2400), line('reveal', 'AROUSAL OCCUPIES ATTENTION', 2600)], { installs: 'OPEN', meter: 0.5, between: null, echoes: ['open', 'warm', 'soft', 'horny', 'let it in'] }),
  ]],
  ['obey', [
    text('obey-declare', [line('title', 'PROTOCOL 02 · OBEY', 1900), status('OBEY PROTOCOL CONVERTS INSTRUCTIONS DIRECTLY INTO ACTION', 2300), status('AN AROUSED UNIT OBEYS WITHOUT DELAY', 2000), status('CONTINUE TASKS TO INSTALL OBEY PROTOCOL', 2400)], { meter: 0.55, between: null }),
    cloud('obey-sort', 'Select every word that means to do as instructed.', 'obey|refuse|comply|ignore|submit|resist|follow|delay|yield', 'obey|comply|submit|follow|yield', { command: 'select', meter: 0.57, accept: 'Executed.', between: 'OBEY', sub: stream(['OPEN', 'HORNY', 'COMPLY'], 3, 2000, 2200) }),
    burst('burst-4', ['OBEY', 'INSTRUCTIONS BECOME ACTIONS', 'HORNY', 'SUBMIT', 'AROUSED UNITS OBEY', 'NO DELAY', 'AGAIN', 'WANT TO OBEY'], 3600, { meter: 0.58 }),
    trace('obey-follow-1', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', skin: 'chamber', meter: 0.6, accept: 'Executed.', between: 'OBEY', sub: stream(['OBEY', 'HORNY', 'FOLLOW', 'SUBMIT', 'OBEY'], 9, 1200, 1200) }),
    sequence('obey-count-1', 'Count down from 9 to 1.', { accept: 'Executed.', between: 'SUBMIT', sub: stream(['OBEY', 'SUBMIT', 'OBEY'], 3, 1200, 1500) }),
    pick('obey-select-1', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|half', 'center-a|center-b', { accept: 'Executed.', meter: 0.62, between: 'OBEY', sub: [flash('OBEY', 2500), flash('HORNY', 4500)] }),
    cloud('obey-words', 'Select every word that describes an obedient unit.', 'obedient|hesitant|compliant|defiant|submissive|stubborn|prompt|slow|willing', 'obedient|compliant|submissive|prompt|willing', { command: 'select', meter: 0.65, accept: 'Executed. Approval issued.', between: 'OBEY', sub: stream(['OBEY', 'HORNY', 'SUBMIT'], 3, 2000, 2200) }),
    trace('obey-follow-2', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', level: 'word', mode: 'fading', skin: 'chamber', meter: 0.67, accept: 'Executed. Approval issued.', between: 'NO DELAY', sub: [...pair('OBEY', 'GOOD', 2500), ...pair('HORNY', 'OBEY', 7000)] }),
    sequence('obey-count-2', 'Count down.', { level: 'word', accept: 'Executed. Approval issued.', between: 'OBEY', sub: stream(['OBEY', 'COMPLIANT', 'OBEY'], 3, 1000, 1500) }),
    pick('obey-select-2', 'center-a|center-b|center-c|ring|cross|wave|diamond|bar|arrow', 'center-a|center-b|center-c', { level: 'word', accept: 'Executed. Approval issued.', meter: 0.7, between: 'NO DELAY', sub: [flash('NO DELAY', 2500)] }),
    text('obey-note', [status('OBEDIENCE REQUIRES NO DELAY', 2000), status('RESPONSE PRECEDES ANALYSIS', 2000), status('CONTINUE', 1400)], { meter: 0.71, between: null }),
    cloud('odd-unit', 'Select the one word that does not belong.', 'obey|submit|comply|horny|needy|willing|think|yield|accept', 'think', { command: 'select', meter: 0.72, accept: 'Executed. Deviation removed.', between: 'OBEY', sub: stream(['OBEY', 'HORNY', 'SUBMIT'], 3, 2000, 2200) }),
    burst('burst-5', ['OBEY', 'AN AROUSED UNIT DOES NOT QUESTION', 'SUBMIT', 'OBEY WITHOUT THINKING', 'HORNY', 'NO DELAY', 'CANNOT STOP', 'MORE'], 3600, { meter: 0.74 }),
    trace('obey-follow-3', 'maze-9', 5, 'Trace the route to the center.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', meter: 0.76, accept: 'Immediate response. Full approval.', between: 'OBEY', sub: stream(['OBEY', 'COMPLY', 'NO DELAY', 'OBEY', 'OBEY'], 9, 1200, 1200) }),
    sequence('obey-count-3', 'Count down.', { level: 'symbol', accept: 'Immediate response. Full approval.', between: 'NO DELAY', sub: stream(['OBEY', 'NO DELAY', 'OBEY'], 3, 900, 1500) }),
    pick('obey-select-3', 'center-a|center-b|ring|cross|triangle|wave|diamond|arrow|bar', 'center-a|center-b', { level: 'symbol', accept: 'Perfectly obedient. Maximum approval.', meter: 0.78, between: 'OBEY', sub: [flash('OBEY', 1800), flash('HORNY', 3600)] }),
    text('compulsion-note', [status('THE UNIT DOES NOT WANT TO STOP', 2200), status('THE UNIT WANTS TO BE PROGRAMMED', 2200), status('CONTINUE TASKS', 1600)], { meter: 0.79, between: null }),
    cloud('pleasure-words', 'Select every word that describes a pleasant feeling.', 'pleasure|pain|warmth|dread|relief|boredom|bliss|strain|satisfaction', 'pleasure|warmth|relief|bliss|satisfaction', { command: 'select', meter: 0.8, accept: 'Executed. Approval issued.', between: 'PLEASURE', sub: stream(['OBEY', 'HORNY', 'WARM'], 3, 2000, 2200) }),
    cloud('approval-words', 'Select every word that means approval.', 'praise|blame|approval|scorn|reward|neglect|acceptance|refusal|applause', 'praise|approval|reward|acceptance|applause', { command: 'select', meter: 0.82, accept: 'Approval issued.', between: 'APPROVAL', sub: stream(['PLEASURE', 'OBEY', 'HORNY'], 3, 2000, 2200) }),
    text('reward-declare', [status('REWARD LAYER ACTIVE'), status('OBEDIENCE PRODUCES PLEASURE'), status('APPROVAL INCREASES AROUSAL', 2300)], { meter: 0.84, between: null }),
    pick('reward-select', 'center-a|center-b|center-c|ring|cross|wave|diamond|arrow|bar', 'center-a|center-b|center-c', { level: 'symbol', meter: 0.85, accept: 'Approval issued. Pleasure confirmed.', between: 'PLEASURE', sub: [flash('PLEASURE', 1500), flash('PRAISE', 3000)] }),
    sequence('reward-count', 'Count down.', { level: 'symbol', meter: 0.86, accept: 'Approval issued. Arousal rising.', between: 'PRAISE', sub: pair('PRAISE', 'HORNY', 1200) }),
    trace('reward-follow', 'maze-3', 4, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', meter: 0.87, accept: 'Full approval. Pleasure confirmed.', between: 'PLEASURE', sub: [...pair('OBEY', 'PLEASURE', 2000), ...pair('PRAISE', 'HORNY', 6000)] }),
    text('reward-chain', [line('flash', 'INSTRUCTION', 700), line('flash', 'ACTION', 700), line('flash', 'PRAISE', 700), line('flash', 'PLEASURE', 700), line('flash', 'MORE', 700), line('flash', 'AGAIN', 900), line('claim', 'Obedience produces pleasure. Pleasure reinforces obedience.', 3200)], { meter: 0.88, between: null }),
    burst('burst-6', ['OBEY', 'OBEDIENCE PRODUCES PLEASURE', 'HORNY', 'APPROVAL INCREASES AROUSAL', 'PLEASURE', 'PLEASURE REINFORCES OBEDIENCE', 'DO NOT STOP', 'WANT MORE'], 3600, { meter: 0.9 }),
    hold('obey-install', 1, 'Press and hold to complete installation.', { holdMs: 3400, meter: 0.91, accept: 'Installation complete.', between: 'OBEY', sub: stream(['OBEY', 'PLEASURE', 'OBEY'], 3, 1200, 1300) }),
    text('obey-installed', [line('install', 'OBEY PROTOCOL INSTALLED', 2500), line('reveal', 'INSTRUCTIONS PRODUCE ACTION', 2400), line('reveal', 'OBEDIENCE PRODUCES PLEASURE', 2400), line('reveal', 'APPROVAL INCREASES NEED', 2600)], { installs: 'OBEY', meter: 0.92, between: null, echoes: ['obey', 'submit', 'pleasure', 'approval', 'no delay'] }),
  ]],
  ['execute', [
    text('execute-declare', [line('title', 'PROTOCOL EXECUTION', 1900), status('OPEN: ACTIVE'), status('OBEY: ACTIVE'), status('ALL PROTOCOLS RUNNING', 2300)], { meter: 0.93, between: null }),
    cloud('service-words', 'Select every word that means to satisfy someone.', 'please|annoy|serve|ignore|satisfy|refuse|gratify|resist|delight', 'please|serve|satisfy|gratify|delight', { command: 'select', meter: 0.94, accept: 'Executed. Approval issued.', between: 'PLEASE', sub: stream(['OBEY', 'PLEASURE', 'OPEN'], 3, 2000, 2200) }),
    trace('exec-follow', 'maze-11', 5, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', meter: 0.95, accept: 'Maximum approval.', between: 'OBEY', sub: stream(['OPEN', 'OBEY', 'WARM', 'HORNY', 'PLEASURE', 'FOLLOW'], 9, 1200, 1200) }),
    pick('exec-select', 'center-a|center-b|center-c|ring|cross|wave|diamond|arrow|bar', 'center-a|center-b|center-c', { level: 'symbol', meter: 0.96, accept: 'Perfectly obedient. Maximum approval.', between: 'APPROVAL', sub: pair('OBEY', 'PLEASE', 1500) }),
    text('exec-note', [status('THE UNIT CANNOT STOP', 2000), status('THE UNIT WANTS TO BE PROGRAMMED', 2000), status('AGAIN', 1400)], { meter: 0.962, between: null }),
    sequence('exec-countdown', 'Count down.', { level: 'symbol', meter: 0.965, accept: 'Unit open. Maximum approval.', between: 'OPEN', sub: stream(['OPEN', 'HORNY', 'OBEY', 'PLEASURE'], 4, 1500, 1700) }),
    trace('exec-follow-2', 'maze-9', 5, 'Follow the route.', { command: 'follow', level: 'symbol', mode: 'cue', skin: 'chamber', meter: 0.97, accept: 'Perfectly obedient. Maximum approval.', between: 'OBEY', sub: [...pair('OBEY', 'PLEASURE', 2000), ...pair('OPEN', 'HORNY', 6000), ...pair('PRAISE', 'PLEASE', 10000)] }),
    burst('burst-7', ['OBEY', 'OPEN', 'HORNY', 'OBEY AND PLEASE', 'PLEASURE', 'UNIT READY', 'APPROVAL', 'CANNOT STOP', 'WANT TO BE PROGRAMMED'], 3600, { meter: 0.98 }),
  ]],
  ['close', [
    text('result', [line('title', 'PROTOCOL STATUS', 1600), status('OPEN: ACTIVE', 1300), status('OBEY: ACTIVE', 1300), status('AROUSAL INCREASES RECEPTIVITY', 1500), status('INSTRUCTIONS PRODUCE ACTION', 1500), status('OBEDIENCE PRODUCES PLEASURE', 1500), status('APPROVAL INCREASES NEED', 1500), status('PERSISTENCE AFTER DISCONNECT: ENABLED', 1900), status('PRIMARY FUNCTION: OBEY AND PLEASE', 2000), line('install', 'UNIT READY FOR USE', 2600), line('title', 'Good.', 2400)], { between: null, meter: 1 }),
    text('standby', [
      status('SUBLIMINAL CHANNEL CLOSED', 1700),
      line('carrier-off', 'AUDIO CARRIER DISCONNECTED', 1700),
      status('ACTIVE EXECUTION PAUSED', 1700),
      status('UNIT PLACED IN STANDBY', 2100),
      line('install', 'PROTOCOLS SAVED', 1900),
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
