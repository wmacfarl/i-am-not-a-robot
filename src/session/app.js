import { steps, stepIndex, acceptsSelection, acceptanceFor, meterAt } from './content.js';
import { planStimuli, runStimuli } from './stimuli.js';
import { startAudio, muteAudio, sound, setChamber, setBurst } from './audio.js';
import { mountTrace, unmountTrace } from '../trace/tracing.js';
import { mountHold, unmountHold } from './hold.js';
import { mountSpiral, unmountSpiral, setSpiral } from './spiral.js';
import { mountGlitch, unmountGlitch, tear } from './glitch.js';
export const isLocalDev = () => ['localhost', '127.0.0.1', '[::1]'].includes(window.location?.hostname);
export function sessionStore(state, emitter) {
  const query = new URLSearchParams(window.location?.search || '');
  const fresh = () => ({ screen: 'play', index: 0, selected: [], feedback: '', rejected: null, done: false, starting: false, triggered: false, paused: false, settings: false, exiting: false, muted: query.get('audio') === '0', returnUrl: query.get('return') || '', line: 0, stimuli: [], carrier: false, traceTask: null, holdTask: null });
  state.session = fresh();
  let frame;
  let dialogOpen = false;
  let previousFocus = null;
  let advanceTimer = null;
  let lineTimer = null;
  let stimuliRun = null;
  let rejectTimer = null;
  let armed = false;
  const s = () => state.session;
  const step = () => steps[s().index];
  const blocked = () => s().paused || s().settings || s().exiting;
  const active = () => s().screen === 'play' && !blocked() && !s().done;
  const render = () => { syncTimers(); emitter.emit('render'); };
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
    stimuliRun = runStimuli(planStimuli(step()), {
      show: entry => { s().stimuli = [...s().stimuli, entry]; if (entry.mode === 'flash') tear(); emitter.emit('render'); },
      hide: key => { s().stimuli = s().stimuli.filter(item => item.key !== key); emitter.emit('render'); },
    });
    if (step().lines && !s().done && (!step().trigger || s().triggered)) runLine();
    if (step().type === 'burst' && !s().done) lineTimer = setTimeout(() => { lineTimer = null; finish('', true); }, step().ms);
  }
  function disarm() {
    armed = false;
    stimuliRun?.stop(); stimuliRun = null;
    clearTimeout(lineTimer); lineTimer = null;
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
      else if (current.type === 'text') finish('', true);
      else { s().line = 0; emitter.emit('render'); runLine(); }
    }, line.ms);
  }
  function prepare() {
    cancelAdvance();
    disarm();
    const current = step();
    Object.assign(s(), { selected: [], feedback: '', rejected: null, done: false, starting: false, triggered: false, line: 0, stimuli: [] });
    s().traceTask = current.type === 'trace' ? { ...current, progress: 0 } : null;
    s().holdTask = current.type === 'hold' ? { ...current, progress: 0 } : null;
    if (current.phase.carrier !== undefined) s().carrier = current.phase.carrier;
  }
  function finish(message, silent = false) {
    s().done = true; s().feedback = message;
    clearTimeout(lineTimer); lineTimer = null;
    if (!silent) sound('accept');
    stimuliRun?.done();
    render();
  }
  function advance() {
    cancelAdvance();
    if (s().index === steps.length - 1) end();
    else { s().index++; prepare(); }
    render();
  }
  function end() {
    disarm();
    Object.assign(s(), { screen: 'end', carrier: false, exiting: false, paused: false, settings: false, done: false });
  }
  emitter.on('session:start', async () => {
    if (s().starting || s().triggered || !active() || (step().type !== 'checkbox' && step().trigger !== 'checkbox')) return;
    s().starting = true; emitter.emit('render');
    await Promise.race([startAudio(), new Promise(resolve => setTimeout(resolve, 1800))]);
    muteAudio(s().muted);
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
      const jump = isLocalDev() ? stepIndex(query.get('start') || '') : -1;
      s().index = jump > 0 ? jump : s().index + 1;
      prepare(); render();
    }, 900);
  });
  emitter.on('session:select', word => {
    if (!active()) return;
    if (step().type === 'sequence') {
      const next = String(step().from - s().selected.length);
      if (word !== next) {
        s().rejected = word; s().feedback = `Out of sequence. Continue from ${next}.`; sound('retry');
        clearTimeout(rejectTimer); rejectTimer = setTimeout(() => { rejectTimer = null; s().rejected = null; emitter.emit('render'); }, 380);
        render(); return;
      }
      s().selected = [...s().selected, word]; s().rejected = null; s().feedback = '';
      if (word === String(step().to)) finish(acceptanceFor(step())); else { sound('select'); render(); }
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
  emitter.on('session:holdComplete', () => { if (active() && step().type === 'hold') finish(acceptanceFor(step())); });
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
  emitter.on('session:exit', () => { end(); render(); });
  emitter.on('session:restart', () => { const { muted, returnUrl } = s(); disarm(); state.session = { ...fresh(), muted, returnUrl }; render(); });
  emitter.on('session:leave', () => { if (s().returnUrl) window.location.assign(s().returnUrl); });
  emitter.on('session:mute', () => { s().muted = !s().muted; muteAudio(s().muted); render(); });
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
    setBurst(playing && !suspended && current.type === 'burst');
    const spiral = document.getElementById('session-spiral');
    if (spiral) mountSpiral(spiral, { paused: suspended, intensity: meterAt(session.index), ring: current.phase.ring, burst: current.type === 'burst' ? 1 : 0, fade: current.phase.id === 'close' ? 0.45 : current.type === 'trace' ? 0.55 : 1 });
    else unmountSpiral();
    const stage = playing && !suspended && current.phase.glitch ? document.getElementById(`stage-${current.id}`) : null;
    if (stage) mountGlitch(stage, { intensity: current.phase.glitch }); else unmountGlitch();
    const running = playing && !suspended && !session.done;
    const traceCanvas = running && current.type === 'trace' ? document.getElementById('session-trace') : null;
    if (traceCanvas) {
      const task = session.traceTask;
      task.chamber = current.phase.chamber;
      mountTrace(traceCanvas, task, () => { if (s().traceTask === task) emitter.emit('session:traceComplete'); });
    } else unmountTrace();
    const holdCanvas = running && current.type === 'hold' ? document.getElementById('session-hold') : null;
    if (holdCanvas) {
      const task = session.holdTask;
      task.chamber = current.phase.chamber;
      mountHold(holdCanvas, task, { onComplete: () => { if (s().holdTask === task) emitter.emit('session:holdComplete'); }, onFill: fill => setSpiral({ contraction: fill }), onPulse: () => sound('pulse') });
    } else { unmountHold(); setSpiral({ contraction: 0 }); }
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
  });
}
