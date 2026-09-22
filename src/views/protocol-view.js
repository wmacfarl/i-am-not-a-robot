import { classificationDiagnostics } from "../state/response-logic.js";
import { framedCard } from "./card-chrome.js";

export function protocolView(study, step, emit) {
  if (!step) return html`<section class="study-card"><p>Preparing verification.</p></section>`;

  const content =
    step.type === "gate"
      ? gateView(step, emit)
      : step.type === "round"
        ? roundView(study, step, emit)
        : step.type === "trace"
          ? traceView(study, step)
          : classificationView(study, step, emit);

  return framedCard(study, step, emit, content, {
    classes: `experience-card type-${step.type} mode-${step.mode || step.visualMode || "captcha"} ${
      study.answerLocked ? "is-locked" : ""
    }`,
  });
}

function roundView(study, step, emit) {
  const selected = new Set(study.round.selectedPositions);
  const expected = new Set(step.expected);
  const predicted = new Set(
    study.round.predictionShown ? study.round.predictedPositions : [],
  );
  const verified = study.round.phase === "verified";
  const status = roundStatus(study, step);

  return html`
    <div class="captcha-experience">
      <div class="machine-strip">
        <span>${machineState(study, step)}</span>
        <span>Sample ${study.stats.roundsCompleted + 1}</span>
      </div>

      <div class="captcha-instruction-row">
        <p class="captcha-instruction">${step.instruction}</p>
        ${step.inhibition ? html`<span class="inhibition-label">INHIBITION SAMPLE</span>` : ""}
      </div>

      <div
        class="captcha-grid-stage ${study.round.verifyReady ? "is-verify-ready" : ""} ${
          verified ? "is-verified" : ""
        }"
        style="--scan-ms: ${Math.max(700, step.verifyDelayMs)}ms"
      >
        <div class="grid-scan" aria-hidden="true"></div>
        <div class="captcha-grid" role="group" aria-label=${step.instruction}>
          ${step.tiles.map((tile) => {
            const active = selected.has(tile.position);
            const isExpected = expected.has(tile.position);
            const isPredicted = predicted.has(tile.position);
            const classes = [
              active ? "is-selected" : "",
              isPredicted ? "is-predicted" : "",
              verified && active && isExpected ? "is-accepted" : "",
              verified && active && !isExpected ? "is-mismatch" : "",
              verified && !active && isExpected ? "is-missed" : "",
              tile.kind === "text" ? "is-text" : "",
              tile.kind === "blank" ? "is-blank" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return html`
              <button
                class="captcha-tile ${classes}"
                type="button"
                disabled=${study.answerLocked}
                aria-pressed=${active ? "true" : "false"}
                aria-label=${tile.text || `${tile.kind} tile ${tile.position + 1}`}
                onclick=${() => emit("round:toggleTile", tile.position)}
              >
                ${tile.kind === "text"
                  ? html`<span class="tile-text">${tile.text}</span>`
                  : shapeGraphic(tile.kind)}
                <span class="selection-frame" aria-hidden="true"></span>
                ${isPredicted
                  ? html`<span class="prediction-mark" aria-hidden="true">PRED</span>`
                  : ""}
                <span class="tile-index" aria-hidden="true">${tile.position + 1}</span>
              </button>
            `;
          })}
        </div>
      </div>

      <div class="verification-cycle">
        <div class="cycle-status tone-${study.feedbackTone}" role="status">
          <span class="status-indicator ${verified ? "is-complete" : ""}"></span>
          <span>${status}</span>
        </div>
        <button
          class="cycle-verify ${study.round.verifyReady ? "is-open" : ""}"
          type="button"
          disabled=${study.answerLocked ||
          step.autoVerify ||
          !study.round.verifyReady ||
          selected.size === 0}
          onclick=${() => emit("round:verify")}
        >
          ${step.autoVerify
            ? study.round.phase === "auto-verifying"
              ? "Verifying"
              : "Automatic verification"
            : "Verify"}
        </button>
      </div>
    </div>
  `;
}

function traceView(study, step) {
  return html`
    <div class="captcha-experience trace-experience">
      <div class="machine-strip">
        <span>CONTINUOUS CONTROL VERIFICATION</span>
        <span>${step.mode === "guided" ? "GUIDANCE ACTIVE" : "GUIDANCE REDUCING"}</span>
      </div>
      <div class="captcha-instruction-row">
        <p class="captcha-instruction">${step.instruction}</p>
        <span class="center-cue-label">${step.cue}</span>
      </div>
      <div class="captcha-grid-stage trace-grid-stage">
        <canvas id="trace-canvas" aria-label="Trace the CENTER route"></canvas>
      </div>
      <div class="verification-cycle">
        <div class="cycle-status tone-${study.feedbackTone}" role="status">
          <span class="status-indicator ${study.feedback ? "is-complete" : ""}"></span>
          <span>${study.feedback || "TOUCH START / MAINTAIN CONTACT / COMPLETE AT CENTER"}</span>
        </div>
        <div class="trace-verification-label">LIVENESS PATH</div>
      </div>
    </div>
  `;
}

