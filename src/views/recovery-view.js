import { studyCopy } from "../data/copy.js";

export function recoveryView(study, emit) {
  const step = studyCopy.recovery[Math.min(study.recovery.step, studyCopy.recovery.length - 1)];
  if (step.button) {
    return html`
      <section class="study-card study-card-narrow recovery-card">
        <p class="screen-label">Recovery protocol</p>
        <p class="recovery-text">${step.text}</p>
        <button
          class="gate-button"
          type="button"
          onclick=${() => emit(step.last ? "recovery:finish" : "recovery:advance")}
        >
          ${step.button}
        </button>
      </section>
    `;
  }

  return html`
    <section class="recovery-stage">
      <p class="recovery-step" id="recovery-${study.recovery.step}">${step.text}</p>
    </section>
  `;
}
