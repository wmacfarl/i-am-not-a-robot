import { routeForRound } from "../maze/routes.js";

let active = null;
const glowReach = 44;
const skins = {
  paper: { field: "rgba(245,247,249,0.9)", corridor: "#cfd7e1", path: "#667587", traced: "#2563eb", core: "#ffffff", guide: "#2563eb", guideFill: "#ffffff", marker: "37,99,235", start: "#1d4ed8", end: "#0f766e", endpointFill: "#ffffff" },
  slate: { field: "rgba(232,237,244,0.94)", corridor: "#b9c3d0", path: "#475569", traced: "#0f766e", core: "#ffffff", guide: "#0f766e", guideFill: "#ffffff", marker: "15,118,110", start: "#0f766e", end: "#1d4ed8", endpointFill: "#ffffff" },
  chamber: { field: "rgba(0,0,0,0)", corridor: "#5e3a50", path: "#c98fb0", traced: "#f0a6c8", core: "#ffffff", guide: "#f0a6c8", guideFill: "#2a1530", marker: "240,166,200", start: "#e07aa8", end: "#c4b5fd", endpointFill: "#2a1530" },
};

export function mountTrace(canvas, task, onComplete, cues = {}) {
  if (!canvas || !task) return;
  if (active?.canvas === canvas && active?.taskId === task.id) return;
  unmountTrace();
  const controller = createController(canvas, task, onComplete, cues);
  active = { canvas, taskId: task.id, destroy: controller.destroy };
}

export function unmountTrace() {
  if (active?.destroy) active.destroy();
  active = null;
}

function createController(canvas, task, onComplete, { onGrab, onWind }) {
  const context = canvas.getContext("2d");
  const skin = skins[task.skin || (task.chamber ? "chamber" : "paper")];
  let points = [];
  let drawing = false;
  let completed = false;
  let progress = task.progress || 0;
  let pointer = null;
  let pathLength = 1;
  let animationFrame = null;
  let resizeObserver = null;
  let guideProgress = 0;
  let lastGuideAt = performance.now();
  let missedAt = -Infinity;
  let engage = 0;

  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  animationFrame = requestAnimationFrame(draw);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = buildPath(task.path, rect.width, rect.height, task.rings);
    pathLength = points.slice(1).reduce((sum, point, index) => sum + distance(point, points[index]), 0);
  }

  function pointerDown(event) {
    if (completed || !points.length) return;
    if (event.button != null && event.button !== 0) return;
    const nextPointer = localPoint(event);
    if (distance(nextPointer, pointAt(points, progress)) > 90) { missedAt = performance.now(); return; }
    pointer = nextPointer;
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    onGrab?.();
    event.preventDefault();
  }

  function pointerMove(event) {
    if (!drawing || completed) return;
    pointer = localPoint(event);
    event.preventDefault();
  }

  function advanceMovement(delta) {
    if (!drawing || !pointer || completed) return;
    const currentIndex = Math.floor(progress * (points.length - 1));
    const from = Math.max(0, currentIndex - 10);
    // Search only the next short stretch: tolerance must not skip across neighbouring corridors.
    const to = Math.min(points.length - 1, currentIndex + Math.ceil(110 / pathLength * (points.length - 1)));
    let nearestIndex = currentIndex;
    let nearestDistance = Infinity;
    for (let index = from; index <= to; index += 1) {
      const candidateDistance = distance(pointer, points[index]);
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance;
        nearestIndex = index;
      }
    }
    if (nearestDistance <= 56 && nearestIndex >= currentIndex) {
      const target = nearestIndex / (points.length - 1);
      const remaining = Math.max(0, target - progress);
      const eased = remaining * (1 - Math.exp(-delta / 90));
      progress += Math.min(eased, 520 * delta / 1000 / pathLength);
      task.progress = progress;
    }
    if (progress >= 0.995) completeTrace();
  }

  function pointerUp(event) {
    if (!drawing) return;
    drawing = false;
    pointer = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }

  function completeTrace() {
    if (completed) return;
    completed = true;
    drawing = false;
    progress = 1;
    task.progress = 1;
    onComplete();
  }

  function draw(now) {
    animationFrame = requestAnimationFrame(draw);
    if (!context || !points.length) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = skin.field;
    context.fillRect(0, 0, width, height);

    const delta = Math.min(40, now - lastGuideAt);
    lastGuideAt = now;
    advanceMovement(Math.max(0, delta));
    engage += ((drawing ? 1 : 0) - engage) * (1 - Math.exp(-delta / 300));
    onWind?.(progress, engage);
    const lead = 70 / pathLength;
    const guideTarget = Math.min(1, progress + lead);
    guideProgress += Math.min(guideTarget - guideProgress, delta / 9000);
    guideProgress = Math.max(progress, guideProgress);

    const fade = task.mode === "fading" ? Math.max(0.12, 0.66 - progress * 0.65) : task.mode === "cue" ? 0 : 0.66;
    drawPath(context, points, skin.corridor, points.corridor, 1);
    drawPath(context, points, skin.path, 2, fade);
    if (progress > 0) {
      const traced = [...points.slice(0, Math.floor(progress * (points.length - 1)) + 1), pointAt(points, progress)];
      drawPath(context, traced, skin.traced, Math.min(10, points.corridor * 0.45), 0.85);
      drawPath(context, traced, skin.core, 2, 0.7);
    }
    if (task.mode !== "cue") {
      const guide = points[Math.min(points.length - 1, Math.floor(guideProgress * (points.length - 1)))];
      const guideAlpha = task.mode === "fading" ? Math.max(0, 1 - progress * 2.2) : 0.9;
      drawGuide(context, guide, now, guideAlpha, skin);
    }
    const marker = pointAt(points, progress);
    const beckon = drawing ? 0 : 0.5 + 0.5 * Math.sin(now / 260);
    context.beginPath();
    context.fillStyle = `rgba(${skin.marker},${drawing ? 0.22 : 0.05 + beckon * 0.12})`;
    context.arc(marker.x, marker.y, drawing ? 26 : glowReach - 14 * (1 - beckon), 0, Math.PI * 2);
    context.fill();
    const missed = now - missedAt;
    if (missed < 600) {
      context.beginPath();
      context.strokeStyle = `rgba(${skin.marker},${1 - missed / 600})`;
      context.lineWidth = 3;
      context.arc(marker.x, marker.y, 14 + missed / 600 * 44, 0, Math.PI * 2);
      context.stroke();
    }
    drawGoal(context, points[points.length - 1], progress, skin);
    if (drawing) {
      context.beginPath();
      context.strokeStyle = `rgba(${skin.marker},0.9)`;
      context.lineWidth = 2;
      context.arc(marker.x, marker.y, 20, 0, Math.PI * 2);
      context.stroke();
    }
    context.beginPath();
    context.fillStyle = skin.start;
    context.arc(marker.x, marker.y, drawing ? 14 : 12, 0, Math.PI * 2);
    context.fill();
    if (drawing) {
      context.beginPath();
      context.fillStyle = skin.core;
      context.arc(marker.x, marker.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function destroy() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerUp);
  }

  return { destroy };
}

