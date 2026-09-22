let app = null;
let root = null;
let wash = null;
let field = null;
let glow = null;
let active = false;
let options = {};
let startedAt = 0;
let rewardAt = 0;
let rewardStrength = 0;
let rewardPositions = [];

export function mountStimulus(container, nextOptions = {}) {
  if (!container || !window.PIXI) return;
  if (!app) createApp();
  if (app.view.parentElement !== container) container.replaceChildren(app.view);
  options = nextOptions;
  active = true;
  resize(container);
  app.start();
}

export function unmountStimulus() {
  active = false;
  if (app) app.stop();
  if (root) root.visible = false;
}

export function pulseStimulus(strength = 1, positions = []) {
  rewardAt = performance.now();
  rewardStrength = Math.max(0.35, Math.min(1.6, strength));
  rewardPositions = [...positions];
}

function createApp() {
  const lowPower =
    window.matchMedia?.("(pointer: coarse)")?.matches ||
    /Android|iPhone|iPad|Mobile/i.test(window.navigator?.userAgent || "");

  app = new window.PIXI.Application({
    width: 800,
    height: 600,
    antialias: !lowPower,
    autoDensity: true,
    resolution: lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
    backgroundAlpha: 0,
  });
  if ("maxFPS" in app.ticker) app.ticker.maxFPS = lowPower ? 30 : 60;
  app.stop();

  root = new window.PIXI.Container();
  wash = new window.PIXI.Graphics();
  field = new window.PIXI.Graphics();
  glow = new window.PIXI.Graphics();
  root.addChild(wash, field, glow);
  app.stage.addChild(root);
  startedAt = performance.now();
  app.ticker.add(draw);
}

function resize(container) {
  const width = Math.max(280, Math.floor(container.clientWidth || window.innerWidth));
  const height = Math.max(320, Math.floor(container.clientHeight || window.innerHeight));
  if (app.screen.width !== width || app.screen.height !== height) app.renderer.resize(width, height);
  app.view.style.width = "100%";
  app.view.style.height = "100%";
}

function draw() {
  if (!active || !root) return;
  root.visible = true;
  const width = app.screen.width;
  const height = app.screen.height;
  const now = performance.now();
  const elapsed = (now - startedAt) / 1000;
  const depth = clamp01(options.depth);
  const centerMode = options.mode === "center" || options.act === "center";
  const reduced = options.visualMode === "reduced";
  const motion = options.paused ? 0 : reduced ? 0.35 : 1;
  const grid = gridBounds(width, height);

  drawWash(width, height, centerMode, depth);
  drawGridField(grid, elapsed, depth, centerMode, motion);
  drawSelections(grid, options.selectedPositions || [], depth, centerMode);
  drawPredictions(grid, options.predictedPositions || [], depth);
  if (centerMode) drawCenterSpiral(grid, elapsed, depth, motion);
  drawReward(grid, now, centerMode);
}

function drawWash(width, height, centerMode, depth) {
  wash.clear();
  const color = centerMode
    ? blendColor(0xf2f4f6, 0xf7eef1, 0.35 + depth * 0.35)
    : 0xf2f4f6;
  wash.beginFill(color, 1);
  wash.drawRect(0, 0, width, height);
  wash.endFill();
}

function drawGridField(grid, elapsed, depth, centerMode, motion) {
  field.clear();
  const color = centerMode ? 0x8b5a6c : 0x64748b;
  const baseAlpha = 0.035 + depth * 0.035;
  field.lineStyle(1, color, baseAlpha);
  field.drawRoundedRect(grid.x, grid.y, grid.width, grid.height, 8);
  for (let column = 1; column < 3; column += 1) {
    const x = grid.x + (grid.width / 3) * column;
    field.moveTo(x, grid.y);
    field.lineTo(x, grid.y + grid.height);
  }
  for (let row = 1; row < 3; row += 1) {
    const y = grid.y + (grid.height / 3) * row;
    field.moveTo(grid.x, y);
    field.lineTo(grid.x + grid.width, y);
  }

  if (!options.paused) {
    const scan = ((elapsed * motion) % 3.8) / 3.8;
    const scanY = grid.y + grid.height * scan;
    field.lineStyle(2, centerMode ? 0xaa617b : 0x2563eb, 0.035 + depth * 0.045);
    field.moveTo(grid.x, scanY);
    field.lineTo(grid.x + grid.width, scanY);
  }
}

