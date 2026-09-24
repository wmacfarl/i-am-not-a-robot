import { track } from './keyframes.js';
import { createHueFlash, applyHueFlash } from './hue-flash.js';

const FONT = 'ui-monospace, SFMono-Regular, Consolas, monospace';
const OPACITY = [[0, 0], [0.14, 0.92], [0.48, 0.88], [0.54, 0.45], [0.58, 0.92], [1, 0]];
const MOTION = [[0, [-8, -8]], [0.14, [0, 0]], [0.54, [5, 4]], [0.58, [0, 0]], [1, [6, 0]]];
const SCATTER = [[-1.6, 1], [0.2, 1.3], [1.5, 0.9], [-0.7, 1.1], [1.1, 0.85], [-1.3, 1.2], [0.5, 1]];
const SPIKE_SPOTS = [[24, 22, 0.9], [76, 30, 0.85], [28, 74, 0.9], [74, 70, 0.85], [50, 14, 0.8], [22, 50, 0.85], [78, 52, 0.8], [50, 86, 0.8]];
const GLOWING = { name: 'glowing', color: '#fbe9f3', fringes: [[-3, 'rgba(255,140,200,0.42)'], [3, 'rgba(140,255,220,0.35)']], glow: 'rgba(240,166,200,0.75)', spacing: 0.22, pad: 48 };
const SHADED = { ...GLOWING, name: 'shaded', outline: 'rgba(38,27,41,0.92)' };
const PLAIN = { name: 'plain', color: '#1f2937', fringes: [[-2, 'rgba(220,38,38,0.32)'], [2, 'rgba(37,99,235,0.4)']], glow: null, spacing: 0.24, pad: 4 };

let pixiApp = null;
let effects = null;
let stageBands = null;
let scanlines = null;
let words = null;
let release = null;
let chamberBands = null;
let shutter = null;
let hueFlash = null;
const flashes = new Map();
const textures = new Map();
const options = { stimuli: () => [], anchor: null, chamber: false, burstStage: false, glitch: 0, bandStage: null, scanlines: 0, shutter: false, hue: false, frozen: false, release: false, install: false };
let last = null;
let drift = 0;
let shutterStart = null;
let releaseStart = null;
let busyBefore = true;
let settled = '';

export function mountForeground(container, next = {}) {
  if (!pixiApp) createPixiApp();
  if (pixiApp.view.parentElement !== container) {
    container.innerHTML = '';
    container.appendChild(pixiApp.view);
    pixiApp.resizeTo = container;
    settled = '';
  }
  Object.assign(options, next);
  pixiApp.start();
}

export function unmountForeground() {
  if (pixiApp) pixiApp.stop();
  last = null;
}

function createPixiApp() {
  pixiApp = new window.PIXI.Application({
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    backgroundAlpha: 0,
  });
  pixiApp.stop();
  pixiApp.ticker.remove(pixiApp.render, pixiApp);
  effects = new window.PIXI.Container();
  stageBands = new window.PIXI.TilingSprite(window.PIXI.Texture.from(createBandCanvas('37,99,235', 0.05, 0.08)), 1, 1);
  scanlines = new window.PIXI.TilingSprite(window.PIXI.Texture.from(createScanlineCanvas()), 1, 1);
  words = new window.PIXI.Container();
  release = new window.PIXI.Sprite();
  release.anchor.set(0.5);
  chamberBands = new window.PIXI.TilingSprite(window.PIXI.Texture.from(createBandCanvas('240,166,200', 0.07, 0.11)), 1, 1);
  effects.addChild(stageBands, scanlines, words, release, chamberBands);
  effects.filterArea = pixiApp.screen;
  shutter = new window.PIXI.Sprite(window.PIXI.Texture.WHITE);
  shutter.tint = 0x000000;
  shutter.alpha = 0.14;
  hueFlash = createHueFlash(pixiApp.renderer.resolution);
  pixiApp.stage.addChild(effects, shutter);
  pixiApp.ticker.add(draw);
  effects.filters = [hueFlash.filter];
  pixiApp.render();
  effects.filters = null;
}

function createBandCanvas(rgb, soft, strong) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 140;
  const c = canvas.getContext('2d');
  c.fillStyle = `rgba(${rgb},${soft})`;
  c.fillRect(0, 44, 8, 8);
  c.fillStyle = `rgba(${rgb},${strong})`;
  c.fillRect(0, 96, 8, 3);
  return canvas;
}

function createScanlineCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 3;
  const c = canvas.getContext('2d');
  c.fillStyle = 'rgba(255,255,255,0.028)';
  c.fillRect(0, 2, 4, 1);
  return canvas;
}

