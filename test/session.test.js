import { mountHold, unmountHold } from '../src/session/hold.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { steps, phases, symbols, glyphOf, acceptsSelection, arrangeWords, stepIndex, firstChamberIndex, meterAt, installedAt } from '../src/session/content.js';
import { planStimuli, runStimuli, spikeOf } from '../src/session/stimuli.js';
import { sessionStore } from '../src/session/app.js';
import { mountTrace, unmountTrace, buildPath } from '../src/trace/tracing.js';
globalThis.window = { matchMedia: () => ({ matches: false }), devicePixelRatio: 1, location: { hostname: 'example.com', search: '' } };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
function harness() {
  const events = new Map();
  const state = {};
  const emitter = { on(name, handler) { events.set(name, handler); }, emit(name, value) { return events.get(name)?.(value); } };
  sessionStore(state, emitter);
  return { state, emit: emitter.emit };
}
const total = step => step.lines.reduce((sum, line) => sum + line.ms, 0);
const advance = (t, ms) => { for (let done = 0; done < ms; done += 20) t.mock.timers.tick(Math.min(20, ms - done)); };
async function begin(t, search = '', hostname = 'example.com') {
  window.location = { hostname, search };
  const { state, emit } = harness();
  await emit('session:start');
  t.mock.timers.tick(900);
  return { state, emit };
}
async function complete(state, emit, t) {
  const step = steps[state.session.index];
  if (step.type === 'cloud') { for (const word of step.targets || []) emit('session:select', word); emit('session:verify'); }
  else if (step.type === 'sequence') { for (let n = step.from; n >= step.to; n--) emit('session:select', String(n)); }
  else if (step.type === 'trace') emit('session:traceComplete');
  else if (step.type === 'hold') emit('session:holdComplete');
  else if (step.type === 'burst' || step.type === 'stream') advance(t, step.ms);
  else if (step.type === 'checkbox') { await emit('session:start'); t.mock.timers.tick(900); }
  else if (step.type === 'text') { if (step.trigger) { await emit('session:start'); t.mock.timers.tick(900); } advance(t, total(step)); if (step.gate) emit('session:continue'); }
}
test('authored script: unique ids, usable tasks, symbols taught before they stand alone, reveals earned by fragments', () => {
  assert.equal(new Set(steps.map(step => step.id)).size, steps.length);
  assert.ok(firstChamberIndex > 5);
  assert.deepEqual(installedAt(steps.length - 1), ['OPEN', 'OBEY', 'PLEASE']);
  let meter = 0;
  steps.forEach((step, index) => {
    assert.ok(phases.includes(step.phase), step.id);
    assert.ok(['full', 'word', 'symbol'].includes(step.level), step.id);
    assert.ok(meterAt(index) >= meter); meter = meterAt(index);
    if (step.command) assert.ok(symbols[step.command].word, step.id);
    if (step.type === 'cloud') {
      assert.equal(step.words.length, 9); assert.equal(new Set(step.words).size, 9);
      assert.deepEqual([...arrangeWords(step.words, 3)].sort(), [...step.words].sort());
      if (step.symbolic) { for (const tile of step.words) assert.ok(symbols[glyphOf(tile)], tile); if (step.example) assert.ok(symbols[step.example]); }
      if (step.targets) { assert.ok(step.targets.every(word => step.words.includes(word))); assert.ok(acceptsSelection(step, step.targets)); assert.ok(!acceptsSelection(step, [])); }
      else { assert.ok(acceptsSelection(step, [])); assert.ok(acceptsSelection(step, step.words)); }
    }
    if (step.type === 'trace') { assert.ok(step.path.startsWith('maze-') && Number(step.path.slice(5)) < 12, step.id); assert.ok(['guided', 'fading', 'cue'].includes(step.mode)); }
    if (step.type === 'sequence') assert.equal(step.from - step.to + 1, 9, step.id);
    if (step.type === 'stream') { assert.ok(step.words.length >= 8 && step.ms >= 30000, step.id); assert.equal(step.phase.chamber, true); }
    if (step.type === 'hold') { assert.ok(step.cycles >= 1); assert.ok(step.holdMs >= 0); }
    if (step.type === 'text') { assert.ok(step.lines.length); for (const line of step.lines) { assert.ok(line.ms > 0); assert.ok(line.kind); } }
    if (step.type === 'burst') { assert.ok(step.ms >= 2000 && step.phase.chamber, step.id); assert.ok(step.sub.length >= 7, `${step.id} needs a dense flash stream`); }
    if (!['checkbox', 'text', 'burst'].includes(step.type) && step.phase.id !== 'close') assert.ok(step.between, `${step.id} has no transition flash`);
    if (step.between) assert.match(step.between, /^[A-Z ]+$/);
    if (step.level === 'symbol') assert.ok(steps.slice(0, index).some(prior => prior.command === step.command && prior.level !== 'symbol'), `${step.id} uses ${step.command} bare before it was taught`);
    if (step.echoes) {
      const earlier = steps.slice(0, index).flatMap(prior => [...(prior.between ? [prior.between.toLowerCase()] : []), ...(prior.type !== 'text' ? (prior.lines || []).map(line => line.text.toLowerCase()) : []), ...(prior.sub || []).flatMap(entry => Array(entry.mode === 'flash' ? entry.times : 1).fill(entry.text.toLowerCase()))]);
      let exposures = 0;
      for (const echo of step.echoes) { const hits = earlier.filter(text => text.includes(echo.toLowerCase())).length; assert.ok(hits >= 1, `${step.id}: "${echo}" never fragmented earlier`); exposures += hits; }
      assert.ok(exposures >= 5, `${step.id}: only ${exposures} fragment exposures before the reveal`);
    }
  });
});
test('stimulus planner expands flashes and the runner respects done/stop', t => {
  const step = { id: 's', sub: [{ mode: 'flash', text: 'ROBOT', at: 1000, times: 3 }, { mode: 'interrupted', text: 'GOOD' }] };
  const plan = planStimuli(step);
  assert.deepEqual(plan.filter(e => e.mode === 'flash').map(e => e.delay), [1000, 1650, 2300]);
  const between = planStimuli({ id: 'b', between: 'ROBOT' });
  assert.deepEqual(between.map(e => [e.mode, e.at, e.delay, e.text]), [['flash', 'done', 300, 'ROBOT']]);
  const carried = planStimuli({ id: 'n' }, ['OPEN', 'WARM']).filter(e => e.key.includes(':spike:'));
  assert.equal(carried.length, 8); assert.deepEqual(carried.slice(0, 3).map(e => [e.at, e.delay, e.ms]), [['start', 0, 320], ['start', 130, 320], ['start', 260, 320]]);
  assert.equal(plan.find(e => e.mode === 'interrupted').at, 'done');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const shown = []; const hidden = [];
  const run = runStimuli(plan, { show: e => shown.push(e.text), hide: key => hidden.push(key) });
  t.mock.timers.tick(999); assert.deepEqual(shown, []);
  advance(t, 2500); assert.deepEqual(shown, ['ROBOT', 'ROBOT', 'ROBOT']); assert.equal(hidden.length, 3);
  run.done(); t.mock.timers.tick(0); assert.equal(shown.at(-1), 'GOOD');
  run.stop(); t.mock.timers.tick(5000); assert.equal(hidden.length, 3);
});
test('complete authored session runs from the checkbox to the terminated connection without collecting measurements', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t);
  assert.equal(state.session.index, 1);
  let sawStimulus = false;
  let sawCarrier = false;
  while (state.session.screen === 'play') {
    const step = steps[state.session.index];
    if (step.id === 'route-a-again') { t.mock.timers.tick(3500); sawStimulus = state.session.stimuli.some(e => e.mode === 'flash'); }
    if (step.phase.id === 'receive') sawCarrier = sawCarrier || state.session.carrier;
    await complete(state, emit, t);
    if (step.type !== 'checkbox') assert.equal(state.session.done, true, step.id);
    t.mock.timers.tick(850);
  }
  assert.ok(sawStimulus); assert.ok(sawCarrier);
  assert.equal(state.session.screen, 'end');
  assert.ok(state.session.duration >= 0);
  assert.deepEqual(state.session.timeline.map(entry => entry.title), phases.map(phase => phase.title));
  assert.ok(state.session.timeline.every(entry => entry.ms >= 0));
  assert.equal(state.session.carrier, false);
  assert.deepEqual(state.session.stimuli, []);
  for (const key of ['stats', 'model', 'responses', 'reactionMs', 'history']) assert.ok(!(key in state.session));
});
test('wrong selections stay editable; pause and settings block input and clear transient stimuli', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t);
  emit('session:select', 'square'); emit('session:verify');
  assert.equal(state.session.done, false); assert.match(state.session.feedback, /try again/);
  emit('session:pause'); emit('session:select', 'circle'); emit('session:next');
  assert.deepEqual(state.session.selected, ['square']); assert.equal(state.session.index, 1);
  emit('session:pause'); emit('session:settings', true); emit('session:select', 'circle');
  assert.deepEqual(state.session.selected, ['square']);
  emit('session:settings', false); emit('session:select', 'square');
  for (const word of steps[1].targets) emit('session:select', word);
  emit('session:verify'); assert.equal(state.session.done, true);
  t.mock.timers.tick(850); assert.equal(state.session.index, 2);
  while (steps[state.session.index].id !== 'route-a-again') { await complete(state, emit, t); t.mock.timers.tick(850); }
  t.mock.timers.tick(3500); assert.ok(state.session.stimuli.length);
  emit('session:pause'); assert.deepEqual(state.session.stimuli, []);
  emit('session:pause'); t.mock.timers.tick(3500); assert.ok(state.session.stimuli.length);
  emit('session:exit'); assert.equal(steps[state.session.index].id, 'recovery-permission'); assert.deepEqual(state.session.stimuli, []);
});
test('text sequences advance line by line, toggle the carrier, and pause holds the current line', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t, '?start=channels', 'localhost');
  const step = steps[state.session.index];
  assert.equal(step.id, 'channels'); assert.equal(state.session.line, 0); assert.equal(state.session.carrier, false);
  t.mock.timers.tick(step.lines[0].ms); assert.equal(state.session.line, 1); assert.equal(state.session.carrier, true);
  emit('session:pause'); t.mock.timers.tick(10000); assert.equal(state.session.line, 1);
  emit('session:pause'); advance(t, total(step) - step.lines[0].ms); assert.equal(state.session.done, true);
  t.mock.timers.tick(850); assert.equal(steps[state.session.index].id, 'chamber-trace');
});
test('accepted tasks celebrate then advance automatically; settings suspend the transition', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t);
  for (const word of steps[1].targets) emit('session:select', word);
  emit('session:verify'); assert.equal(state.session.done, true);
  t.mock.timers.tick(849); assert.equal(state.session.index, 1);
  emit('session:settings', true); t.mock.timers.tick(2000); assert.equal(state.session.index, 1);
  emit('session:settings', false); t.mock.timers.tick(850); assert.equal(state.session.index, 2);
  assert.equal(state.session.done, false);
  emit('session:traceComplete'); emit('session:exit');
  t.mock.timers.tick(2000); assert.equal(steps[state.session.index].id, 'recovery-permission'); assert.equal(state.session.screen, 'play');
});
test('dev skip and ?start deep links are localhost-only', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const remote = await begin(t, '?start=receive-a');
  assert.equal(remote.state.session.index, 1);
  remote.emit('session:skip'); assert.equal(remote.state.session.index, 1);
  const local = await begin(t, '?start=receive-a', 'localhost');
  const start = stepIndex('receive-a');
  assert.equal(local.state.session.index, start);
  assert.equal(local.state.session.carrier, true);
  local.emit('session:settings', true); local.emit('session:skip'); assert.equal(local.state.session.index, start);
  local.emit('session:settings', false); local.emit('session:skip'); assert.equal(local.state.session.index, start + 1);
  local.emit('session:skip'); assert.equal(local.state.session.index, start + 2);
  local.emit('session:skip'); t.mock.timers.tick(1000);
  assert.equal(local.state.session.index, start + 3); assert.equal(local.state.session.done, false);
});
test('tracing eases toward nearby input, preserves position, and completes labyrinths of every size', () => {
  const originalRAF = globalThis.requestAnimationFrame;
  let frame;
  let now = performance.now();
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { now += 16; frame(now); } };
  const handlers = {};
  const context = new Proxy({}, { get: () => () => {} });
  const canvas = { clientWidth: 500, clientHeight: 400, getContext: () => context, getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 400 }), addEventListener: (type, fn) => handlers[type] = fn, removeEventListener: type => delete handlers[type], setPointerCapture() {}, hasPointerCapture: () => false };
  const event = (point, offset = 0) => ({ clientX: point.x, clientY: point.y + offset, pointerId: 1, preventDefault() {} });
  try {
    for (const path of ['maze-0', 'maze-5', 'maze-11']) {
      const points = buildPath(path, 500, 400);
      const n = points.length;
      const spacing = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      assert.ok(spacing > 2 && spacing < 6, 'corridor points are a few pixels apart');
      assert.ok(points.corridor >= 10);
      const near = Math.round(40 / spacing);
      const mid = Math.round(n * 0.33);
      const task = { id: path, path, mode: 'guided', progress: 0 };
      let completed = 0;
      mountTrace(canvas, task, () => completed++);
      handlers.pointerdown(event(points[0], 65)); // generous pickup
      handlers.pointermove(event(points.at(-1)));
      tick(); assert.ok(task.progress < .01, 'cannot teleport to the goal');
      handlers.pointermove(event(points[near], 30));
      const before = task.progress;
      assert.equal(task.progress, before, 'pointer events do not move the marker directly');
      tick(); assert.ok(task.progress < near / (n - 1), 'marker eases rather than snapping');
      tick(20); assert.ok(task.progress > before, 'near-path input is accepted');
      for (let i = near; i < mid; i++) { handlers.pointermove(event(points[i])); tick(2); }
      handlers.pointerup(event(points[mid - 1]));
      const saved = task.progress; tick(20); assert.equal(task.progress, saved, 'lifting stops motion');
      assert.ok(saved > 0.2, 'the marker keeps up with a moving hand');
      unmountTrace();
      mountTrace(canvas, task, () => completed++);
      handlers.pointerdown(event(points[Math.floor(saved * (n - 1))]));
      for (let i = Math.floor(saved * (n - 1)); i < n; i++) { handlers.pointermove(event(points[i])); tick(2); }
      tick(120);
      assert.equal(completed, 1, path); assert.equal(task.progress, 1);
      unmountTrace(); assert.equal(Object.keys(handlers).length, 0);
    }
  } finally { unmountTrace(); globalThis.requestAnimationFrame = originalRAF; }
});
test('hold controller fills while pressed, needs a release after the pulse, and completes after the authored cycles', () => {
  const originalRAF = globalThis.requestAnimationFrame;
  let frame; let now = performance.now();
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
  const tick = (ms) => { for (let i = 0; i < ms / 16; i++) { now += 16; frame(now); } };
  const handlers = {};
  const context = new Proxy({}, { get: () => () => {} });
  const canvas = { clientWidth: 400, clientHeight: 400, getContext: () => context, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }), addEventListener: (type, fn) => handlers[type] = fn, removeEventListener: type => delete handlers[type], setPointerCapture() {}, hasPointerCapture: () => false };
  const press = (x = 200, y = 200) => handlers.pointerdown({ clientX: x, clientY: y, pointerId: 1, preventDefault() {} });
  const release = () => handlers.pointerup({ pointerId: 1 });
  try {
    const task = { id: 'h', cycles: 2, holdMs: 1000, progress: 0 };
    let completed = 0; let pulses = 0; let lastFill = 0;
    mountHold(canvas, task, { onComplete: () => completed++, onPulse: () => pulses++, onFill: fill => lastFill = fill });
    press(20, 20); tick(500); assert.equal(lastFill, 0, 'presses away from the target are ignored');
    press(); tick(500); assert.ok(lastFill > 0.4 && lastFill < 0.6);
    release(); tick(500); assert.equal(lastFill, 0, 'early release drains without counting'); assert.equal(task.progress, 0);
    press(); tick(1100); assert.equal(pulses, 1); assert.equal(lastFill, 1);
    tick(1000); assert.equal(task.progress, 0, 'holding past the pulse does not count until release');
    release(); assert.equal(task.progress, 1); assert.equal(completed, 0);
    press(); tick(1100); release(); assert.equal(completed, 1); assert.equal(task.progress, 2);
    unmountHold(); assert.equal(Object.keys(handlers).length, 0);
  } finally { unmountHold(); globalThis.requestAnimationFrame = originalRAF; }
});
test('countdown accepts only the next number and finishes on the last', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t, '?start=countdown-a', 'localhost');
  assert.equal(steps[state.session.index].id, 'countdown-a');
  emit('session:select', '8');
  assert.deepEqual(state.session.selected, []); assert.equal(state.session.rejected, '8'); assert.match(state.session.feedback, /Continue from 9/);
  t.mock.timers.tick(400); assert.equal(state.session.rejected, null);
  for (let n = 9; n >= 2; n--) emit('session:select', String(n));
  assert.equal(state.session.done, false); assert.equal(state.session.selected.length, 8); assert.equal(state.session.feedback, '');
  emit('session:select', '1'); assert.equal(state.session.done, true); assert.equal(state.session.feedback, steps[state.session.index].phase.accept);
});

