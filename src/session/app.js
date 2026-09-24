import { steps, stepIndex, acceptsSelection, acceptanceFor, meterAt, carrierAt } from './content.js';
import { planStimuli, runStimuli, spikeOf, effectsOf } from './stimuli.js';
import { startAudio, muteAudio, sound, setChamber, setBurst, setIntensity, setSurge, setClimax, setBeat, snap } from './audio.js';
import { mountTrace, unmountTrace } from '../trace/tracing.js';
import { mountHold, unmountHold } from './hold.js';
import { mountBackdrop, unmountBackdrop, setBackdrop, prepareBackdrop } from '../pixi/backdrop.js';
import { mountForeground, unmountForeground } from '../pixi/foreground.js';
import { mountGlitch, unmountGlitch, tear } from './glitch.js';
export const isLocalDev = () => ['localhost', '127.0.0.1', '[::1]'].includes(window.location?.hostname);
export function sessionStore(state, emitter) {
  const query = new URLSearchParams(window.location?.search || '');
  const fresh = () => ({ screen: 'play', index: 0, selected: [], feedback: '', rejected: null, done: false, starting: false, triggered: false, paused: false, settings: false, exiting: false, muted: query.get('audio') === '0', returnUrl: query.get('return') || '', line: 0, stimuli: [], carrier: false, traceTask: null, holdTask: null, duration: 0, timeline: [], spiking: false, prelude: false, stream: null, climax: 0, holdFill: 0, counted: false, waiting: false });
  state.session = fresh();
  let frame;
  let dialogOpen = false;
  let previousFocus = null;
  let advanceTimer = null;
  let lineTimer = null;
  let stimuliRun = null;
  let phaseStartedAt = null;
  let timeline = [];
  let carry = null;
  let spikeTimer = null;
  let preludeTimer = null;
  let streamTimer = null;
  let rejectTimer = null;
  let armed = false;
  let traceWind = 0;
  const s = () => state.session;
  const step = () => steps[s().index];
  const blocked = () => s().paused || s().settings || s().exiting;
  const active = () => s().screen === 'play' && !blocked() && !s().done;
  const render = () => { syncTimers(); emitter.emit('render'); };
  const holdStage = fill => (fill > 0) + (fill > 0.3) + (fill > 0.6) + (fill === 1);
  function cancelAdvance() { clearTimeout(advanceTimer); advanceTimer = null; }
  function scheduleAdvance() {
    if (s().screen !== 'play' || !s().done || blocked()) { cancelAdvance(); return; }
    if (advanceTimer === null) advanceTimer = setTimeout(() => { advanceTimer = null; emitter.emit('session:next'); }, 850);
  }
  function syncTimers() {
    const shouldArm = s().screen === 'play' && !blocked();
    if (shouldArm && !armed) arm();
    else if (!shouldArm && armed) disarm();
    scheduleAdvance();
  }
  function arm() {
    armed = true;
    stimuliRun = runStimuli(planStimuli(step(), carry), {
      show: entry => { s().stimuli = [...s().stimuli, { ...entry, shownAt: performance.now() }]; if (entry.mode === 'flash') tear(); else emitter.emit('render'); },
      hide: key => { const hidden = s().stimuli.find(item => item.key === key); s().stimuli = s().stimuli.filter(item => item.key !== key); if (hidden && hidden.mode !== 'flash') emitter.emit('render'); },
    });
    if (carry) { carry = null; spikeTimer = setTimeout(() => { spikeTimer = null; s().spiking = false; emitter.emit('render'); }, 1300); }
    if (step().lines && !s().done && (!step().trigger || s().triggered)) runLine();
    if (step().type === 'stream' && !s().done) {
      s().stream.startedAt = Date.now() - s().stream.elapsed;
      lineTimer = setTimeout(() => { lineTimer = null; finish('', true); }, step().ms - s().stream.elapsed);
      spawn();
    }
    if (step().type === 'burst' && !s().done) {
      lineTimer = setTimeout(() => { lineTimer = null; finish('', true); }, step().ms);
      s().prelude = true;
      preludeTimer = setTimeout(() => { preludeTimer = null; s().prelude = false; emitter.emit('render'); }, 300);
    }
  }
  function disarm() {
    if (armed && s().stream && !s().done) s().stream.elapsed = Date.now() - s().stream.startedAt;
    armed = false;
    stimuliRun?.stop(); stimuliRun = null;
    clearTimeout(lineTimer); lineTimer = null;
    clearTimeout(spikeTimer); spikeTimer = null;
    clearTimeout(preludeTimer); preludeTimer = null; s().prelude = false;
    clearTimeout(streamTimer); streamTimer = null;
    s().stimuli = [];
  }
  function runLine() {
    const current = step();
    const line = current.lines[s().line];
    if (line.kind === 'carrier') s().carrier = true;
    if (line.kind === 'carrier-off') s().carrier = false;
    if (line.kind === 'install') sound('install');
    if (line.kind === 'error') sound('retry');
    lineTimer = setTimeout(() => {
      lineTimer = null;
      if (s().line < current.lines.length - 1) { s().line++; emitter.emit('render'); runLine(); }
      else if (current.type === 'text') { if (current.gate) { s().waiting = true; emitter.emit('render'); } else finish('', true); }
      else { s().line = 0; emitter.emit('render'); runLine(); }
    }, line.ms);
  }
  function prepare() {
    cancelAdvance();
    disarm();
    const current = step();
    Object.assign(s(), { selected: [], feedback: '', rejected: null, done: false, starting: false, triggered: false, line: 0, stimuli: [], prelude: false });
    s().traceTask = current.type === 'trace' ? { ...current, progress: 0 } : null;
    s().stream = current.type === 'stream' ? { slots: [], spawned: 0, hits: 0, startedAt: null, elapsed: 0 } : null;
    s().climax = 0; s().holdFill = 0; s().counted = false; s().waiting = false;
    s().holdTask = current.type === 'hold' ? { ...current } : null;
    s().carrier = carrierAt(s().index);
    traceWind = 0;
  }
  function spawn() {
    const current = step(); const state = s().stream; const now = Date.now();
    const progress = Math.min(1, (now - state.startedAt) / current.ms);
    s().climax = progress;
    state.slots = state.slots.filter(slot => !slot.hit || now - slot.hitAt < 400);
    for (const slot of state.slots) if (!slot.hit && now - slot.born > 4500) { slot.hit = true; slot.hitAt = now; }
    while (state.slots.filter(slot => !slot.hit).length < 2 + Math.round(progress * 3)) {
      const taken = new Set(state.slots.map(slot => slot.cell));
      const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(cell => !taken.has(cell));
      if (!free.length) break;
      state.slots.push({ id: state.spawned, word: current.words[state.spawned % current.words.length], cell: free[(state.spawned * 5) % free.length], born: now, hit: false });
      state.spawned++;
    }
    emitter.emit('render');
    streamTimer = setTimeout(spawn, 1400 - progress * 850);
  }
  function finish(message, silent = false) {
    s().done = true; s().feedback = message; s().spiking = Boolean(spikeOf(step()));
    clearTimeout(lineTimer); lineTimer = null;
    clearTimeout(streamTimer); streamTimer = null;
    if (!silent) sound('accept');
    stimuliRun?.done();
    render();
  }
  function advance() {
    cancelAdvance();
    if (s().index === steps.length - 1) end();
    else { const previous = step().phase; carry = s().done ? spikeOf(step()) : null; s().index++; if (step().phase !== previous) closePhase(previous); prepare(); }
    render();
  }
  function closePhase(phase) {
    if (phaseStartedAt === null || phase.recovery) return;
    const now = Date.now();
    timeline.push({ title: phase.title, ms: now - phaseStartedAt });
    phaseStartedAt = now;
  }
  function recordRun() {
    const run = { at: new Date().toISOString(), duration: s().duration, timeline: s().timeline, steps: s().index + 1 };
    console.info('session', run);
    try { const runs = JSON.parse(localStorage.getItem('iamnotarobot.runs') || '[]'); runs.push(run); localStorage.setItem('iamnotarobot.runs', JSON.stringify(runs.slice(-20))); } catch {}
  }
  function end() {
    disarm();
    closePhase(step().phase);
    Object.assign(s(), { duration: timeline.reduce((total, entry) => total + entry.ms, 0), timeline: [...timeline] });
    recordRun();
    Object.assign(s(), { screen: 'end', carrier: false, exiting: false, paused: false, settings: false, done: false });
  }
  emitter.on('session:start', async () => {
    if (s().starting || s().triggered || !active() || (step().type !== 'checkbox' && step().trigger !== 'checkbox')) return;
    s().starting = true; emitter.emit('render');
    await Promise.race([startAudio(), new Promise(resolve => setTimeout(resolve, 1800))]);
    setTimeout(() => {
      if (!s().starting) return;
      s().starting = false;
      if (step().trigger) {
        s().triggered = true;
        sound('retry');
        if (armed && lineTimer === null) runLine();
        render();
        return;
      }
      const jump = s().index === 0 && isLocalDev() ? stepIndex(query.get('start') || '') : -1;
      if (phaseStartedAt === null) { phaseStartedAt = Date.now(); timeline = []; }
      s().index = jump > 0 ? jump : s().index + 1;
      prepare(); render();
    }, 900);
  });
  emitter.on('session:hit', id => {
    if (!active() || step().type !== 'stream') return;
    const slot = s().stream.slots.find(item => item.id === id && !item.hit);
    if (!slot) return;
    slot.hit = true; slot.hitAt = Date.now(); s().stream.hits++;
    const progress = s().climax;
    s().feedback = progress < 0.4 ? 'Approval issued.' : progress < 0.75 ? 'Full approval.' : 'Maximum approval.';
    sound(s().stream.hits % 5 === 0 ? 'confirm' : 'accept');
    render();
  });
  emitter.on('session:select', word => {
    if (!active()) return;
    if (step().type === 'sequence' || (step().type === 'hold' && !s().counted)) {
      const next = String(step().from - s().selected.length);
      if (word !== next) {
        s().rejected = word; s().feedback = `Out of sequence. Continue from ${next}.`; sound('retry');
        clearTimeout(rejectTimer); rejectTimer = setTimeout(() => { rejectTimer = null; s().rejected = null; emitter.emit('render'); }, 380);
        render(); return;
      }
      s().selected = [...s().selected, word]; s().rejected = null; s().feedback = '';
      if (word !== String(step().to)) { sound('select'); render(); }
      else if (step().type === 'hold') { s().counted = true; sound('confirm'); render(); }
      else finish(acceptanceFor(step()));
      return;
    }
    if (step().type !== 'cloud') return;
    s().selected = s().selected.includes(word) ? s().selected.filter(item => item !== word) : [...s().selected, word];
    s().feedback = ''; sound('select'); render();
  });
  emitter.on('session:verify', () => {
    if (!active() || step().type !== 'cloud') return;
    if (acceptsSelection(step(), s().selected)) finish(acceptanceFor(step()));
    else { s().feedback = step().symbolic ? 'Check the example and try again. Select every matching symbol.' : 'Check the category and try again. Select every matching word.'; sound('retry'); render(); }
  });
  emitter.on('session:traceComplete', () => { if (active() && step().type === 'trace') finish(acceptanceFor(step())); });
  emitter.on('session:holdComplete', () => { if (active() && step().type === 'hold') { snap(); finish(acceptanceFor(step())); } });
  emitter.on('session:next', () => { if (s().screen === 'play' && !blocked() && s().done) advance(); });
  emitter.on('session:skip', () => {
    if (!isLocalDev() || s().screen !== 'play' || blocked()) return;
    s().starting = false;
    unmountTrace(); unmountHold();
    advance();
  });
  emitter.on('session:pause', () => { if (s().screen === 'play') s().paused = !s().paused; render(); });
  emitter.on('session:settings', value => { s().settings = value; render(); });
  emitter.on('session:exitPrompt', value => { s().exiting = value; render(); });
  emitter.on('session:continue', () => { if (!active() || !s().waiting) return; s().waiting = false; finish('', true); });
  emitter.on('session:exit', () => {
    const target = stepIndex('recovery-permission');
    if (s().screen !== 'play' || s().index >= target || !step().phase.chamber) { end(); render(); return; }
    cancelAdvance(); closePhase(step().phase);
    Object.assign(s(), { exiting: false, settings: false, paused: false });
    s().index = target; prepare(); render();
  });
  emitter.on('session:restart', () => { const { muted, returnUrl } = s(); disarm(); phaseStartedAt = null; timeline = []; state.session = { ...fresh(), muted, returnUrl }; render(); });
  emitter.on('session:leave', () => { if (s().returnUrl) window.location.assign(s().returnUrl); });
  emitter.on('session:mute', () => { s().muted = !s().muted; render(); });
  function sync() {
    const session = s();
    const current = steps[session.index];
    const playing = session.screen === 'play';
    const suspended = blocked();
    const dialog = document.querySelector('.session-dialog');
    document.querySelector('.session-card')?.toggleAttribute('inert', suspended);
    if (dialog && !dialogOpen) {
      previousFocus = document.activeElement;
      dialog.querySelector('button, input')?.focus();
    } else if (!dialog && dialogOpen && previousFocus?.isConnected) previousFocus.focus();
    dialogOpen = Boolean(dialog);
    muteAudio(session.muted || suspended || !playing);
    setChamber(playing && session.carrier);
    const spiking = playing && !suspended && session.spiking;
    setIntensity(meterAt(session.index));
    setClimax(playing && !suspended && !session.done ? (current.type === 'stream' ? session.climax : current.type === 'hold' ? session.holdFill : 0) : 0);
    setBeat(playing && !suspended && !session.done ? (current.type === 'hold' ? session.holdFill : current.type === 'trace' ? traceWind : 0) : 0);
    setSurge(spiking && current.type !== 'burst');
    setBurst(playing && !suspended && current.type === 'burst' && !session.done, current.ms);
    const stageElement = document.getElementById(`stage-${current.id}`);
    const { burst, shutter } = effectsOf(session, current);
    const shuttering = shutter && !suspended;
    const backdrop = document.getElementById('backdrop-root');
    const idleHold = current.type === 'hold' && session.counted && !session.done && !session.holdFill;
    if (backdrop) mountBackdrop(backdrop, { paused: suspended || session.prelude, intensity: meterAt(session.index), ring: current.phase.ring, burst: current.type === 'burst' && !session.done ? 1 : spiking ? 0.7 : current.type === 'stream' && !session.done ? 0.25 + 0.75 * session.climax : current.type === 'hold' && !session.done ? session.holdFill : 0, fade: current.phase.recovery ? 0.1 : current.phase.id === 'close' ? 0.45 : idleHold ? 0.35 : current.type === 'trace' ? 0.55 : 1, stage: current.type === 'burst' ? null : stageElement, climax: current.type === 'stream' && !session.done, hue: shuttering && current.phase.chamber });
    else unmountBackdrop();
    const foreground = document.getElementById('foreground-root');
    if (foreground) mountForeground(foreground, { stimuli: () => s().stimuli, anchor: stageElement || document.querySelector('.readout'), chamber: current.phase.chamber, burstStage: current.type === 'burst', glitch: current.phase.glitch || 0, bandStage: stageElement, scanlines: current.phase.chamber && !current.phase.recovery ? (burst ? 0.5 : 1) : 0, shutter: shuttering, hue: shuttering && current.phase.chamber, frozen: suspended || session.prelude, release: Boolean(current.releaseOnCommand) && session.holdFill === 1 && !session.done, install: current.type === 'hold' });
    else unmountForeground();
    const stage = playing && !suspended && current.phase.glitch ? stageElement : null;
    if (stage) mountGlitch(stage, { intensity: current.phase.glitch }); else unmountGlitch();
    const running = playing && !suspended && !session.done;
    const traceCanvas = running && current.type === 'trace' ? document.getElementById('session-trace') : null;
    if (traceCanvas) {
      const task = session.traceTask;
      task.chamber = current.phase.chamber;
      mountTrace(traceCanvas, task, () => { if (s().traceTask === task) emitter.emit('session:traceComplete'); }, { onGrab: () => sound('select'), onWind: (progress, engage) => { traceWind = Math.round(progress * engage * 0.5 * 100) / 100; setBeat(traceWind); setBackdrop({ spin: engage * (2 + 9 * progress) }); } });
    } else { unmountTrace(); setBackdrop({ spin: 0 }); }
    const holdSurface = running && current.type === 'hold' && session.counted ? document.querySelector('.study-page') : null;
    if (holdSurface) {
      const task = session.holdTask;
      mountHold(holdSurface, task, { onComplete: () => { if (s().holdTask === task) emitter.emit('session:holdComplete'); }, onFill: fill => {
        setBackdrop({ contraction: fill });
        if (fill > 0) stimuliRun?.press();
        const level = Math.round(fill * 50) / 50;
        if (level === s().holdFill) return;
        const stage = holdStage(s().holdFill);
        s().holdFill = level;
        setClimax(level); setBeat(level); setBackdrop({ burst: level });
        document.querySelector('.hold-button').style.setProperty('--fill', level);
        if (holdStage(level) !== stage) emitter.emit('render');
      }, onFull: () => sound('confirm') });
    } else { unmountHold(); setBackdrop({ contraction: 0 }); }
  }
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
  emitter.on('render', schedule);
  emitter.on('DOMContentLoaded', () => {
    schedule();
    document.addEventListener('visibilitychange', () => { if (document.hidden && s().screen === 'play') { s().paused = true; render(); } });
    window.addEventListener('keydown', event => {
      const dialog = document.querySelector('.session-dialog');
      if (dialog && event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button:not(:disabled), input')];
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key === 'Escape' && s().screen === 'play') { s().paused = true; render(); }
    });
    prepareBackdrop();
  });
}
