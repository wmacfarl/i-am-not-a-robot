import { acts, taskCount, taskNumberAt } from "../data/phases.js";
import { totalProgress } from "../state/study-flow.js";

export function framedCard(study, step, emit, content, options = {}) {
  const act = acts[step?.act] || acts.human;
  const progress = Math.round(totalProgress(study) * 100);
  const taskNumber = taskNumberAt(study.stepIndex);

  return html`
    <section class="study-card protocol-card ${options.classes || ""}">
      <header class="card-header">
        <div class="card-header-row">
          <span class="step-badge">${act.number}</span>
          <div class="card-heading">
            <p class="card-label">${act.label}</p>
            <p class="card-phase">${step?.phase || "Protocol"}</p>
          </div>
          <div class="card-meta">
            <span>${step?.type === "gate" ? "INTERIM PROTOCOL" : `TASK ${taskNumber} / ${taskCount}`}</span>
            <span class="classification-label">${act.classification}</span>
          </div>
        </div>
        <div class="card-bar" aria-label="Session progress">
          <div class="card-bar-fill" style="width: ${progress}%"></div>
        </div>
      </header>
      <div class="card-body">${content}</div>
      <footer class="card-footer">
        <span class="card-footer-note">${shieldIcon()} Local response record</span>
        <span>Study ID: ${studyId(study)}</span>
      </footer>
    </section>
  `;
}

function studyId(study) {
  const raw = study.session?.id || "";
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return String(10000 + (hash % 90000));
}

function shieldIcon() {
  return html`
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>
      <path d="m9 12 2 2 4-4"></path>
    </svg>
  `;
}
