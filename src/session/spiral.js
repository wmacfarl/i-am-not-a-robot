import { beatPhase } from './audio.js';
let canvas = null;
let context = null;
let frame = null;
let observer = null;
let started = 0;
const state = { contraction: 0, intensity: 0.5, ring: [], paused: false, reduced: false, fade: 1 };
export function mountSpiral(element, next = {}) {
  if (element !== canvas) {
    unmountSpiral();
    canvas = element;
    context = element.getContext('2d');
    started = performance.now();
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(element);
  }
  Object.assign(state, next);
  if (state.paused) { cancelAnimationFrame(frame); frame = null; }
  else if (frame === null) frame = requestAnimationFrame(draw);
}
export function setSpiral(next) { Object.assign(state, next); }
export function unmountSpiral() {
  cancelAnimationFrame(frame);
  observer?.disconnect();
  frame = null; observer = null; canvas = null; context = null;
}
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function draw(now) {
  frame = requestAnimationFrame(draw);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const t = (now - started) / 1000;
  const beat = state.reduced ? 1 : beatPhase(now);
  const pulse = state.reduced ? 0 : Math.pow(1 - beat, 3);
  const cx = width / 2;
  const cy = height / 2;
  const scale = (1 - 0.32 * state.contraction) * (1 + pulse * 0.035);
  const rotation = state.reduced ? 0 : t * (0.3 + state.contraction * 1.1) * state.fade;
  const alpha = state.fade * (0.28 + state.intensity * 0.5);
  context.fillStyle = '#07060d';
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.55);
  glow.addColorStop(0, `rgba(160,60,120,${state.fade * (0.22 + pulse * 0.2 + state.contraction * 0.2)})`);
  glow.addColorStop(1, 'rgba(7,6,13,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  const maxRadius = Math.hypot(width, height) * 0.62;
  const thetaMax = 5.5 * Math.PI * 2;
  for (let arm = 0; arm < 3; arm++) {
    context.beginPath();
    for (let theta = 0; theta <= thetaMax; theta += 0.06) {
      const radius = (4 + theta / thetaMax * maxRadius) * scale;
      const angle = theta + rotation + arm * Math.PI * 2 / 3;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (theta === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.strokeStyle = `rgba(226,150,196,${alpha})`;
    context.lineWidth = 2.2 + state.contraction * 1.5;
    context.stroke();
  }
  if (!state.ring.length) return;
  const radius = Math.min(width, height) * 0.44;
  context.save();
  context.translate(cx, cy);
  context.rotate(state.reduced ? 0 : -t * 0.045);
  context.fillStyle = `rgba(240,200,220,${state.fade * 0.22})`;
  context.font = '600 11px ui-monospace, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  state.ring.forEach((word, index) => {
    context.save();
    context.rotate(index / state.ring.length * Math.PI * 2);
    context.translate(0, -radius);
    context.fillText(word, 0, 0);
    context.restore();
  });
  context.restore();
}