function wordTexture(text, look, size, wrap, lineHeight) {
  const key = `${look.name}|${size}|${wrap}|${lineHeight}|${text}`;
  const cached = textures.get(key);
  if (cached) {
    textures.delete(key);
    textures.set(key, cached);
    return cached;
  }
  const resolution = pixiApp.renderer.resolution;
  const canvas = document.createElement('canvas');
  const c = canvas.getContext('2d');
  const font = `800 ${size}px ${FONT}`;
  const spacing = look.spacing * size;
  c.font = font;
  const advance = line => [...line].reduce((sum, char) => sum + c.measureText(char).width + spacing, -spacing);
  const lines = wrap ? wrapLines(text, wrap, advance) : [text];
  const width = Math.max(...lines.map(advance)) + look.pad * 2;
  const height = lines.length * size * lineHeight + look.pad * 2;
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(height * resolution);
  c.font = font;
  const write = (context, dx, fill, stroke = 0) => {
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.font = font;
    context.textBaseline = 'middle';
    context.fillStyle = fill;
    context.strokeStyle = fill;
    context.lineWidth = stroke;
    context.lineJoin = 'round';
    lines.forEach((line, row) => {
      let x = (width - advance(line)) / 2 + dx;
      const y = look.pad + (row + 0.5) * size * lineHeight;
      for (const char of line) { if (stroke) context.strokeText(char, x, y); else context.fillText(char, x, y); x += c.measureText(char).width + spacing; }
    });
  };
  if (look.glow) {
    // Firefox blurs a canvas shadow on the CPU once per draw call, so the glow is one blurred drawImage rather than one per character.
    const ink = document.createElement('canvas');
    ink.width = canvas.width;
    ink.height = canvas.height;
    write(ink.getContext('2d'), 0, '#fff');
    c.shadowColor = look.glow;
    c.shadowBlur = 34 * resolution;
    c.shadowOffsetX = canvas.width;
    c.drawImage(ink, -canvas.width, 0);
    c.shadowColor = 'transparent';
  }
  if (look.outline) write(c, 0, look.outline, Math.max(4, size * 0.12));
  for (const [dx, fill] of look.fringes) write(c, dx, fill);
  write(c, 0, look.color);
  const texture = window.PIXI.Texture.from(canvas, { resolution });
  textures.set(key, texture);
  if (textures.size > 48) {
    const inUse = new Set([release.texture, ...[...flashes.values()].map(node => node.word.texture)]);
    const [oldKey, oldTexture] = [...textures].find(([, candidate]) => !inUse.has(candidate)) || [];
    if (oldKey) { textures.delete(oldKey); oldTexture.destroy(true); }
  }
  return texture;
}

function wrapLines(text, width, advance) {
  const lines = [];
  for (const word of text.split(' ')) {
    const line = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && advance(line) <= width) lines[lines.length - 1] = line;
    else lines.push(word);
  }
  return lines;
}

function fontSize(min, vw, max) {
  return Math.round(Math.min(max, Math.max(min, window.innerWidth * vw / 100)));
}

function anchorBox() {
  const anchor = options.anchor;
  if (!anchor || !anchor.isConnected) return null;
  const rect = anchor.getBoundingClientRect();
  return { x: rect.left + anchor.clientLeft, y: rect.top + anchor.clientTop, width: anchor.clientWidth, height: anchor.clientHeight };
}

function draw() {
  const now = performance.now();
  const dt = last === null ? 0 : Math.min(250, now - last) / 1000;
  last = now;
  const { width, height } = pixiApp.screen;
  if (!width || !height) return;
  if (!options.frozen) drift = (drift + dt * 20) % 140;
  const entries = options.stimuli().filter(entry => entry.mode === 'flash');
  const box = entries.length || options.release ? anchorBox() : null;
  const bands = drawBands(width, height);
  const flashing = drawFlashes(now, entries, box);
  const releasing = drawRelease(now, box);
  const shuttering = drawShutter(now, width, height);
  applyHueFlash(effects, hueFlash, options.hue, now);
  scanlines.visible = options.scanlines > 0;
  scanlines.alpha = options.scanlines;
  scanlines.width = width;
  scanlines.height = height;
  const busy = bands || flashing || releasing || shuttering;
  const signature = `${width}x${height}|${options.scanlines}`;
  if (busy || busyBefore || signature !== settled) pixiApp.render();
  busyBefore = busy;
  settled = signature;
}

