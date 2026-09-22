import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, steps, recovery, acceptsSelection, arrangeWords } from '../src/session/content.js';
import { sessionStore } from '../src/session/app.js';
import { mountTrace, unmountTrace, buildPath } from '../src/trace/tracing.js';
globalThis.window = { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
function harness() {
  const events = new Map();
  const state = {};
  const emitter = { on(name, handler) { events.set(name, handler); }, emit(name, value) { return events.get(name)?.(value); } };
  sessionStore(state, emitter);
  return { state, emit: emitter.emit };
}
test('every authored activity is usable and category answers are unambiguous in the data', () => {
  assert.equal(new Set(steps.map(s => s.id)).size, steps.length);
  assert.equal(sections.length, 7);
  for (const step of steps.filter(s => s.type === 'cloud')) {
    assert.equal(step.words.length, 9);
    assert.equal(new Set(step.words).size, 9);
    assert.deepEqual([...arrangeWords(step.words, 3)].sort(), [...step.words].sort());
    if (step.targets) {
      assert.ok(step.targets.every(word => step.words.includes(word)));
      assert.ok(acceptsSelection(step, step.targets));
      assert.ok(!acceptsSelection(step, []));
    } else {
      assert.ok(acceptsSelection(step, []));
      assert.ok(acceptsSelection(step, step.words));
    }
  }
});
test('complete authored session reaches recovery and completion without collecting measurements', async () => {
  const { state, emit } = harness();
  assert.equal(state.session.screen, 'intro');
  await emit('session:start');
  for (let i = 0; i < steps.length; i++) {
    assert.equal(state.session.index, i);
    const step = steps[i];
    if (step.type === 'cloud') {
      if (step.targets) { for (const word of step.targets) emit('session:select', word); emit('session:verify'); }
      else emit('session:none');
    } else if (step.type === 'trace') emit('session:traceComplete');
    if (step.type !== 'gate') assert.equal(state.session.done, true, step.id);
    emit('session:next');
  }
  assert.equal(state.session.screen, 'recovery');
  for (const line of recovery) emit('session:recover');
  assert.equal(state.session.screen, 'complete');
  for (const key of ['stats','model','responses','reactionMs']) assert.ok(!(key in state.session));
});
test('wrong selections remain editable; pause and settings block task actions', async () => {
  const { state, emit } = harness(); await emit('session:start');
  emit('session:select', 'stone'); emit('session:verify');
  assert.equal(state.session.done, false);
  assert.match(state.session.feedback, /try again/);
  emit('session:pause'); emit('session:select', 'tree'); emit('session:next');
  assert.deepEqual(state.session.selected, ['stone']); assert.equal(state.session.index, 0);
  emit('session:pause'); emit('session:settings', true); emit('session:select', 'tree');
  assert.deepEqual(state.session.selected, ['stone']);
  emit('session:settings', false); emit('session:select', 'stone');
  for (const word of steps[0].targets) emit('session:select', word);
  emit('session:verify'); assert.equal(state.session.done, true);
  emit('session:next'); assert.equal(state.session.index, 1);
  emit('session:exit'); assert.equal(state.session.screen, 'recovery');
});
test('tracing eases toward nearby input, preserves position, and completes all path shapes', () => {
  const originalRAF = globalThis.requestAnimationFrame;
  let frame;
  let now = performance.now();
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { now += 16; frame(now); } };
  const handlers = {};
  const context = new Proxy({}, { get: () => () => {} });
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  const canvas = { clientWidth:500, clientHeight:400, getContext: () => context, getBoundingClientRect: () => ({ left:0, top:0, width:500, height:400 }), addEventListener:(type,fn) => handlers[type] = fn, removeEventListener:type => delete handlers[type], setPointerCapture() {}, hasPointerCapture:() => false };
  const event = (point, offset = 0) => ({ clientX:point.x, clientY:point.y + offset, pointerId:1, preventDefault() {} });
  try {
    for (const path of ['human-a','spiral-in','follow-loop']) {
      const points = buildPath(path, 500, 400);
      const task = { id:path, path, mode:'guided', progress:0 };
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
test('accepted tasks celebrate then advance automatically; settings suspend the transition', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = harness();
  await emit('session:start');
  for (const word of steps[0].targets) emit('session:select', word);
  emit('session:verify');
  assert.equal(state.session.done, true);
  t.mock.timers.tick(849); assert.equal(state.session.index, 0);
  emit('session:settings', true);
  t.mock.timers.tick(2000); assert.equal(state.session.index, 0);
  emit('session:settings', false);
  t.mock.timers.tick(850); assert.equal(state.session.index, 1);
  assert.equal(state.session.done, false);
  for (const word of steps[1].targets) emit('session:select', word);
  emit('session:verify'); emit('session:exit');
  t.mock.timers.tick(2000); assert.equal(state.session.screen, 'recovery');
  assert.equal(state.session.index, 1);
});



test('dev skip is localhost-only and cancels a pending completion advance', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { state, emit } = harness(); await emit('session:start');
  window.location = { hostname: 'example.com' };
  emit('session:skip'); assert.equal(state.session.index, 0);
  window.location.hostname = 'localhost';
  for (const word of steps[0].targets) emit('session:select', word);
  emit('session:verify'); emit('session:skip');
  assert.equal(state.session.index, 1);
  t.mock.timers.tick(1000); assert.equal(state.session.index, 1);
  emit('session:settings', true); emit('session:skip'); assert.equal(state.session.index, 1);
  emit('session:settings', false); emit('session:skip'); assert.equal(state.session.index, 2);
  emit('session:skip'); assert.equal(state.session.index, 3);
  delete window.location;
});
