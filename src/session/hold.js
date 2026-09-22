import { beatPhase } from './audio.js';
let active = null;
export function mountHold(canvas, task, callbacks) {
  if (!canvas || !task) return;
  if (active?.canvas === canvas && active.taskId === task.id) return;
  unmountHold();
  active = { canvas, taskId: task.id, destroy: createController(canvas, task, callbacks).destroy };
}
export function unmountHold() {
  active?.destroy();
  active = null;
}
function createController(canvas, task, { onComplete, onFill, onPulse }) {
  const context = canvas.getContext('2d');
  let fill = 0;
  let pressed = false;
  let full = false;
  let completed = false;
  let cycles = task.progress || 0;
  let pulsedAt = -1;
  let last = performance.now();
  let frame = null;
  const observer = new ResizeObserver(resize);
  resize();
  observer.observe(canvas);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  frame = requestAnimationFrame(tick);
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  const radius = () => Math.min(canvas.clientWidth, canvas.clientHeight) * 0.19;
  function down(event) {
    if (completed || (event.button != null && event.button !== 0)) return;
    const rect = canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    if (Math.hypot(dx, dy) > radius() * 1.7) return;
    pressed = true;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (task.holdMs === 0) becomeFull(performance.now());
  }
  function becomeFull(now) {
    full = true; fill = 1; pulsedAt = now;
    onPulse?.();
  }
  function up(event) {
    if (!pressed) return;
    pressed = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!full) return;
    full = false; fill = 0; cycles++; task.progress = cycles;
    if (cycles >= task.cycles) { completed = true; onComplete(); }
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const delta = Math.min(40, now - last);
    last = now;
    if (pressed && !full) { fill = Math.min(1, fill + delta / task.holdMs); if (fill >= 1) becomeFull(now); }
    else if (!pressed && !full) fill = Math.max(0, fill - delta / 400);
    onFill?.(fill);
    draw(now);
  }
  function draw(now) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const cx = width / 2;
    const cy = height / 2;
    const r = radius();
    const beat = task.reduced ? 1 : beatPhase(now);
    const breathe = task.reduced ? 0 : Math.pow(1 - beat, 2) * 0.12;
    const palette = task.chamber
      ? { halo: 'rgba(226,150,196,', ring: '#f0a6c8', track: 'rgba(240,166,200,0.18)', dot: pressed ? '#ffd6ea' : '#e07aa8', text: 'rgba(240,200,220,0.75)' }
      : { halo: 'rgba(37,99,235,', ring: '#2563eb', track: 'rgba(37,99,235,0.14)', dot: pressed ? '#1d4ed8' : '#3b82f6', text: 'rgba(71,85,105,0.85)' };
    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.fillStyle = `${palette.halo}${0.05 + breathe * 0.5 + (pressed ? 0.05 : 0)})`;
    context.arc(cx, cy, r * (1.55 + breathe), 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 7;
    context.strokeStyle = palette.track;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.stroke();
    if (fill > 0) {
      context.strokeStyle = palette.ring;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
      context.stroke();
    }
    const since = now - pulsedAt;
    if (pulsedAt >= 0 && since < 700 && !task.reduced) {
      context.globalAlpha = 1 - since / 700;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(cx, cy, r + since / 700 * r * 0.9, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    context.beginPath();
    context.fillStyle = palette.dot;
    context.arc(cx, cy, r * (0.42 + (full ? 0.08 : 0)), 0, Math.PI * 2);
    context.fill();
    if (task.level !== 'symbol') {
      const hint = task.holdMs === 0 ? 'PRESS' : full ? 'RELEASE' : pressed ? 'HOLD' : cycles > 0 ? 'PRESS AGAIN' : 'PRESS AND HOLD';
      context.fillStyle = palette.text;
      context.font = '600 11px ui-monospace, monospace';
      context.textAlign = 'center';
      context.fillText(hint, cx, cy + r * 1.9);
    }
    if (task.cycles > 1) {
      for (let i = 0; i < task.cycles; i++) {
        context.beginPath();
        context.fillStyle = i < cycles ? palette.ring : palette.track;
        context.arc(cx + (i - (task.cycles - 1) / 2) * 14, cy + r * 2.3, 3.5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  function destroy() {
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
  }
  return { destroy };
}