const FAMILY = { obedience: 'obey', obedient: 'obey', obeys: 'obey', obeying: 'obey', arousal: 'aroused', arousing: 'aroused', arouse: 'aroused', warmth: 'warm', warmer: 'warm', receptivity: 'receptive', submission: 'submit', submissive: 'submit', compliance: 'comply', compliant: 'comply', responsive: 'respond', responds: 'respond', needy: 'need', needs: 'need', pleased: 'please', pleasing: 'please', thought: 'think', thinking: 'think', thinks: 'think', approval: 'approve', approved: 'approve', acceptance: 'accept', resistance: 'resist', resistant: 'resist' };
const ALLOWED = new Set('a an the is are be been being was it its to of in into on at by for with and or not no now than then this that these those has have had do does did will can may more less most each every one all any some before after without within when while as if so let make makes made easy easier easily hard harder take takes become becomes produce produces increase increases lower lowers reduce reduces require requires required occupy occupies reinforce reinforces precede precedes confirmed detected first new further down up out unit units program programs programming programmed status active installed install channel carrier verification human response instruction instructions action actions delay attention analysis ready use mind number numbers route center ring term purpose revealed capable unnecessary reason saved follow hold count select cannot keep going feel protocol protocols primary function stop i am'.split(' '));
const stemOf = word => (FAMILY[word] || word).replace(/(ness|ment|ence|ance|ity|ion|ing|ed|es|ly|al|s)$/, '');
test('every flashed, paired, bound or installed word was sorted as correct by the player first', () => {
  const acquired = new Set();
  const check = (id, kind, text) => {
    for (const raw of text.toLowerCase().split(/[^a-z]+/).filter(Boolean)) {
      const stem = stemOf(raw);
      if (ALLOWED.has(raw) || ALLOWED.has(stem)) continue;
      assert.ok(acquired.has(stem), `${id} ${kind} "${text}": "${raw}" shown before it was sorted`);
    }
  };
  for (const step of steps) {
    for (const word of step.phase.ring) check(step.id, 'ring', word);
    for (const entry of step.sub || []) check(step.id, entry.mode, entry.text);
    for (const l of step.lines || []) if (['claim', 'flash', 'reveal', 'install'].includes(l.kind)) check(step.id, l.kind, l.text);
    if (step.type === 'cloud' && !step.symbolic && step.targets) for (const word of step.targets) acquired.add(stemOf(word.toLowerCase()));
    for (const word of spikeOf(step) || []) check(step.id, 'spike', word);
    for (const word of step.words && step.type === 'stream' ? step.words : []) check(step.id, 'stream', word);
    if (step.between) check(step.id, 'between', step.between);
  }
  assert.ok(acquired.has('horny') && acquired.has('obey') && acquired.has('pleasure') && acquired.has('please'));
});

