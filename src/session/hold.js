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
  const radius = () => Math.min(75, Math.min(canvas.clientWidth, canvas.clientHeight) * 0.24);
  function down(event) {
    if (completed || (event.button != null && event.button !== 0)) return;
    const rect = canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    if (Math.hypot(dx, dy) > radius() * 1.5) return;
    pressed = true;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
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
    const breathe = 0.5 + 0.5 * Math.sin(now / 1200);
    const pulse = Math.pow(1 - beatPhase(now), 3);
    const accent = task.chamber ? '240,166,200' : '37,99,235';
    const rings = task.chamber ? ['rgba(240,166,200,0.14)', 'rgba(240,166,200,0.22)', 'rgba(240,166,200,0.32)'] : ['#e5eaf0', '#dbe3ed', '#c9d5e5'];
    context.clearRect(0, 0, width, height);
    [[rings[0], 1.5], [rings[1], 1.25], [rings[2], 1.02]].forEach(([color, factor]) => {
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.arc(cx, cy, r * factor, 0, Math.PI * 2);
      context.stroke();
    });
    context.beginPath();
    context.fillStyle = task.chamber ? 'rgba(255,255,255,0.06)' : '#ffffff';
    context.strokeStyle = task.chamber ? 'rgba(240,166,200,0.45)' : '#aeb8c5';
    context.lineWidth = 1;
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.lineWidth = 6;
    context.strokeStyle = `rgba(${accent},0.14)`;
    context.beginPath();
    context.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    context.stroke();
    if (fill > 0) {
      context.strokeStyle = `rgb(${accent})`;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(cx, cy, r * 0.8, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
      context.stroke();
    }
    const since = now - pulsedAt;
    if (pulsedAt >= 0 && since < 700) {
      context.globalAlpha = 1 - since / 700;
      context.lineWidth = 3;
      context.strokeStyle = `rgb(${accent})`;
      context.beginPath();
      context.arc(cx, cy, r * 0.8 + since / 700 * r * 0.7, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    const halo = 12 + breathe * 8 + pulse * 6;
    context.beginPath();
    context.fillStyle = `rgba(${accent},${0.08 + pulse * 0.08})`;
    context.arc(cx, cy, r * 0.17 + halo, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = pressed ? `rgb(${accent})` : `rgba(${accent},0.92)`;
    context.arc(cx, cy, r * (0.17 + (full ? 0.04 : 0)), 0, Math.PI * 2);
    context.fill();
    if (full) {
      context.fillStyle = `rgba(${accent},${0.7 + 0.3 * Math.sin(now / 120)})`;
      context.font = '700 16px system-ui, -apple-system, "Segoe UI", sans-serif';
      context.textAlign = 'center';
      context.fillText('RELEASE', cx, cy + r * 1.5 + 22);
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
