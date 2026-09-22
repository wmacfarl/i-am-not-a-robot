import { currentStep } from "../state/study-flow.js";
import { completeView } from "./complete-view.js";
import { protocolView } from "./protocol-view.js";
import { recoveryView } from "./recovery-view.js";
import { setupView } from "./setup-view.js";
import { settingsModal } from "./settings-view.js";
import { safetyControls } from "./safety-controls.js";

export default function layout(state, emit) {
  const study = state.study;
  const step = currentStep(study);
  const showStimulus = study.screen === "protocol";

  return html`
    <body>
      <main class="study-page screen-${study.screen}">
        ${showStimulus ? html`<div id="stimulus-root" class="stimulus-backdrop"></div>` : ""}
        <div class="study-shell">
          ${renderScreen(study, step, emit)}
        </div>
        ${study.screen === "protocol" ? safetyControls(study, emit) : ""}
        ${settingsModal(study, emit)}
        ${study.exitConfirming ? exitConfirmation(emit) : ""}
        ${study.paused ? pauseOverlay(emit) : ""}
      </main>
    </body>
  `;
}

function renderScreen(study, step, emit) {
  if (study.screen === "setup") return setupView(study, emit);
  if (study.screen === "protocol") return protocolView(study, step, emit);
  if (study.screen === "recovery") return recoveryView(study, emit);
  if (study.screen === "complete") return completeView(study, emit);
  return html`<section class="study-card"><p>Loading protocol.</p></section>`;
}

function exitConfirmation(emit) {
  return html`
    <div class="modal-backdrop" role="presentation">
      <section class="modal-panel exit-panel" role="dialog" aria-modal="true" aria-labelledby="exit-title">
        <p class="screen-label">Session control</p>
        <h2 id="exit-title">End verification?</h2>
        <p>The task will stop and the recovery protocol will begin immediately.</p>
        <div class="modal-actions">
          <button class="primary-button" type="button" onclick=${() => emit("study:cancelExit")}>
            Continue session
          </button>
          <button class="text-button danger" type="button" onclick=${() => emit("study:exit")}>
            End and recover
          </button>
        </div>
      </section>
    </div>
  `;
}

function pauseOverlay(emit) {
  return html`
    <div class="modal-backdrop pause-backdrop" role="presentation">
      <section class="modal-panel pause-panel" role="dialog" aria-modal="true">
        <p class="screen-label">Protocol paused</p>
        <h2>Session paused</h2>
        <p>Timing and visual motion are suspended.</p>
        <button class="primary-button" type="button" onclick=${() => emit("study:togglePause")}>
          Resume session
        </button>
      </section>
    </div>
  `;
}
