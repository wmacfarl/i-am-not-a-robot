import { steps, sections, acceptsSelection, arrangeWords, recovery } from './content.js';
import { startAudio, muteAudio, sound } from './audio.js';
import { mountTrace, unmountTrace } from '../trace/tracing.js';
import { mountStimulus, unmountStimulus, pulseStimulus } from '../pixi/stimulus.js';
const isLocalDev = () => ['localhost', '127.0.0.1', '[::1]'].includes(window.location?.hostname);
export function sessionStore(state, emitter) {
  const fresh = () => ({ screen: 'intro', index: 0, selected: [], feedback: '', done: false, paused: false, settings: false, exiting: false, muted: false, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, recoveryIndex: 0, traceTask: null });
  state.session = fresh();
  let frame;
  let starting = false;
  let dialogOpen = false;
  let previousFocus = null;
  let advanceTimer = null;
  const s = () => state.session;
  const render = () => { scheduleAdvance(); emitter.emit('render'); };
  const blocked = () => s().paused || s().settings || s().exiting;
  const active = () => s().screen === 'play' && !blocked() && !s().done;
  function cancelAdvance() { clearTimeout(advanceTimer); advanceTimer = null; }
  function scheduleAdvance() {
    if (s().screen !== 'play' || !s().done || blocked()) { cancelAdvance(); return; }
    if (advanceTimer === null) advanceTimer = setTimeout(() => {
      advanceTimer = null;
      emitter.emit('session:next');
    }, 850);
  }
  function prepare() {
    cancelAdvance();
    s().selected = []; s().feedback = ''; s().done = false;
    const step = steps[s().index];
    s().traceTask = step?.type === 'trace' ? { ...step, progress: 0 } : null;
  }
  emitter.on('session:start', async () => {
    if (starting || s().screen !== 'intro') return;
    starting = true;
    await Promise.race([startAudio(), new Promise(resolve => setTimeout(resolve, 1800))]);
    starting = false;
    muteAudio(s().muted);
    s().screen = 'play'; prepare(); render();
  });
  emitter.on('session:select', word => {
    if (!active() || steps[s().index].type !== 'cloud') return;
    s().selected = s().selected.includes(word) ? s().selected.filter(item => item !== word) : [...s().selected, word];
    s().feedback = ''; sound('select'); render();
  });
  function finish(message) {
    s().done = true; s().feedback = message; sound('accept'); pulseStimulus(0.8); render();
  }
  emitter.on('session:traceComplete', () => {
    if (active() && steps[s().index].type === 'trace') finish(steps[s().index].id === 'robot-repeat' ? 'Correct. Robot response accepted.' : 'Correct.');
  });
  emitter.on('session:verify', () => {
    if (!active()) return;
    const step = steps[s().index];
    if (step.type !== 'cloud') return;
    if (acceptsSelection(step, s().selected)) finish(s().index < 4 ? 'Correct. Human response accepted.' : 'Correct.');
    else { s().feedback = 'Check the category and try again. Select every matching word.'; sound('retry'); render(); }
  });
  emitter.on('session:none', () => {
    if (!active() || steps[s().index].targets !== null) return;
    s().selected = []; finish('Response accepted.');
  });
  emitter.on('session:next', () => {
    if (s().screen !== 'play' || blocked()) return;
    const step = steps[s().index];
    if (step.type !== 'gate' && !s().done) return;
    cancelAdvance();
    if (s().index === steps.length - 1) s().screen = 'recovery';
    else { s().index++; prepare(); }
    render();
  });
  emitter.on('session:skip', () => {
    if (!isLocalDev() || s().screen !== 'play' || blocked()) return;
    cancelAdvance();
    unmountTrace();
    if (s().index === steps.length - 1) s().screen = 'recovery';
    else { s().index++; prepare(); }
    render();
  });
  emitter.on('session:pause', () => { if (s().screen === 'play') s().paused = !s().paused; render(); });
  emitter.on('session:settings', value => { s().settings = value; render(); });
  emitter.on('session:exitPrompt', value => { s().exiting = value; render(); });
  emitter.on('session:exit', () => { s().screen = 'recovery'; s().recoveryIndex = 0; s().exiting = false; s().paused = false; s().settings = false; render(); });
  emitter.on('session:recover', () => { if (s().screen !== 'recovery') return; if (++s().recoveryIndex >= recovery.length) s().screen = 'complete'; render(); });
  emitter.on('session:restart', () => { const { muted, reduced } = s(); state.session = { ...fresh(), muted, reduced }; render(); });
  emitter.on('session:mute', () => { s().muted = !s().muted; muteAudio(s().muted); render(); });
  function sync() {
    const session = s();
    const playing = session.screen === 'play' && !!document.getElementById('session-stimulus');
    const suspended = blocked();
    const dialog = document.querySelector('.session-dialog');
    document.querySelector('.session-card')?.toggleAttribute('inert', suspended);
    if (dialog && !dialogOpen) {
      previousFocus = document.activeElement;
      dialog.querySelector('button, input')?.focus();
    } else if (!dialog && dialogOpen && previousFocus?.isConnected) previousFocus.focus();
    dialogOpen = Boolean(dialog);
    muteAudio(session.muted || suspended || !playing);
    if (playing) mountStimulus(document.getElementById('session-stimulus'), { depth: session.index / (steps.length - 1), visualMode: session.reduced ? 'reduced' : 'standard', paused: suspended || session.reduced, act: session.index > 21 ? 'center' : 'human', mode: 'center', selectedPositions: [], predictedPositions: [] });
    else unmountStimulus();
    if (playing && !suspended && !session.done && steps[session.index].type === 'trace') {
      const task = session.traceTask;
      task.mode = steps[session.index].mode;
      task.reduced = session.reduced;
      mountTrace(document.getElementById('session-trace'), task, () => {
        if (s().traceTask === task) emitter.emit('session:traceComplete');
      });
    } else unmountTrace();
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

export function sessionView(state, emit) {
  const s = state.session;
  const step = steps[s.index];
  const playing = s.screen === 'play';
  const button = (label, event, disabled = false, cls = 'session-primary') => html`<button type="button" class=${cls} disabled=${disabled} onclick=${() => emit(event)}>${label}</button>`;
  const content = () => {
    if (s.screen === 'intro') return html`
      <div class="session-mark" aria-hidden="true">✓</div><p class="session-kicker">Automated Verification Service</p>
      <h1>I am not a robot.</h1><p class="session-lead">Complete a sequence of word and movement tasks to continue.</p>
      <div class="session-disclosure"><strong>Before you begin</strong><p>Fictional adult robot-transformation roleplay with automatic-response and programming themes.</p><p>Allow 10–15 minutes, at your pace. No responses are saved or transmitted.</p></div>
      
      
      ${button('Begin verification', 'session:start')}<p class="session-note">Pause, change settings, or end at any time.</p>`;
    if (s.screen === 'recovery') return html`<p class="session-kicker">Session closing · ${s.recoveryIndex + 1} / ${recovery.length}</p><h1>Return at your own pace.</h1><p class="session-lead recovery-copy">${recovery[s.recoveryIndex]}</p>${button(s.recoveryIndex === recovery.length - 1 ? 'Finish session' : 'Continue when ready', 'session:recover')}`;
    if (s.screen === 'complete') return html`<div class="session-mark">✓</div><p class="session-kicker">Session closed</p><h1>You’re all done.</h1><p class="session-lead">Thank you for playing. Take a moment before returning to other activities.</p>${button('Return to start', 'session:restart')}`;
    if (step.type === 'gate') return html`<p class="session-kicker">${step.sectionTitle}</p><h1>${step.title}</h1><p class="session-lead">${step.text}</p>${button(step.button, 'session:next')}`;
    return html`<p class="session-kicker">${step.type === 'cloud' ? step.targets === null ? 'Your description' : 'Word verification' : 'Continuous input'}</p><h1 class="session-prompt">${step.prompt}</h1>
      ${step.type === 'cloud' ? html`<p class="session-help">${step.targets === null ? 'Choose any that fit. Mixed descriptions are welcome.' : 'Select every matching word, then verify.'}</p><div class="word-cloud" role="group" aria-label=${step.prompt}>${arrangeWords(step.words, s.index).map(word => html`<button type="button" class="word-tile ${s.selected.includes(word) ? 'selected' : ''}" aria-pressed=${s.selected.includes(word)} disabled=${s.done} onclick=${() => emit('session:select', word)}>${word}<span aria-hidden="true">${s.selected.includes(word) ? '✓' : '+'}</span></button>`)}</div>` : html`<p class="session-help">${step.mode === 'cue' ? 'Run the familiar route. Hold near the marker and lead it along the path.' : 'Hold near the blue marker, then lead it along the route. It follows gently. Lift and resume nearby.'}</p><canvas id="session-trace" aria-label="Hold near the marker and lead it along the route."></canvas>`}
      <div class="session-feedback ${s.done ? 'accepted' : ''}" role="status" aria-live="polite">${s.feedback || (step.type === 'cloud' ? `${s.selected.length} selected` : 'Move at your own pace.')}</div>
      ${s.done ? html`<div class="completion-cue" aria-hidden="true"><span>✓</span> Accepted</div>` : step.type === 'cloud' ? html`${button(step.targets === null ? 'Accept selection' : 'Verify selection', 'session:verify', !s.selected.length)}${step.targets === null ? button('None of these fit', 'session:none', false, 'session-link') : ''}` : ''}`;
  };
  return html`<body class="session-body ${s.reduced ? 'session-reduced' : ''}"><main class="session-page">
    ${playing ? html`<div id="session-stimulus" class="stimulus-backdrop" aria-hidden="true"></div>` : ''}
    <section class="session-card screen-${s.screen} task-${playing ? step.type : s.screen} ${s.done ? 'task-complete' : ''}" aria-label="Verification session"><header class="session-header"><span class="session-badge">${playing ? step.sectionIndex + 1 : '✓'}</span><span>${playing ? step.sectionTitle : 'Automated Verification Service'}</span><span class="session-header-count">${playing ? `${step.sectionIndex + 1} / ${sections.length}` : 'Local session'}</span>${playing ? html`<button class="header-settings" type="button" aria-label="Session settings" onclick=${() => emit('session:settings', true)}>⚙</button>` : ''}</header>
    ${playing ? html`<div class="session-progress" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax=${steps.length} aria-valuenow=${s.index}><span style=${`width:${s.index / steps.length * 100}%`}></span></div>` : ''}
    <div class="session-content">${content()}</div><footer class="session-footer"><span>Participation is voluntary</span><span>No data collected</span></footer></section>
    ${playing && isLocalDev() ? html`<button class="dev-skip" type="button" disabled=${s.paused || s.settings || s.exiting} onclick=${() => emit('session:skip')}>Skip <span>dev</span></button>` : ''}
    ${s.paused || s.settings || s.exiting ? html`<div class="session-overlay"><section class="session-dialog" role="dialog" aria-modal="true" aria-label=${s.exiting ? 'End session' : s.settings ? 'Settings' : 'Paused'}>
      <h2>${s.exiting ? 'End the session?' : s.settings ? 'Session settings' : 'Session paused'}</h2><p>Your place and tracing progress are preserved.</p>
      ${s.exiting ? html`${button('End and reorient', 'session:exit')}<button onclick=${() => emit('session:exitPrompt', false)}>Return to session</button>` : s.settings ? html`${button(s.muted ? 'Unmute audio' : 'Mute audio', 'session:mute', false, 'session-link')}<button class="session-primary" onclick=${() => emit('session:settings', false)}>Resume session</button><button type="button" onclick=${() => emit('session:exitPrompt', true)}>End session</button>` : button('Resume session', 'session:pause')}
    </section></div>` : ''}
  </main></body>`;
}



