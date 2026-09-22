export function safetyControls(study, emit) {
  return html`
    <nav class="safety-controls" aria-label="Session controls">
      <button type="button" title=${study.settings.muted ? "Unmute audio" : "Mute audio"} onclick=${() => emit("settings:toggleMute")}>
        ${study.settings.muted ? volumeOffIcon() : volumeIcon()}
        <span>${study.settings.muted ? "Muted" : "Audio"}</span>
      </button>
      <button type="button" title=${study.paused ? "Resume session" : "Pause session"} onclick=${() => emit("study:togglePause")}>
        ${study.paused ? playIcon() : pauseIcon()}
        <span>${study.paused ? "Resume" : "Pause"}</span>
      </button>
      <button type="button" title="Session settings" onclick=${() => emit("settings:open")}>
        ${settingsIcon()}
        <span>Settings</span>
      </button>
      <button class="wake-control" type="button" title="End session and begin recovery" onclick=${() => emit("study:requestExit")}>
        ${powerIcon()}
        <span>Wake</span>
      </button>
    </nav>
  `;
}

function icon(body) {
  return html`
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${body}
    </svg>
  `;
}

function volumeIcon() {
  return icon(html`<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path>`);
}

function volumeOffIcon() {
  return icon(html`<path d="m11 5-5 4H2v6h4l5 4V5Z"></path><path d="m22 9-6 6"></path><path d="m16 9 6 6"></path>`);
}

function pauseIcon() {
  return icon(html`<path d="M8 5v14"></path><path d="M16 5v14"></path>`);
}

function playIcon() {
  return icon(html`<path d="m7 4 13 8-13 8V4Z"></path>`);
}

function settingsIcon() {
  return icon(html`<path d="M4 21v-7"></path><path d="M4 10V3"></path><path d="M12 21v-9"></path><path d="M12 8V3"></path><path d="M20 21v-5"></path><path d="M20 12V3"></path><path d="M1 14h6"></path><path d="M9 8h6"></path><path d="M17 16h6"></path>`);
}

function powerIcon() {
  return icon(html`<path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.8 0"></path>`);
}
