import { beatPhase } from '../session/audio.js';
import { track } from './keyframes.js';
import { createHueFlash, applyHueFlash } from './hue-flash.js';

const ARMS = 2;
const MAX_SWEEP = 3 * Math.PI * 2 / ARMS;
const RING_FONT = '700 11px ui-monospace, SFMono-Regular, Consolas, monospace';
const GLOW_PULSE = [[0, 0.12], [0.28, 0.62], [1, 0.12]];

const vertex = `
attribute vec2 aVertexPosition;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec2 uSize;
varying vec2 vPos;
void main() {
  vPos = aVertexPosition * uSize;
  gl_Position = vec4((projectionMatrix * translationMatrix * vec3(vPos, 1.0)).xy, 0.0, 1.0);
}`;

const fragment = `
precision highp float;
varying vec2 vPos;
uniform vec2 uSize;
uniform float uPixel;
uniform float uAngle;
uniform float uTurns;
uniform float uScale;
uniform float uWidth;
uniform float uArmAlpha;
uniform vec3 uArm;
uniform vec3 uGlow;
uniform float uWash;
uniform vec3 uBloom;
uniform float uBreath;
uniform vec4 uBandY;
uniform vec4 uBandH;
uniform vec4 uBandA;
uniform vec3 uTear;
const float PI = 3.14159265;
const vec3 BACK = vec3(38.0, 27.0, 41.0) / 255.0;
const vec3 BAND = vec3(255.0, 235.0, 245.0) / 255.0;

float armDistance(vec2 d, float r) {
  float reach = length(uSize) * 0.58 * uScale;
  float p = pow(r / reach, 1.0 / 1.18);
  if (p > 1.0) {
    float end = 2.0 * PI * uTurns + uAngle;
    vec2 tip = vec2(cos(end), sin(end)) * reach;
    return min(distance(d, tip), distance(d, -tip));
  }
  float offset = mod(atan(d.y, d.x) - 2.0 * PI * uTurns * p - uAngle + 0.5 * PI, PI) - 0.5 * PI;
  float wind = 2.0 * PI * uTurns * p / 1.18;
  return abs(offset) * r / sqrt(wind * wind + 1.0);
}

vec3 field(vec2 pos) {
  vec2 d = pos - uSize * 0.5;
  float r = length(d);
  float size = min(uSize.x, uSize.y);
  float t = min(1.0, r / (size * 0.62));
  vec3 color = mix(BACK, mix(uGlow, BACK, t), uWash * (1.0 - t));
  for (int i = 0; i < 3; i++) {
    float radius = size * 0.5 * (1.0 - float(i) * 0.18) * uBreath;
    color = mix(color, uArm, uBloom[i] * max(0.0, 1.0 - r / radius));
  }
  float cover = clamp((uWidth * 0.5 - armDistance(d, r)) / uPixel + 0.5, 0.0, 1.0);
  color = mix(color, uArm, uArmAlpha * cover);
  for (int i = 0; i < 4; i++) {
    float band = (pos.y - uBandY[i]) / uBandH[i];
    if (band > 0.0 && band < 1.0) color = mix(color, BAND, uBandA[i] * (1.0 - abs(2.0 * band - 1.0)));
  }
  return color;
}

void main() {
  vec2 pos = vPos;
  if (pos.y >= uTear.x && pos.y < uTear.x + uTear.y && pos.x >= uTear.z && pos.x <= uSize.x + uTear.z) pos.x -= uTear.z;
  gl_FragColor = vec4(field(pos), 1.0);
}`;

let pixiApp = null;
let field = null;
let ring = null;
let glow = null;
let hueFlash = null;
let ringKey = null;
const ringTextures = new Map();
const options = { contraction: 0, intensity: 0.5, ring: [], paused: false, fade: 1, burst: 0, spin: 0, stage: null, climax: false, hue: false };
let last = null;
let angle = 0;
let ringAngle = 0;
let fadeNow = 1;
let burstNow = 0;
let spinNow = 0;
let glowStage = null;
let glowStart = 0;

