const AUTO_RELEASE_MS = 6000;
let active = null;
export function mountHold(surface, task, callbacks) {
  if (active?.task === task) return;
  unmountHold();
  active = { task, destroy: createController(surface, task, callbacks) };
}
export function unmountHold() {
  active?.destroy();
  active = null;
}
function createController(surface, task, { onComplete, onFill, onFull }) {
  let fill = 0;
  let pressed = false;
  let full = false;
  let completed = false;
  let fullAt = -1;
  let last = performance.now();
  let frame = requestAnimationFrame(tick);
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);
  function down(event) {
    if (completed || (event.button != null && event.button !== 0) || event.target.closest('button:not(.hold-button)')) return;
    pressed = true;
    surface.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function complete() {
    completed = true;
    onComplete();
  }
  function becomeFull(now) {
    full = true; fill = 1; fullAt = now;
    if (task.releaseOnCommand) onFull?.(); else complete();
  }
  function up(event) {
    if (!pressed) return;
    pressed = false;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (full && !completed) complete();
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const delta = Math.min(250, now - last);
    last = now;
    if (pressed && !full) { fill = Math.min(1, fill + delta / task.holdMs); if (fill >= 1) becomeFull(now); }
    else if (!pressed && !full) fill = Math.max(0, fill - delta / 400);
    if (full && !completed && now - fullAt > AUTO_RELEASE_MS) complete();
    onFill?.(fill);
  }
  return () => {
    cancelAnimationFrame(frame);
    surface.removeEventListener('pointerdown', down);
    surface.removeEventListener('pointerup', up);
    surface.removeEventListener('pointercancel', up);
  };
}