function drawBands(width, height) {
  chamberBands.visible = options.chamber && options.glitch > 0;
  chamberBands.alpha = Math.min(1, options.glitch);
  chamberBands.width = width;
  chamberBands.height = height;
  chamberBands.tilePosition.y = drift;
  const stage = options.bandStage;
  stageBands.visible = !options.chamber && options.glitch > 0 && Boolean(stage && stage.isConnected);
  if (stageBands.visible) {
    const rect = stage.getBoundingClientRect();
    stageBands.position.set(rect.left + stage.clientLeft, rect.top + stage.clientTop);
    stageBands.width = stage.clientWidth;
    stageBands.height = stage.clientHeight;
    stageBands.alpha = Math.min(1, options.glitch);
    stageBands.tilePosition.y = drift;
  }
  return chamberBands.visible || stageBands.visible;
}

function drawFlashes(now, entries, box) {
  const live = new Set(box ? entries.map(entry => entry.key) : []);
  for (const [key, node] of flashes) if (!live.has(key)) { node.destroy({ children: true }); flashes.delete(key); }
  if (!box) return false;
  for (const entry of entries) {
    let node = flashes.get(entry.key);
    if (!node) {
      node = new window.PIXI.Container();
      node.wash = node.addChild(new window.PIXI.Sprite(window.PIXI.Texture.WHITE));
      node.wash.tint = 0xf5f7f9;
      node.wash.alpha = 0.72;
      node.word = node.addChild(new window.PIXI.Sprite());
      node.word.anchor.set(0.5);
      words.addChildAt(node, 0);
      flashes.set(entry.key, node);
    }
    placeFlash(node, entry, box, Math.min(1, (now - entry.shownAt) / entry.ms));
  }
  return entries.length > 0;
}

function placeFlash(node, entry, box, t) {
  const parts = entry.key.split(':');
  const word = node.word;
  let x = box.x + box.width / 2;
  let y = box.y + box.height / 2;
  let scale = 1;
  if (!options.chamber) {
    word.texture = wordTexture(entry.text, PLAIN, fontSize(26, 5, 44), 0, 1);
    node.wash.visible = true;
    node.wash.position.set(box.x, box.y);
    node.wash.width = box.width;
    node.wash.height = box.height;
    node.visible = t < 0.85;
    word.alpha = 0.6;
    word.position.set(x, y);
    return;
  }
  node.wash.visible = false;
  if (parts[parts.length - 2] === 'spike') {
    const [left, top, spot] = SPIKE_SPOTS[(Number(parts[parts.length - 1]) || 0) % SPIKE_SPOTS.length];
    word.texture = wordTexture(entry.text, GLOWING, fontSize(22, 4.2, 40), Math.round(box.width * 0.44), 1.05);
    x = box.x + box.width * left / 100;
    y = box.y + box.height * top / 100;
    scale = spot;
  } else if (options.burstStage) {
    const long = entry.text.length > 18;
    const size = Math.round(fontSize(30, 6.4, 56) * (long ? 0.72 : 1));
    const [dy, spot] = entry.ms >= 800 ? [0, 1.15] : SCATTER[(Number(parts[parts.length - 2]) || 0) % SCATTER.length];
    word.texture = wordTexture(entry.text, GLOWING, size, Math.round(box.width * 0.88 - size * 0.8), 1.05);
    y += (long ? dy / 2 : dy) * size;
    scale = spot;
  } else {
    word.texture = wordTexture(entry.text, options.install ? SHADED : GLOWING, fontSize(30, 6.4, 56), 0, 1);
  }
  animate(word, x, y, scale, t);
}

function animate(sprite, x, y, scale, t) {
  const [shift, skew] = track(MOTION, t);
  sprite.alpha = track(OPACITY, t);
  sprite.skew.x = skew * Math.PI / 180;
  sprite.scale.set(scale);
  sprite.position.set(x + shift * scale, y);
}

function drawRelease(now, box) {
  release.visible = options.release && Boolean(box);
  if (!release.visible) { releaseStart = null; return false; }
  if (releaseStart === null) releaseStart = now;
  release.texture = wordTexture('RELEASE', SHADED, fontSize(44, 9, 88), 0, 1);
  animate(release, box.x + box.width / 2, box.y + box.height / 2, 1, ((now - releaseStart) % 909) / 909);
  return true;
}

function drawShutter(now, width, height) {
  shutter.visible = false;
  if (!options.shutter) { shutterStart = null; return false; }
  if (shutterStart === null) shutterStart = now;
  shutter.width = width;
  shutter.height = height;
  shutter.visible = (now - shutterStart) % 500 < 75;
  return true;
}