export function mountBackdrop(container, next = {}) {
  if (!pixiApp) createPixiApp();
  if (pixiApp.view.parentElement !== container) {
    container.innerHTML = '';
    container.appendChild(pixiApp.view);
    pixiApp.resizeTo = container;
  }
  Object.assign(options, next);
  if (options.paused) { pixiApp.stop(); last = null; }
  else pixiApp.start();
}

export function prepareBackdrop() {
  if (!pixiApp) createPixiApp();
}

export function setBackdrop(next) {
  Object.assign(options, next);
}

export function unmountBackdrop() {
  if (pixiApp) pixiApp.stop();
  last = null;
}

function createPixiApp() {
  pixiApp = new window.PIXI.Application({
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    backgroundColor: 0x261b29,
  });
  pixiApp.stop();
  const geometry = new window.PIXI.Geometry().addAttribute('aVertexPosition', [0, 0, 1, 0, 1, 1, 0, 1], 2).addIndex([0, 1, 2, 0, 2, 3]);
  field = new window.PIXI.Mesh(geometry, window.PIXI.Shader.from(vertex, fragment, {
    uSize: new Float32Array(2), uPixel: 1, uAngle: 0, uTurns: 7, uScale: 1, uWidth: 3, uArmAlpha: 0,
    uArm: new Float32Array(3), uGlow: new Float32Array(3), uWash: 0, uBloom: new Float32Array(3), uBreath: 1,
    uBandY: new Float32Array(4), uBandH: new Float32Array(4).fill(1), uBandA: new Float32Array(4), uTear: new Float32Array(3),
  }));
  ring = new window.PIXI.Container();
  glow = new window.PIXI.Sprite(window.PIXI.Texture.from(createSoftDiscCanvas()));
  glow.anchor.set(0.5);
  glow.tint = 0xf0a6c8;
  pixiApp.stage.addChild(field, ring, glow);
  pixiApp.stage.filterArea = pixiApp.screen;
  hueFlash = createHueFlash(pixiApp.renderer.resolution);
  pixiApp.ticker.add(draw);
  // Compiling every shader now keeps the first chamber frame and the first hue flash from stalling.
  pixiApp.stage.filters = [hueFlash.filter];
  pixiApp.render();
  pixiApp.stage.filters = null;
}

function createSoftDiscCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  const gradient = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 256, 256);
  return canvas;
}

function ringTexture(word) {
  if (!ringTextures.has(word)) {
    const resolution = pixiApp.renderer.resolution;
    const canvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    c.font = RING_FONT;
    const width = c.measureText(word).width + 4;
    canvas.width = Math.ceil(width * resolution);
    canvas.height = Math.ceil(16 * resolution);
    c.scale(resolution, resolution);
    c.font = RING_FONT;
    c.fillStyle = '#f0c8dc';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(word, width / 2, 8);
    ringTextures.set(word, window.PIXI.Texture.from(canvas, { resolution }));
  }
  return ringTextures.get(word);
}

function blendInto(target, from, to, amount) {
  const t = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < 3; i++) target[i] = Math.round(from[i] + (to[i] - from[i]) * t) / 255;
}