export function buildPath(path, width, height, rings) {
  const maze = routeForRound(Number(path.replace("maze-", "")), { rings });
  const inset = Math.min(...maze.geometry.paths[0].points.map((point) => Math.min(point.x, point.y, 1 - point.x, 1 - point.y)));
  const side = Math.min(width, height);
  const size = Math.min(side * 0.94, (side - 2 * glowReach) / (1 - 2 * inset));
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;
  const raw = maze.geometry.paths[0].points.map((point) => ({ x: offsetX + point.x * size, y: offsetY + point.y * size }));
  // Uniform spacing makes the follower's speed independent of the corridor's bends.
  const lengths = [0];
  for (let i = 1; i < raw.length; i++) lengths.push(lengths[i - 1] + distance(raw[i], raw[i - 1]));
  const total = lengths.at(-1);
  const count = Math.max(480, Math.round(total / 4));
  let segment = 1;
  const points = Array.from({ length: count }, (_, i) => {
    const target = i / (count - 1) * total;
    while (segment < raw.length - 1 && lengths[segment] < target) segment++;
    const fraction = (target - lengths[segment - 1]) / Math.max(0.0001, lengths[segment] - lengths[segment - 1]);
    return { x: raw[segment - 1].x + (raw[segment].x - raw[segment - 1].x) * fraction, y: raw[segment - 1].y + (raw[segment].y - raw[segment - 1].y) * fraction };
  });
  points.corridor = Math.max(12, maze.geometry.pitch * size * 0.62);
  return points;
}

function pointAt(points, progress) {
  const index = Math.min(points.length - 1, progress * (points.length - 1));
  const a = points[Math.floor(index)];
  const b = points[Math.min(points.length - 1, Math.floor(index) + 1)];
  const fraction = index - Math.floor(index);
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

function drawPath(context, points, color, width, alpha) {
  if (points.length < 2 || alpha <= 0) return;
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
  context.stroke();
  context.restore();
}

function drawGuide(context, point, now, alpha, skin) {
  if (!point || alpha <= 0) return;
  const pulse = 1 + Math.sin(now / 170) * 0.14;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = skin.guideFill;
  context.strokeStyle = skin.guide;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(point.x, point.y, 9 * pulse, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawGoal(context, point, progress, skin) {
  context.save();
  context.fillStyle = progress >= 0.92 ? skin.end : skin.endpointFill;
  context.strokeStyle = skin.end;
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(point.x, point.y, 11, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
