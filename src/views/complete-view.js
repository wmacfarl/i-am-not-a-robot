export function completeView(study, emit) {
  const durationMinutes =
    study.session.startedAt && study.session.completedAt
      ? Math.max(1, Math.round((study.session.completedAt - study.session.startedAt) / 60000))
      : null;

  return html`
    <section class="study-card study-card-narrow complete-card">
      <div class="complete-check large">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6"></path>
        </svg>
      </div>
      <p class="screen-label">Session complete</p>
      <h1>Recovery complete</h1>
      <p>Your attention is clear and the verification interface is closed.</p>
      ${durationMinutes ? html`<p class="completion-meta">Session duration: ${durationMinutes} minutes</p>` : ""}
      <button class="secondary-button" type="button" onclick=${() => emit("study:restart")}>
        Return to start
      </button>
    </section>
  `;
}
