import { studyCopy } from "../data/copy.js";

export function setupView(study, emit) {
  return html`
    <section class="study-card setup-card">
      <header class="setup-header">
        <div class="verification-mark" aria-hidden="true">
          <span class="verification-box"></span>
          <span class="verification-grid"></span>
        </div>
        <div>
          <p class="institution-line">Automated Behavior Research Unit</p>
          <h1>${studyCopy.title}</h1>
          <p class="subtitle">${studyCopy.subtitle}</p>
        </div>
      </header>

      <div class="setup-body">
        <section class="setup-section">
          <h2>Session information</h2>
          <p>${studyCopy.purpose}</p>
          <div class="disclosure">
            ${studyCopy.disclosure.map((line) => html`<p>${line}</p>`)}
          </div>
        </section>

        <section class="setup-section">
          <div class="section-heading">
            <h2>Visual intensity</h2>
            <span>Can be changed during the session</span>
          </div>
          <div class="intensity-options" role="radiogroup" aria-label="Visual intensity">
            ${Object.entries(studyCopy.intensity).map(([value, option]) =>
              intensityOption(value, option, study, emit),
            )}
          </div>
          ${study.settings.visualMode === "flashing"
            ? html`
                <p class="flash-warning">
                  Flashing mode adds contained rhythmic flashes. Do not use it if you are sensitive
                  to flashing lights or have a seizure condition.
                </p>
              `
            : ""}
        </section>

        <label class="consent-check">
          <input
            type="checkbox"
            checked=${study.setupAccepted}
            onchange=${(event) => emit("setup:accept", event.target.checked)}
          />
          <span class="custom-check" aria-hidden="true"></span>
          <span>I am at least 18, I understand the content above, and I want to continue.</span>
        </label>

        <button
          class="primary-action"
          type="button"
          disabled=${!study.setupAccepted}
          onclick=${() => emit("study:start")}
        >
          Start human verification
        </button>
      </div>

      <footer class="setup-footer">
        <span>Participation is voluntary.</span>
        <span>Local session / no data transmitted</span>
      </footer>
    </section>
  `;
}

function intensityOption(value, option, study, emit) {
  const selected = study.settings.visualMode === value;
  return html`
    <button
      class="intensity-option ${selected ? "is-selected" : ""}"
      type="button"
      role="radio"
      aria-checked=${selected ? "true" : "false"}
      onclick=${() => emit("settings:setVisualMode", value)}
    >
      <span class="intensity-label">${option.label}</span>
      <span class="intensity-detail">${option.detail}</span>
    </button>
  `;
}
