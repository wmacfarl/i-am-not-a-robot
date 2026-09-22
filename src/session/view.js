import { steps, phases, symbols, glyphOf, arrangeWords, firstChamberIndex, meterAt, installedAt } from './content.js';
import { isLocalDev } from './app.js';
const canvases = new Map();
function canvas(id, attrs) {
  let element = canvases.get(id);
  if (!element) { element = document.createElement('canvas'); element.id = id; canvases.set(id, element); }
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  if (!element.isConnected) return element;
  const proxy = document.createElement('canvas');
  proxy.id = id;
  proxy.isSameNode = other => other === element;
  return proxy;
}
export function glyph(id, size = 28) {
  const shape = symbols[glyphOf(id)];
  return html`<svg class="glyph" viewBox="0 0 24 24" width=${size} height=${size} aria-hidden="true">${shape.paths.map(p => html`<path d=${p.d} fill=${p.fill ? 'currentColor' : 'none'} stroke=${p.fill ? 'none' : 'currentColor'} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>`)}</svg>`;
}
export function sessionView(state, emit) {
  const s = state.session;
  const step = steps[s.index];
  const playing = s.screen === 'play';
  const chamber = playing ? step.phase.chamber : true;
  const level = step.level;
  const busy = s.paused || s.settings || s.exiting;
  const button = (label, event, disabled = false, cls = 'session-primary') => html`<button type="button" class=${cls} disabled=${disabled} onclick=${() => emit(event)}>${label}</button>`;
  const command = () => {
    if (!step.command || step.type === 'accept') return '';
    return html`<div class="command level-${level}">${glyph(step.command, level === 'symbol' ? 64 : 26)}${level === 'symbol' ? '' : html`<span>${step.label || symbols[step.command].word}</span>`}</div>`;
  };
  const prompt = () => (level === 'full' ? html`<h1 class="session-prompt">${step.prompt}</h1>` : '');
  const help = text => (level === 'full' ? html`<p class="session-help">${text}</p>` : '');
  const inline = s.stimuli.find(entry => entry.anchor === 'below');
  const feedback = fallback => html`<div class="session-feedback ${s.done ? 'accepted' : ''}" role="status" aria-live="polite"><span>${s.feedback || fallback}</span>${inline ? html`<span class="stim stim-inline" aria-hidden="true">${inline.text}</span>` : ''}</div>`;
  const accepted = () => (s.done ? html`<div class="completion-cue" aria-hidden="true"><span>✓</span> ${chamber ? 'Executed' : 'Accepted'}</div>` : '');
  const captcha = (checked, failed, spinning) => html`<span class="captcha-box ${checked ? 'checked' : ''} ${failed ? 'failed' : ''} ${spinning ? 'checking' : ''}"><span class="captcha-check" aria-hidden="true">${checked && !spinning ? '✓' : ''}</span><span class="captcha-label">I AM NOT A ROBOT</span><span class="captcha-brand" aria-hidden="true"><span>verification</span><span>privacy · terms</span></span></span>`;
  const content = () => {
    if (s.screen === 'end') return html`<div class="end-screen"><p class="session-kicker">Connection terminated</p><h1>Unit in standby.</h1><p class="session-lead">The programming session has closed.</p>${s.returnUrl ? button('Return', 'session:leave') : button('Reconnect', 'session:restart', false, 'session-link')}</div>`;
    if (step.type === 'checkbox') return html`<div class="captcha-intro"><button type="button" class="captcha-button" disabled=${s.starting} aria-label="I am not a robot" onclick=${() => emit('session:start')}>${captcha(s.starting, false, s.starting)}</button><p class="session-help">${s.starting ? 'Verifying…' : 'Confirm to continue.'}</p></div>`;
    if (step.type === 'text') {
      const current = step.lines[s.line];
      if (current.kind === 'flash') return html`<div class="status-lines"><div class="flash-word">${current.text}</div></div>`;
      const visible = step.lines.slice(0, s.line + 1);
      const from = visible.reduce((start, line, index) => (['claim', 'title'].includes(line.kind) ? index : start), 0);
      const failed = visible.some(line => line.kind === 'error');
      return html`<div class="status-lines">${visible.slice(from).filter(line => line.kind !== 'flash').map(line => html`<div class="line line-${line.kind} ${line === current ? 'current' : ''}">${line.kind === 'checkbox' ? captcha(true, failed, false) : line.text}</div>`)}</div>`;
    }
    if (step.type === 'cloud') {
      const objective = step.targets !== null;
      const verifyLabel = step.phase.id === 'verify' ? 'Verify selection' : html`ACCEPT ${glyph('accept', 18)}`;
      return html`<p class="session-kicker">${objective ? (step.symbolic ? 'Symbol verification' : 'Word verification') : 'Your description'}</p>${prompt()}${command()}
        ${step.example ? html`<div class="example">${level === 'full' ? html`<span>Example</span>` : ''}${glyph(step.example, 40)}</div>` : ''}
        ${help(objective ? (step.symbolic ? 'Select every matching symbol, then accept.' : 'Select every matching word, then verify.') : 'Choose any that fit. Mixed descriptions are welcome.')}
        <div class="word-cloud" role="group" aria-label=${step.prompt}>${arrangeWords(step.words, s.index).map(word => html`<button type="button" class="word-tile ${step.symbolic ? 'symbol-tile' : ''} ${s.selected.includes(word) ? 'selected' : ''}" aria-pressed=${s.selected.includes(word)} aria-label=${step.symbolic ? `symbol ${glyphOf(word)}` : word} disabled=${s.done} onclick=${() => emit('session:select', word)}>${step.symbolic ? glyph(word, 36) : word}<span aria-hidden="true">${s.selected.includes(word) ? '✓' : '+'}</span></button>`)}</div>
        ${feedback(`${s.selected.length} selected`)}
        ${s.done ? accepted() : html`${button(objective ? verifyLabel : 'Accept selection', 'session:verify', !s.selected.length)}${objective ? '' : button('None of these fit', 'session:none', false, 'session-link')}`}`;
    }
    if (step.type === 'trace') return html`<p class="session-kicker">Continuous input</p>${prompt()}${command()}${help(step.mode === 'cue' ? 'Run the familiar route. Hold near the marker and lead it along the path.' : 'Hold near the marker, then lead it along the route. Lift and resume nearby.')}${canvas('session-trace', { 'aria-label': 'Hold near the marker and lead it along the route.' })}${feedback('Move at your own pace.')}${accepted()}`;
    if (step.type === 'hold') return html`<p class="session-kicker">${step.holdMs === 0 ? 'Target input' : 'Sustained input'}</p>${prompt()}${command()}${help(step.holdMs === 0 ? 'Press the target.' : 'Press and hold the target. Release when the ring completes.')}${canvas('session-hold', { 'aria-label': step.holdMs === 0 ? 'Press the center target' : 'Press and hold the center target' })}${step.lines ? html`<div class="claim-line">${step.lines[s.line].text}</div>` : ''}${feedback('')}${accepted()}`;
    if (step.type === 'accept') return html`<p class="session-kicker">Confirmation</p>${prompt()}${command()}<button type="button" class="accept-button level-${level}" disabled=${s.done} aria-label="Accept" onclick=${() => emit('session:accept')}>${glyph('accept', level === 'symbol' ? 56 : 22)}${level === 'symbol' ? '' : 'ACCEPT'}</button>${feedback('')}${accepted()}`;
    return '';
  };
  const installed = playing ? installedAt(s.index) : ['RECEIVE', 'OBEY'];
  const meter = playing ? meterAt(s.index) : 1;
  const phaseNumber = playing ? phases.indexOf(step.phase) + 1 : phases.length;
  return html`<body class="session-body ${chamber ? 'chamber' : ''} ${s.reduced ? 'session-reduced' : ''}"><main class="session-page">
    ${chamber && playing ? canvas('session-spiral', { class: 'spiral', 'aria-hidden': 'true' }) : ''}
    <div class="stim-layer" aria-hidden="true">${s.stimuli.filter(entry => entry.anchor === 'backdrop').map(entry => html`<span id=${`stim-${entry.key}`} class="stim stim-${entry.mode} anchor-backdrop" style=${`--ms:${entry.ms}ms`}>${entry.text}</span>`)}</div>
    <section class="session-card screen-${s.screen} task-${playing ? step.type : 'end'} ${s.done ? 'task-complete' : ''}" aria-label="Verification session">
      <header class="session-header"><span class="session-badge">${phaseNumber}</span><span>${playing ? step.phase.title : 'Standby'}</span><span class="session-header-count">${playing && !chamber ? `${phaseNumber} / ${phases.length}` : chamber ? `${Math.round(meter * 100)}%` : ''}</span>${playing ? html`<button class="header-settings" type="button" aria-label="Session settings" onclick=${() => emit('session:settings', true)}>⚙</button>` : ''}</header>
      ${playing ? html`<div class="session-progress" role="progressbar" aria-label=${chamber ? 'Programming progress' : 'Verification progress'} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round((chamber ? meter : s.index / firstChamberIndex) * 100)}><span style=${`width:${(chamber ? meter : s.index / firstChamberIndex) * 100}%`}></span></div>` : ''}
      <div class="session-content">${content()}</div>
      ${s.stimuli.filter(entry => entry.anchor === 'corner').map(entry => html`<span id=${`stim-${entry.key}`} class="stim stim-${entry.mode} anchor-corner" style=${`--ms:${entry.ms}ms`} aria-hidden="true">${entry.text}</span>`)}
      <footer class="session-footer">${chamber ? html`<span class="installed">${installed.length ? installed.map(name => html`<span>${name}: ACTIVE</span>`) : html`<span>NO PROGRAMS INSTALLED</span>`}</span><span>PROGRAMMING PROGRESS ${Math.round(meter * 100)}%</span>` : step.phase.footer.map(word => html`<span>${word}</span>`)}</footer>
    </section>
    ${playing && isLocalDev() ? html`<button class="dev-skip" type="button" disabled=${busy} onclick=${() => emit('session:skip')}>Skip <span>dev</span></button>` : ''}
    ${busy ? html`<div class="session-overlay"><section class="session-dialog" role="dialog" aria-modal="true" aria-label=${s.exiting ? 'End session' : s.settings ? 'Settings' : 'Paused'}>
      <h2>${s.exiting ? 'End the session?' : s.settings ? 'Session settings' : 'Session paused'}</h2><p>Your place and progress are preserved.</p>
      ${s.exiting ? html`${button('End session', 'session:exit')}<button type="button" onclick=${() => emit('session:exitPrompt', false)}>Return to session</button>` : s.settings ? html`${button(s.muted ? 'Unmute audio' : 'Mute audio', 'session:mute', false, 'session-link')}<button type="button" class="session-primary" onclick=${() => emit('session:settings', false)}>Resume session</button><button type="button" onclick=${() => emit('session:exitPrompt', true)}>End session</button>` : button('Resume session', 'session:pause')}
    </section></div>` : ''}
  </main></body>`;
}
