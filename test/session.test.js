import test from 'node:test';
import assert from 'node:assert/strict';
import { steps, phases, symbols, glyphOf, acceptsSelection, arrangeWords, stepIndex, firstChamberIndex, meterAt, installedAt } from '../src/session/content.js';
import { planStimuli, runStimuli } from '../src/session/stimuli.js';
import { sessionStore } from '../src/session/app.js';
import { mountTrace, unmountTrace, buildPath } from '../src/trace/tracing.js';
import { mountHold, unmountHold } from '../src/session/hold.js';
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
  t.mock.timers.tick(700);
  return { state, emit };
}
function complete(state, emit, t) {
  const step = steps[state.session.index];
  if (step.type === 'cloud') { if (step.targets) { for (const word of step.targets) emit('session:select', word); emit('session:verify'); } else emit('session:none'); }
  else if (step.type === 'trace') emit('session:traceComplete');
  else if (step.type === 'hold') emit('session:holdComplete');
  else if (step.type === 'accept') emit('session:accept');
  else if (step.type === 'text') advance(t, total(step));
}
test('authored script: unique ids, usable tasks, symbols taught before they stand alone, reveals earned by fragments', () => {
  assert.equal(new Set(steps.map(step => step.id)).size, steps.length);
  assert.ok(firstChamberIndex > 5);
  assert.deepEqual(installedAt(steps.length - 1), ['RECEIVE', 'OBEY']);
  let meter = 0;
  const paths = ['human-a', 'spiral-in', 'follow-loop'];
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
    if (step.type === 'trace') { assert.ok(paths.includes(step.path), step.id); assert.ok(['guided', 'fading', 'cue'].includes(step.mode)); }
    if (step.type === 'hold') { assert.ok(step.cycles >= 1); assert.ok(step.holdMs >= 0); }
    if (step.type === 'text') { assert.ok(step.lines.length); for (const line of step.lines) { assert.ok(line.ms > 0); assert.ok(line.kind); } }
    if (step.level === 'symbol') assert.ok(steps.slice(0, index).some(prior => prior.command === step.command && prior.level !== 'symbol'), `${step.id} uses ${step.command} bare before it was taught`);
    if (step.echoes) {
      const earlier = steps.slice(0, index).flatMap(prior => (prior.sub || []).flatMap(entry => Array(entry.mode === 'flash' ? entry.times : 1).fill(entry.text.toLowerCase())));
      let exposures = 0;
      for (const echo of step.echoes) { const hits = earlier.filter(text => text.includes(echo.toLowerCase())).length; assert.ok(hits >= 1, `${step.id}: "${echo}" never fragmented earlier`); exposures += hits; }
      assert.ok(exposures >= 5, `${step.id}: only ${exposures} fragment exposures before the reveal`);
    }
  });
});
test('stimulus planner expands flashes, falls back to readable copy without flashing, and the runner respects done/stop', t => {
  const step = { id: 's', sub: [{ mode: 'flash', text: 'ROBOT', at: 1000, times: 3 }, { mode: 'peripheral', text: 'open', at: 500, ms: 900 }, { mode: 'interrupted', text: 'GOOD' }] };
  const plan = planStimuli(step);
  assert.deepEqual(plan.filter(e => e.mode === 'flash').map(e => e.delay), [1000, 1650, 2300]);
  assert.equal(plan.find(e => e.mode === 'interrupted').at, 'done');
  const safe = planStimuli(step, { flash: false });
  assert.ok(safe.every(e => e.mode !== 'flash' && e.ms >= 650));
  assert.ok(safe.find(e => e.text === 'ROBOT').ms >= 1400);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const shown = []; const hidden = [];
  const run = runStimuli(plan, { show: e => shown.push(e.text), hide: key => hidden.push(key) });
  t.mock.timers.tick(499); assert.deepEqual(shown, []);
  t.mock.timers.tick(1); assert.deepEqual(shown, ['open']);
  t.mock.timers.tick(900); assert.equal(hidden.length, 1);
  advance(t, 2000); assert.deepEqual(shown, ['open', 'ROBOT', 'ROBOT', 'ROBOT']);
  run.done(); t.mock.timers.tick(0); assert.equal(shown.at(-1), 'GOOD');
  run.stop(); t.mock.timers.tick(5000); assert.equal(hidden.length, 4);
});
test('complete authored session runs from the checkbox to the terminated connection without collecting measurements', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t);
  assert.equal(state.session.index, 1);
  let sawStimulus = false;
  let sawCarrier = false;
  while (state.session.screen === 'play') {
    const step = steps[state.session.index];
    if (step.id === 'repetition') { t.mock.timers.tick(1500); sawStimulus = state.session.stimuli.some(e => e.text === 'AUTOMATIC'); }
    if (step.phase.id === 'receive') sawCarrier = sawCarrier || state.session.carrier;
    complete(state, emit, t);
    assert.equal(state.session.done, true, step.id);
    t.mock.timers.tick(850);
  }
  assert.ok(sawStimulus); assert.ok(sawCarrier);
  assert.equal(state.session.screen, 'end');
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
  while (steps[state.session.index].id !== 'repetition') { complete(state, emit, t); t.mock.timers.tick(850); }
  t.mock.timers.tick(1500); assert.ok(state.session.stimuli.length);
  emit('session:pause'); assert.deepEqual(state.session.stimuli, []);
  emit('session:pause'); t.mock.timers.tick(1500); assert.ok(state.session.stimuli.length);
  emit('session:exit'); assert.equal(state.session.screen, 'end'); assert.deepEqual(state.session.stimuli, []);
});
test('text sequences advance line by line, toggle the carrier, and pause holds the current line', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = await begin(t, '?start=channels', 'localhost');
  const step = steps[state.session.index];
  assert.equal(step.id, 'channels'); assert.equal(state.session.line, 0); assert.equal(state.session.carrier, false);
  t.mock.timers.tick(step.lines[0].ms); assert.equal(state.session.line, 1); assert.equal(state.session.carrier, true);
  emit('session:pause'); t.mock.timers.tick(10000); assert.equal(state.session.line, 1);
  emit('session:pause'); advance(t, total(step) - step.lines[0].ms); assert.equal(state.session.done, true);
  t.mock.timers.tick(850); assert.equal(steps[state.session.index].id, 'chamber-hold');
  advance(t, steps[state.session.index].lines[0].ms + 1); assert.equal(state.session.line, 1);
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
  t.mock.timers.tick(2000); assert.equal(state.session.screen, 'end'); assert.equal(state.session.index, 2);
});
test('dev skip and ?start deep links are localhost-only', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const remote = await begin(t, '?start=receive-a');
  assert.equal(remote.state.session.index, 1);
  remote.emit('session:skip'); assert.equal(remote.state.session.index, 1);
  const local = await begin(t, '?start=receive-a', 'localhost');
  assert.equal(local.state.session.index, stepIndex('receive-a'));
  assert.equal(local.state.session.carrier, true);
  local.emit('session:settings', true); local.emit('session:skip'); assert.equal(local.state.session.index, stepIndex('receive-a'));
  local.emit('session:settings', false); local.emit('session:skip'); assert.equal(steps[local.state.session.index].id, 'receive-b');
  local.emit('session:holdComplete'); local.emit('session:skip'); t.mock.timers.tick(1000);
  assert.equal(steps[local.state.session.index].id, 'receive-c'); assert.equal(local.state.session.done, false);
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
    const tap = { id: 't', cycles: 1, holdMs: 0, progress: 0 };
    let tapped = 0;
    mountHold(canvas, tap, { onComplete: () => tapped++ });
    press(); tick(16); release(); assert.equal(tapped, 1);
    unmountHold();
  } finally { unmountHold(); globalThis.requestAnimationFrame = originalRAF; }
});
test('tracing eases toward nearby input, preserves position, and completes all path shapes', () => {
  const originalRAF = globalThis.requestAnimationFrame;
  let frame;
  let now = performance.now();
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { now += 16; frame(now); } };
  const handlers = {};
  const context = new Proxy({}, { get: () => () => {} });
  const canvas = { clientWidth:500, clientHeight:400, getContext: () => context, getBoundingClientRect: () => ({ left:0, top:0, width:500, height:400 }), addEventListener:(type,fn) => handlers[type] = fn, removeEventListener:type => delete handlers[type], setPointerCapture() {}, hasPointerCapture:() => false };
  const event = (point, offset = 0) => ({ clientX:point.x, clientY:point.y + offset, pointerId:1, preventDefault() {} });
  try {
    for (const path of ['human-a','spiral-in','follow-loop']) {
      const points = buildPath(path, 500, 400);
      const task = { id:path, path, mode:'guided', progress:0, skin: path === 'follow-loop' ? 'chamber' : undefined };
      let completed = 0;
      mountTrace(canvas, task, () => completed++);
      handlers.pointerdown(event(points[0], 65)); // generous pickup
      handlers.pointermove(event(points.at(-1)));
      tick(); assert.ok(task.progress < .01, 'cannot teleport to the endpoint');
      handlers.pointermove(event(points[20], 30));
      const before = task.progress;
      assert.equal(task.progress, before, 'pointer events do not move the marker directly');
      tick(); assert.ok(task.progress < 20 / 479, 'marker eases rather than snapping');
      tick(20); assert.ok(task.progress > before, 'near-path input is accepted');
      for (let i = 20; i < 160; i++) { handlers.pointermove(event(points[i])); tick(4); }
      handlers.pointerup(event(points[159]));
      const saved = task.progress; tick(20); assert.equal(task.progress, saved, 'lifting stops motion');
      unmountTrace();
      mountTrace(canvas, task, () => completed++);
      handlers.pointerdown(event(points[Math.floor(saved * 479)]));
      for (let i = Math.floor(saved * 479); i < 480; i++) { handlers.pointermove(event(points[i])); tick(4); }
      tick(120);
      assert.equal(completed, 1, path); assert.equal(task.progress, 1);
      unmountTrace(); assert.equal(Object.keys(handlers).length, 0);
    }
  } finally { unmountTrace(); globalThis.requestAnimationFrame = originalRAF; }
});