test('the climax stream spawns words, rewards every click, and ends on its own clock', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t, '?start=climax', 'localhost');
  const step = steps[state.session.index];
  assert.equal(step.type, 'stream');
  advance(t, 100);
  assert.ok(state.session.stream.slots.length >= 1);
  const first = state.session.stream.slots[0];
  assert.ok(step.words.includes(first.word));
  emit('session:hit', first.id);
  assert.equal(state.session.stream.hits, 1); assert.equal(first.hit, true); assert.equal(state.session.feedback, 'Approval issued.');
  emit('session:hit', first.id); assert.equal(state.session.stream.hits, 1);
  advance(t, 3000);
  assert.ok(state.session.stream.spawned >= 2); assert.equal(state.session.done, false);
  advance(t, step.ms); assert.ok(state.session.done || state.session.index > stepIndex('climax'), 'the stream ends on its own clock');
});

test('recovery waits for the player before counting up', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t, '?start=recovery-permission', 'localhost');
  const step = steps[state.session.index];
  advance(t, total(step) + 20);
  assert.equal(state.session.done, false); assert.equal(state.session.waiting, true);
  emit('session:continue'); assert.equal(state.session.done, true);
  t.mock.timers.tick(850); assert.equal(steps[state.session.index].id, 'recovery');
});
