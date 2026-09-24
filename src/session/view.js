import { steps, phases, symbols, glyphOf, arrangeWords, firstChamberIndex, meterAt, installedAt } from './content.js';
import { isLocalDev } from './app.js';
const verificationId = String(10000 + (Date.now() % 90000));
const canvases = new Map();
const clock = ms => { const total = Math.round(ms / 1000); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`; };
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
const checkIcon = (size = 22) => html`<svg viewBox="0 0 24 24" width=${size} height=${size} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>`;
const crossIcon = (size = 15) => html`<svg viewBox="0 0 24 24" width=${size} height=${size} fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>`;
const shieldIcon = () => html`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 1.6l5 2v3.9c0 3-2.2 4.8-5 5.6C5.2 12.3 3 10.5 3 7.5V3.6l5-2z"></path></svg>`;
const gearIcon = () => html`<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.7 2.4h2.6l.4 2.1c.5.2 1 .5 1.4.8l2-.7 1.3 2.2-1.6 1.4c.1.5.1 1.1 0 1.6l1.6 1.4-1.3 2.2-2-.7c-.4.3-.9.6-1.4.8l-.4 2.1H8.7l-.4-2.1c-.5-.2-1-.5-1.4-.8l-2 .7-1.3-2.2 1.6-1.4a6 6 0 0 1 0-1.6L3.6 6.8l1.3-2.2 2 .7c.4-.3.9-.6 1.4-.8l.4-2.1Z"></path><circle cx="10" cy="10" r="2.5"></circle></svg>`;

export function sessionView(state, emit) {
  const s = state.session;
  const step = steps[s.index];
  const playing = s.screen === 'play';
  const chamber = playing ? step.phase.chamber : true;
  const recovery = playing && Boolean(step.phase.recovery);
  const level = step.level;
  const busy = s.paused || s.settings || s.exiting;
  const interrupted = s.stimuli.find(entry => entry.mode === 'interrupted');
  const flashes = s.stimuli.filter(entry => entry.mode === 'flash');
  const phaseNumber = playing ? phases.indexOf(step.phase) + 1 : phases.length;
  const meter = playing ? meterAt(s.index) : 1;
  const installed = playing ? installedAt(s.index) : ['OPEN', 'OBEY', 'PLEASE'];
  const progress = chamber ? meter : s.index / firstChamberIndex;
  const scatter = [[-1.6, 1], [0.2, 1.3], [1.5, 0.9], [-0.7, 1.1], [1.1, 0.85], [-1.3, 1.2], [0.5, 1]];
  const spikeSpots = [[24, 22, 0.9], [76, 30, 0.85], [28, 74, 0.9], [74, 70, 0.85], [50, 14, 0.8], [22, 50, 0.85], [78, 52, 0.8], [50, 86, 0.8]];
  const flashLayer = () => [...flashes].reverse().map(entry => {
    const parts = entry.key.split(':');
    if (parts[parts.length - 2] === 'spike') {
      const [x, y, scale] = spikeSpots[(Number(parts[parts.length - 1]) || 0) % spikeSpots.length];
      return html`<div id=${`stim-${entry.key}`} class="stim-flash is-spike" style=${`--ms:${entry.ms}ms; --x:${x}%; --y:${y}%; --scale:${scale}`} aria-hidden="true"><b>${entry.text}</b></div>`;
    }
    const [dy, scale] = step.type !== 'burst' ? [0, 1] : entry.ms >= 800 ? [0, 1.15] : scatter[(Number(parts[parts.length - 2]) || 0) % scatter.length];
    const long = entry.text.length > 18;
    return html`<div id=${`stim-${entry.key}`} class="stim-flash" style=${`--ms:${entry.ms}ms; --dy:${long ? dy / 2 : dy}em; --scale:${scale}; --fit:${long ? 0.72 : 1}`} aria-hidden="true"><b>${entry.text}</b></div>`;
  });
  const cue = command => {
    if (!command) return step.example ? html`<span class="center-cue-label cue-example"><span>Example</span>${glyph(step.example, 26)}</span>` : '';
    if (level === 'full') return html`<span class="center-cue-label">${glyph(command, 16)}${symbols[command].word}${step.example ? glyph(step.example, 22) : ''}</span>`;
    if (level === 'word') return html`<span class="command-label">${glyph(command, 30)}${step.label || symbols[command].word}${step.example ? glyph(step.example, 30) : ''}</span>`;
    return html`<span class="command-label is-symbol">${glyph(command, 48)}${step.example ? glyph(step.example, 48) : ''}</span>`;
  };
  const instructionRow = (prompt = step.prompt, command = step.command) => html`<div class="captcha-instruction-row ${level === 'symbol' ? 'is-symbol' : ''} ${level === 'full' ? 'is-full' : ''}">${cue(command)}${level === 'full' ? html`<p class="captcha-instruction">${prompt}</p>` : ''}</div>`;
  const numberTile = n => { const accepted = s.selected.includes(n); return html`<button class="captcha-tile is-text is-number ${accepted ? 'is-accepted' : ''} ${s.rejected === n ? 'is-rejected' : ''}" type="button" disabled=${s.done || accepted} aria-label=${n} onclick=${() => emit('session:select', n)}><span class="tile-text">${n}</span><span class="selection-frame" aria-hidden="true"></span></button>`; };
  const statusText = () => (s.done ? (interrupted ? interrupted.text : s.feedback) : s.feedback);
  const statusTone = () => (s.done ? 'accepted' : s.feedback ? 'retry' : '');
  const cycleStatus = () => { const text = statusText(); return html`<div class="cycle-status tone-${statusTone()} ${text ? '' : 'is-empty'}" role="status" aria-live="polite">${text ? html`<span class="status-indicator ${s.done ? 'is-complete' : ''}"></span><span id=${`status-${s.done ? 'done' : 'retry'}`}>${text}</span>` : ''}</div>`; };
  const robotCheck = ({ checked, failed, checking, onclick, label = 'I am not a robot' }) => html`<button class="robot-check ${checked ? 'is-checked' : ''} ${failed ? 'is-failed' : ''} ${checking ? 'is-checking' : ''}" type="button" disabled=${!onclick || checking} aria-label=${label} onclick=${onclick || null}><span class="custom-check" aria-hidden="true">${checked && !checking ? (failed ? crossIcon(15) : checkIcon(15)) : ''}</span><span class="robot-check-label">${label}</span><span class="robot-check-brand" aria-hidden="true"><span class="seal-mini"><span class="seal-mini-box"></span><span class="seal-mini-grid"></span></span><span>Verification<br />Privacy · Terms</span></span></button>`;
  const content = () => {
    if (step.type === 'checkbox') return html`<div class="gate-content robot-gate">
      <div class="captcha-seal" aria-hidden="true"><span class="seal-checkbox">${checkIcon()}</span><span class="seal-grid"></span></div>
      <p class="screen-label">${step.screen || 'Automated verification'}</p>
      <h2>${step.heading || 'Verification required.'}</h2>
      ${robotCheck({ checked: s.starting, failed: false, checking: s.starting, label: step.label, onclick: () => emit('session:start') })}
      <p class="muted-text robot-gate-note">${s.starting ? (step.label ? 'Confirming…' : 'Verifying…') : (step.note || 'Confirm to continue.')}</p>
    </div>`;
    if (step.type === 'text') {
      const armed = !step.trigger || s.triggered;
      const visible = armed ? step.lines.slice(0, s.line + 1) : [];
      const current = armed ? step.lines[s.line] : null;
      const from = visible.reduce((start, line, index) => (line.kind === 'title' ? index : start), 0);
      const readout = visible.slice(from).filter(line => ['status', 'title', 'error', 'carrier', 'carrier-off'].includes(line.kind));
      const failed = visible.some(line => line.kind === 'error');
      const lastFlash = [...visible].reverse().find(line => line.kind === 'flash');
      const headline = !current ? null : current.kind === 'flash' ? { label: 'Response model', word: current.text, text: 'Previously observed fragment.' }
        : current.kind === 'claim' ? { label: 'Response model', word: lastFlash?.text || 'ROBOT', text: current.text }
        : current.kind === 'install' ? { label: 'Protocol status', word: step.installs || 'UNIT', text: current.text }
        : current.kind === 'reveal' ? { label: 'Protocol status', word: step.installs || 'UNIT', text: html`${visible.find(line => line.kind === 'install')?.text}<br />${current.text}` }
        : null;
      return html`<div class="classification-content readout">
        ${flashLayer()}
        <p class="screen-label">${step.phase.title}</p>
        ${step.trigger === 'checkbox' ? robotCheck({ checked: s.triggered || s.starting, failed, checking: s.starting, onclick: armed || s.starting ? null : () => emit('session:start') }) : ''}
        ${step.trigger && !armed ? html`<p class="muted-text robot-gate-note">${s.starting ? 'Verifying…' : 'Confirm to continue.'}</p>` : ''}
        ${readout.length ? html`<div class="diagnostic-lines" aria-live="polite">${readout.map(line => html`<p class="line-${line.kind} ${line === current ? 'is-current' : ''}">${line.text}</p>`)}</div>` : ''}
        ${headline ? html`<div class="model-result ${current?.kind === 'flash' ? 'is-flash' : ''}" id=${`headline-${s.line}`}><span>${headline.label}</span><strong>${headline.word}</strong><p>${headline.text}</p></div>` : ''}
        ${s.waiting && step.gate ? html`<button class="gate-button" type="button" onclick=${() => emit('session:continue')}>${step.gate}</button>` : ''}
      </div>`;
    }
    if (step.type === 'cloud') return html`<div class="captcha-experience">
        ${instructionRow()}
        <div class="captcha-grid-stage ${s.done ? 'is-verified' : s.selected.length ? 'is-verify-ready' : ''}" id=${`stage-${step.id}`} style="--scan-ms: 2200ms">
          <div class="grid-scan" aria-hidden="true"></div>
          <div class="captcha-grid" role="group" aria-label=${step.prompt}>${arrangeWords(step.words, s.index).map((word, index) => { const active = s.selected.includes(word); return html`<button class="captcha-tile ${active ? 'is-selected' : ''} ${s.done && active ? 'is-accepted' : ''} ${step.symbolic ? 'is-shape' : 'is-text'}" type="button" disabled=${s.done} aria-pressed=${active ? 'true' : 'false'} aria-label=${step.symbolic ? `symbol ${glyphOf(word)}` : word} onclick=${() => emit('session:select', word)}>${step.symbolic ? html`<span class="tile-shape">${glyph(word, 52)}</span>` : html`<span class="tile-text">${word}</span>`}<span class="selection-frame" aria-hidden="true"></span><span class="tile-index" aria-hidden="true">${index + 1}</span></button>`; })}</div>
          ${flashLayer()}
        </div>
        <div class="verification-cycle has-action">
          ${cycleStatus()}
          <button class="cycle-verify ${!s.done && s.selected.length ? 'is-open' : ''}" type="button" disabled=${s.done || !s.selected.length} onclick=${() => emit('session:verify')}>${chamber ? 'Accept' : 'Verify'}</button>
        </div>
      </div>`;
    if (step.type === 'sequence') {
      const numbers = arrangeWords(Array.from({ length: step.from - step.to + 1 }, (_, i) => String(step.from - i)), s.index);
      return html`<div class="captcha-experience">
        ${instructionRow()}
        <div class="captcha-grid-stage ${s.done ? 'is-verified' : ''}" id=${`stage-${step.id}`} style="--scan-ms: 2200ms">
          <div class="grid-scan" aria-hidden="true"></div>
          <div class="captcha-grid" role="group" aria-label=${step.prompt}>${numbers.map(numberTile)}</div>
          ${flashLayer()}
        </div>
        <div class="verification-cycle">${cycleStatus()}</div>
      </div>`;
    }
    if (step.type === 'stream') {
      const cells = Array.from({ length: 9 }, (_, cell) => (s.stream ? s.stream.slots : []).find(slot => slot.cell === cell) || null);
      return html`<div class="captcha-experience stream-experience">
      ${instructionRow()}
      <div class="captcha-grid-stage" id=${`stage-${step.id}`}>
        <div class="captcha-grid" role="group" aria-label="Respond to every word that appears">${cells.map(slot => html`<button class="captcha-tile is-text stream-tile ${slot ? 'has-word' : ''} ${slot && slot.hit ? 'is-hit' : ''}" type="button" disabled=${!slot || slot.hit} aria-label=${slot ? slot.word : 'empty'} onclick=${slot ? () => emit('session:hit', slot.id) : null}>${slot ? html`<span class="tile-text" id=${`word-${slot.id}`}>${slot.word}</span>` : ''}<span class="selection-frame" aria-hidden="true"></span></button>`)}</div>
        ${flashLayer()}
      </div>
      <div class="verification-cycle">${cycleStatus()}</div>
    </div>`;
    }
    if (step.type === 'burst') return html`<div class="captcha-experience burst-experience">
      <div class="captcha-instruction-row"><p class="captcha-instruction">Optical programming channel active.</p></div>
      <div class="captcha-grid-stage burst-stage" id=${`stage-${step.id}`}>${flashLayer()}</div>
      <div class="verification-cycle">${cycleStatus()}</div>
    </div>`;
    if (step.type === 'trace') return html`<div class="captcha-experience trace-experience">
      ${instructionRow()}
      <div class="captcha-grid-stage trace-grid-stage" id=${`stage-${step.id}`}>${canvas('session-trace', { 'aria-label': 'Hold near the marker and lead it along the route.' })}${flashLayer()}</div>
      <div class="verification-cycle">${cycleStatus()}</div>
    </div>`;
    if (step.type === 'hold') {
      const rest = arrangeWords(Array.from({ length: step.from - step.to }, (_, i) => String(step.from - i)), s.index);
      const numbers = [...rest.slice(0, 4), String(step.to), ...rest.slice(4)];
      const button = html`<button class="captcha-tile hold-button ${s.holdFill > 0 && !s.done ? 'is-holding' : ''} ${s.holdFill === 1 ? 'is-full' : ''}" type="button" disabled=${s.done} style=${`--fill:${s.holdFill}`}>${step.button}</button>`;
      return html`<div class="captcha-experience">
        ${s.counted ? instructionRow() : instructionRow(step.countPrompt, 'count')}
        <div class="captcha-grid-stage install-stage ${s.counted ? 'is-counted' : ''}" id=${`stage-${step.id}`}>
          <div class="captcha-grid" role="group" aria-label=${s.counted ? step.prompt : step.countPrompt}>${numbers.map((n, index) => (index === 4 && s.counted ? button : numberTile(n)))}</div>
          ${flashLayer()}${step.releaseOnCommand && s.holdFill === 1 && !s.done ? html`<div class="stim-flash release-command" aria-live="assertive"><b>RELEASE</b></div>` : ''}
        </div>
        <div class="verification-cycle">${cycleStatus()}</div>
      </div>`;
    }
    return '';
  };
  const card = () => html`<section class="study-card test-card experience-card ${chamber ? 'pulse-card mode-center' : ''} task-${step.type} ${s.done ? 'is-complete' : ''}" aria-label="Verification session">
    <div class="card-header">
      <div class="card-header-row">
        <div class="step-badge">${phaseNumber}</div>
        <div class="card-label">Section ${phaseNumber} of ${phases.length} · ${step.phase.title}</div>
        <div class="card-header-tools">
          <button class="settings-trigger" type="button" title="Session settings" aria-label="Session settings" onclick=${() => emit('session:settings', true)}>${gearIcon()}</button>
          <span class="header-tool-divider"></span>
          <div class="card-count">${chamber ? `Programming ${Math.round(meter * 100)}%` : `Task ${Math.max(1, s.index)} of ${firstChamberIndex - 1}`}</div>
        </div>
      </div>
      <div class="card-bar" role="progressbar" aria-label=${chamber ? 'Programming progress' : 'Verification progress'} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(progress * 100)}><div class="card-bar-fill" style=${`width:${progress * 100}%`}></div></div>
    </div>
    <div class="card-body">${content()}</div>
    <div class="card-footer">
      <span class="card-footer-note">${shieldIcon()} ${chamber ? (installed.length ? installed.map(name => `${name}: active`).join(' · ') : 'No programs installed') : 'No responses are stored.'}</span>
      <span>Verification ID: ${verificationId}</span>
    </div>
  </section>`;
  const endCard = () => html`<section class="study-card study-card-narrow complete-card">
    <p class="screen-label">Connection terminated</p>
    <p>The programming session has closed.</p>
    <p>Unit placed in standby.</p>
    ${s.duration ? html`<div class="session-log"><p class="session-log-total"><span>Session length</span><span>${clock(s.duration)}</span></p>${s.timeline.map(entry => html`<p><span>${entry.title}</span><span>${clock(entry.ms)}</span></p>`)}</div>` : ''}
    <p class="completion-meta">Verification ID: ${verificationId}</p>
    ${s.returnUrl ? html`<button class="secondary-button" type="button" onclick=${() => emit('session:leave')}>Return</button>` : html`<button class="secondary-button" type="button" onclick=${() => emit('session:restart')}>Reconnect</button>`}
  </section>`;
  const overlay = () => {
    if (s.paused && !s.settings && !s.exiting) return html`<div class="modal-backdrop pause-backdrop" role="presentation"><section class="modal-panel pause-panel" role="dialog" aria-modal="true" aria-label="Paused"><p class="screen-label">Protocol paused</p><h2>Session paused</h2><p>Timing and visual motion are suspended.</p><button class="primary-button" type="button" onclick=${() => emit('session:pause')}>Resume session</button></section></div>`;
    return html`<div class="settings-backdrop" role="presentation" onclick=${event => { if (event.target === event.currentTarget && !s.exiting) emit('session:settings', false); }}>
      <section class="settings-panel session-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="settings-panel-header"><h2 id="settings-title">Session settings</h2><button class="settings-close" type="button" onclick=${() => { emit('session:exitPrompt', false); emit('session:settings', false); }}>Done</button></header>
        <section class="settings-group"><h3>Audio</h3><button class="settings-toggle" type="button" onclick=${() => emit('session:mute')}><span>Protocol audio</span><span class="toggle-track ${s.muted ? '' : 'is-on'}"><span></span></span></button></section>
        <section class="settings-group"><h3>Session</h3>${s.exiting
          ? html`<div class="finish-confirmation"><p class="finish-confirmation-title">Are you sure?</p><p class="finish-confirmation-text">This will end the current session.</p><div class="finish-confirmation-actions"><button class="gate-button" type="button" onclick=${() => emit('session:exitPrompt', false)}>Stay in session</button><button class="gate-decline" type="button" onclick=${() => emit('session:exit')}>Leave session</button></div></div>`
          : html`<button class="gate-decline" type="button" onclick=${() => emit('session:exitPrompt', true)}>End the session.</button>`}</section>
      </section>
    </div>`;
  };
  return html`<body class="${chamber ? 'is-chamber' : ''} ${playing && (step.type === 'burst' || s.spiking || (step.type === 'hold' && !s.done && s.holdFill > 0.3)) ? 'is-burst' : ''} ${playing && ((step.type === 'burst' && !s.prelude && !s.done) || (step.type === 'stream' && !s.done && s.climax > 0.75) || (step.type === 'hold' && !s.done && s.holdFill > 0.6)) ? 'is-shutter' : ''} ${s.prelude ? 'is-prelude' : ''} ${playing && step.type === 'stream' && !s.done ? 'is-climax' : ''} ${recovery ? 'is-recovery' : ''}" style=${`--glitch:${playing ? step.phase.glitch || 0 : 0}`}><main class="study-page screen-${s.screen}"><div class="shutter" aria-hidden="true"></div><div class="hue-flash" aria-hidden="true"></div>
    ${playing && chamber && !recovery ? canvas('session-spiral', { class: 'pulse-backdrop', 'aria-hidden': 'true' }) : ''}
    <div class="study-shell">${playing ? card() : endCard()}</div>
    ${playing && isLocalDev() ? html`<button class="dev-skip debug-jump-btn" type="button" disabled=${busy} onclick=${() => emit('session:skip')}>Skip · dev</button>` : ''}
    ${busy ? overlay() : ''}
  </main></body>`;
}
