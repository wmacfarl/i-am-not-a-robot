import { beatPhase } from './audio.js';
let canvas = null;
let context = null;
let frame = null;
let observer = null;
let last = null;
let angle = 0;
let ringAngle = 0;
let fadeNow = 1;
const state = { contraction: 0, intensity: 0.5, ring: [], paused: false, fade: 1 };
export function mountSpiral(element, next = {}) {
  if (element !== canvas) {
    unmountSpiral();
    canvas = element;
    context = element.getContext('2d');
    last = null;
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(element);
  }
  Object.assign(state, next);
  if (state.paused) { cancelAnimationFrame(frame); frame = null; last = null; }
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
function blend(from, to, amount) {
  const t = Math.max(0, Math.min(1, amount));
  return from.map((value, index) => Math.round(value + (to[index] - value) * t));
}
function draw(now) {
  frame = requestAnimationFrame(draw);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const dt = last === null ? 0 : Math.min(50, now - last) / 1000;
  last = now;
  fadeNow += (state.fade - fadeNow) * Math.min(1, dt * 1.6);
  angle += dt * (0.42 + state.contraction * 0.9) * fadeNow;
  ringAngle -= dt * 0.05;
  const phase = beatPhase(now);
  const attack = 0.18;
  const rise = Math.min(1, phase / attack);
  const pulse = phase < attack ? rise * rise * (3 - 2 * rise) : Math.pow(1 - (phase - attack) / (1 - attack), 2);
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height);
  const scale = (1 - 0.3 * state.contraction) * (1 + pulse * (0.025 * (1 - state.contraction) - 0.02 * state.contraction));
  const depth = state.intensity;
  const arm = blend([120, 92, 130], [226, 150, 196], 0.35 + depth * 0.65);
  const glow = blend([70, 40, 70], [162, 58, 106], depth);
  context.fillStyle = '#261b29';
  context.fillRect(0, 0, width, height);
  const wash = context.createRadialGradient(cx, cy, 0, cx, cy, size * 0.62);
  wash.addColorStop(0, `rgba(${glow},${(0.4 + 0.6 * fadeNow) * (0.16 + pulse * 0.14 + state.contraction * 0.2)})`);
  wash.addColorStop(1, 'rgba(38,27,41,0)');
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);
  for (let i = 0; i < 3; i++) {
    const breath = 0.86 + 0.14 * pulse;
    const radius = size * 0.5 * (1 - i * 0.18) * breath;
    const bloom = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    bloom.addColorStop(0, `rgba(${arm},${(0.4 + 0.6 * fadeNow) * (0.03 + i * 0.015)})`);
    bloom.addColorStop(1, `rgba(${arm},0)`);
    context.fillStyle = bloom;
    context.fillRect(0, 0, width, height);
  }
  const maxRadius = Math.hypot(width, height) * 0.58;
  const alpha = fadeNow * (0.16 + depth * 0.26 + state.contraction * 0.12);
  context.lineCap = 'round';
  for (let armIndex = 0; armIndex < 2; armIndex++) {
    context.beginPath();
    for (let i = 0; i <= 260; i++) {
      const p = i / 260;
      const theta = p * Math.PI * 2 * 4.8 + angle + armIndex * Math.PI;
      const radius = Math.pow(p, 1.18) * maxRadius * scale;
      const x = cx + Math.cos(theta) * radius;
      const y = cy + Math.sin(theta) * radius;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.strokeStyle = `rgba(${arm},${alpha})`;
    context.lineWidth = 3 + size * 0.01 + state.contraction * 2;
    context.stroke();
  }
  if (!state.ring.length) return;
  context.save();
  context.translate(cx, cy);
  context.rotate(ringAngle);
  context.fillStyle = `rgba(240,200,220,${fadeNow * 0.26})`;
  context.font = '700 11px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  state.ring.forEach((word, index) => {
    context.save();
    context.rotate(index / state.ring.length * Math.PI * 2);
    context.translate(0, -size * 0.44);
    context.fillText(word, 0, 0);
    context.restore();
  });
  context.restore();
}