function classificationView(study, step, emit) {
  const diagnostics = classificationDiagnostics(study);
  return html`
    <div class="classification-content">
      <p class="screen-label">Behavioral classification model</p>
      <h2>${step.title}</h2>
      <div class="evidence-grid">
        ${evidence("First selection", `${diagnostics.meanFirstSelectionMs} ms`)}
        ${evidence(
          "Speed change",
          diagnostics.speedChange >= 0
            ? `${diagnostics.speedChange}% faster`
            : `${Math.abs(diagnostics.speedChange)}% slower`,
        )}
        ${evidence("Exact rounds", `${Math.round(diagnostics.exactRate * 100)}%`)}
        ${evidence("Prediction match", `${Math.round(diagnostics.predictionRate * 100)}%`)}
      </div>
      <div class="model-result">
        <span>BEHAVIORAL MODEL</span>
        <strong>ROBOT</strong>
        <p>
          Repeated spatial response and prediction evidence exceed the current human-verification
          threshold.
        </p>
      </div>
      <p class="classification-statement">${step.statement}</p>
      <div class="classification-options">
        ${step.options.map((option) => {
          const selected = study.classificationChoice === option.id;
          return html`
            <button
              class="classification-option ${selected ? "is-selected" : ""}"
              type="button"
              disabled=${study.answerLocked}
              aria-pressed=${selected ? "true" : "false"}
              onclick=${() => emit("classification:select", option.id)}
            >
              <span class="classification-box">${selected ? checkIcon() : ""}</span>
              <span>${option.label}</span>
            </button>
          `;
        })}
      </div>
      <div class="classification-footer">
        <p class="classification-feedback tone-${study.feedbackTone}">
          ${study.feedback || "SELF-REPORT DOES NOT CHANGE THE BEHAVIORAL RECORD"}
        </p>
        <button
          class="cycle-verify is-open"
          type="button"
          disabled=${study.answerLocked || !study.classificationChoice}
          onclick=${() => emit("classification:confirm")}
        >
          Record response
        </button>
      </div>
    </div>
  `;
}

function gateView(step, emit) {
  return html`
    <div class="gate-content">
      <div class="captcha-seal ${step.mode === "center" ? "is-center" : ""}" aria-hidden="true">
        <span class="seal-checkbox">${checkIcon()}</span>
        <span class="seal-grid"></span>
      </div>
      <p class="screen-label">${step.gate === "consent" ? "Content transition" : "Protocol update"}</p>
      <h2>${step.title}</h2>
      <p class="gate-statement">${step.statement}</p>
      <button class="gate-button" type="button" onclick=${() => emit("study:continue")}>
        ${step.button}
      </button>
      ${step.gate !== "complete"
        ? html`
            <button class="gate-decline" type="button" onclick=${() => emit("study:requestExit")}>
              End the session
            </button>
          `
        : ""}
    </div>
  `;
}

function roundStatus(study, step) {
  if (study.feedback) return study.feedback;
  if (study.round.phase === "auto-verifying") return "EXPECTED RESPONSE RECEIVED";
  if (step.autoVerify) return "CENTER CUE ACTIVE / RESPONSE EXPECTED";
  if (study.round.verifyReady) return "VERIFICATION WINDOW OPEN";
  if (study.round.predictionShown) return "PREDICTED POSITIONS DISPLAYED";
  return "RESPONSE SCAN IN PROGRESS";
}

function machineState(study, step) {
  if (study.round.phase === "verified") return "RESPONSE MODEL UPDATED";
  if (step.autoVerify) return "AUTOMATIC VERIFICATION";
  if (study.round.verifyReady) return "VERIFY READY";
  return "ADAPTIVE CAPTCHA / SCAN ACTIVE";
}

function evidence(label, value) {
  return html`
    <div class="evidence-cell">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function shapeGraphic(kind) {
  return html`
    <span class="tile-shape shape-${kind}" aria-hidden="true">
      ${kind === "grid" ? html`<span></span><span></span><span></span><span></span>` : ""}
    </span>
  `;
}

function checkIcon() {
  return html`
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6"></path>
    </svg>
  `;
}