function draw() {
  const now = performance.now();
  const dt = last === null ? 0 : Math.min(50, now - last) / 1000;
  last = now;
  const { width, height } = pixiApp.screen;
  if (!width || !height) return;
  fadeNow += (options.fade - fadeNow) * Math.min(1, dt * 1.6);
  burstNow += (options.burst - burstNow) * Math.min(1, dt * (options.burst > burstNow ? 6 : 1.8));
  spinNow += (options.spin - spinNow) * Math.min(1, dt * 3);
  ringAngle -= dt * 0.05;
  const phase = beatPhase(now);
  const rise = Math.min(1, phase / 0.18);
  const pulse = phase < 0.18 ? rise * rise * (3 - 2 * rise) : Math.pow(1 - (phase - 0.18) / 0.82, 2);
  const depth = options.intensity;
  const contraction = options.contraction;
  // An arm passes any point at most three times a second: moving stripes faster than that are a photosensitive trigger.
  angle = (angle + dt * Math.min(MAX_SWEEP, (0.45 + 1.35 * depth + contraction * 0.8) * (1 + pulse * 1.1) * (1 + burstNow * 2.4) * (1 + spinNow) * fadeNow)) % (Math.PI * 2);
  const turns = 5.5 + 3.5 * depth;
  const size = Math.min(width, height);
  const lift = 0.4 + 0.6 * fadeNow;
  const u = field.shader.uniforms;
  u.uSize[0] = width;
  u.uSize[1] = height;
  u.uPixel = 1 / pixiApp.renderer.resolution;
  u.uAngle = angle;
  u.uTurns = turns;
  u.uScale = 1 - 0.3 * contraction - 0.08 * burstNow;
  u.uWidth = (2 + size * 0.008) * 5.5 / turns + contraction * 2 + burstNow * 2.5;
  u.uArmAlpha = Math.min(0.95, fadeNow * (0.16 + depth * 0.26 + contraction * 0.12) + burstNow * 0.35);
  blendInto(u.uArm, [120, 92, 130], [226, 150, 196], 0.35 + depth * 0.65);
  blendInto(u.uGlow, [70, 40, 70], [162, 58, 106], depth);
  u.uWash = lift * (0.16 + pulse * 0.14 + contraction * 0.2 + burstNow * 0.3);
  for (let i = 0; i < 3; i++) u.uBloom[i] = lift * (0.03 + i * 0.015);
  u.uBreath = 0.86 + 0.14 * pulse;
  const strength = 0.2 + depth * 0.6 + burstNow * 0.8;
  for (let i = 0; i < 4; i++) {
    const band = (14 + i * 16) * (i === 1 ? 1 + burstNow : 1);
    u.uBandH[i] = band;
    u.uBandY[i] = ((now / 1000 * (40 + i * 27) + i * 173) % (height + band)) - band;
    u.uBandA[i] = 0.05 * strength + (i === 1 ? 0.34 : 0.09) * burstNow;
  }
  u.uTear[1] = 0;
  if (Math.random() < 0.02 * depth + 0.14 * burstNow) {
    const tearHeight = 8 + Math.random() * 42;
    u.uTear[0] = Math.random() * (height - tearHeight);
    u.uTear[1] = tearHeight;
    u.uTear[2] = (Math.random() - 0.5) * (12 + 40 * burstNow);
  }
  drawRing(width, height, size);
  drawGlow(now);
  applyHueFlash(pixiApp.stage, hueFlash, options.hue, now);
}

function drawRing(width, height, size) {
  const key = options.ring.join('|');
  if (key !== ringKey) {
    ringKey = key;
    ring.removeChildren();
    for (const word of options.ring) {
      const sprite = new window.PIXI.Sprite(ringTexture(word));
      sprite.anchor.set(0.5);
      ring.addChild(sprite);
    }
  }
  ring.position.set(width / 2, height / 2);
  ring.rotation = ringAngle;
  ring.alpha = fadeNow * 0.26 + burstNow * 0.4;
  ring.children.forEach((sprite, index) => {
    const turn = index / ring.children.length * Math.PI * 2;
    sprite.rotation = turn;
    sprite.position.set(Math.sin(turn) * size * 0.44, -Math.cos(turn) * size * 0.44);
  });
}

function drawGlow(now) {
  const stage = options.stage;
  glow.visible = Boolean(stage && stage.isConnected);
  if (!glow.visible) return;
  if (stage !== glowStage) { glowStage = stage; glowStart = now; }
  const rect = stage.getBoundingClientRect();
  glow.position.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
  glow.width = rect.width * 1.32;
  glow.height = rect.height * 1.32;
  glow.alpha = 0.34 * track(GLOW_PULSE, ((now - glowStart) / (options.climax ? 606 : 909)) % 1);
}
