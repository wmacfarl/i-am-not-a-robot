import { studyCopy } from "../data/copy.js";

export function settingsModal(study, emit) {
  if (!study.settingsOpen) return "";
  return html`
    <div class="modal-backdrop" role="presentation" onclick=${(event) => {
      if (event.target === event.currentTarget) emit("settings:close");
    }}>
      <section class="modal-panel settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="settings-header">
          <div>
            <p class="screen-label">Session controls</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button class="text-button" type="button" onclick=${() => emit("settings:close")}>Done</button>
        </header>
        <section class="settings-group">
          <h3>Visual intensity</h3>
          <div class="settings-segments">
            ${Object.entries(studyCopy.intensity).map(([value, option]) => html`
              <button
                class="settings-segment ${study.settings.visualMode === value ? "is-selected" : ""}"
                type="button"
                onclick=${() => emit("settings:setVisualMode", value)}
              >
                ${option.label}
              </button>
            `)}
          </div>
          <p>${studyCopy.intensity[study.settings.visualMode].detail}</p>
        </section>
        <section class="settings-group">
          <h3>Audio</h3>
          <button class="settings-toggle" type="button" onclick=${() => emit("settings:toggleMute")}>
            <span>Protocol audio</span>
            <span class="toggle-track ${study.settings.muted ? "" : "is-on"}"><span></span></span>
          </button>
        </section>
      </section>
    </div>
  `;
}