function drawSelections(grid, positions, depth, centerMode) {
  if (!positions.length) return;
  const color = centerMode ? 0xa64768 : 0x2563eb;
  const points = positions.map((position) => cellCenter(grid, position));

  if (points.length > 1) {
    field.lineStyle(2 + depth, color, 0.08 + depth * 0.08);
    field.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => field.lineTo(point.x, point.y));
  }

  points.forEach((point) => {
    field.beginFill(color, 0.035 + depth * 0.045);
    field.drawCircle(point.x, point.y, Math.min(grid.width, grid.height) * 0.065);
    field.endFill();
  });
}

function drawPredictions(grid, positions, depth) {
  positions.forEach((position) => {
    const point = cellCenter(grid, position);
    const radius = Math.min(grid.width, grid.height) * 0.078;
    field.lineStyle(1.5, 0xa64768, 0.09 + depth * 0.1);
    field.drawCircle(point.x, point.y, radius);
  });
}

function drawCenterSpiral(grid, elapsed, depth, motion) {
  const center = cellCenter(grid, 4);
  const maxRadius = Math.min(grid.width, grid.height) * 0.34;
  const rotation = elapsed * 0.12 * motion;
  field.lineStyle(1.4, 0x9c3d61, 0.045 + depth * 0.075);
  for (let index = 0; index < 190; index += 1) {
    const progress = index / 189;
    const angle = rotation + progress * Math.PI * 2 * 5.2;
    const radius = maxRadius * progress;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    if (index === 0) field.moveTo(x, y);
    else field.lineTo(x, y);
  }
}

function drawReward(grid, now, centerMode) {
  glow.clear();
  const elapsed = now - rewardAt;
  if (elapsed < 0 || elapsed > 780 || !rewardPositions.length) return;
  const progress = elapsed / 780;
  const strength = Math.pow(1 - progress, 1.6) * rewardStrength;
  const color = centerMode ? 0xd889a4 : 0x7aa7f8;

  rewardPositions.forEach((position) => {
    const point = cellCenter(grid, position);
    for (let ring = 3; ring >= 1; ring -= 1) {
      glow.beginFill(color, (strength * 0.055) / ring);
      glow.drawCircle(point.x, point.y, (28 + progress * 70) * ring);
      glow.endFill();
    }
  });
}

function gridBounds(width, height) {
  const gridWidth = Math.min(width * 0.78, 920);
  const gridHeight = Math.min(height * 0.72, 680);
  return {
    x: (width - gridWidth) / 2,
    y: (height - gridHeight) / 2,
    width: gridWidth,
    height: gridHeight,
  };
}

function cellCenter(grid, position) {
  const column = position % 3;
  const row = Math.floor(position / 3);
  return {
    x: grid.x + (column + 0.5) * (grid.width / 3),
    y: grid.y + (row + 0.5) * (grid.height / 3),
  };
}

function blendColor(from, to, amount) {
  const t = clamp01(amount);
  const fr = (from >> 16) & 255;
  const fg = (from >> 8) & 255;
  const fb = from & 255;
  const tr = (to >> 16) & 255;
  const tg = (to >> 8) & 255;
  const tb = to & 255;
  return (
    (Math.round(fr + (tr - fr) * t) << 16) +
    (Math.round(fg + (tg - fg) * t) << 8) +
    Math.round(fb + (tb - fb) * t)
  );
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
