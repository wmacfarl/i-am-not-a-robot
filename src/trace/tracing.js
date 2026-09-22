let active = null;
const skins = {
  paper: { field: "rgba(248,250,252,0.88)", grid: "rgba(100,116,139,0.11)", halo: "#aeb8c5", path: "#607086", traced: "#2563eb", core: "#ffffff", guide: "#2563eb", guideFill: "#ffffff", marker: "37,99,235", start: "#1d4ed8", end: "#0f766e", endpointFill: "#ffffff", words: "71,85,105" },
  slate: { field: "rgba(226,232,240,0.92)", grid: "rgba(51,65,85,0.18)", halo: "#94a3b8", path: "#334155", traced: "#0f766e", core: "#ffffff", guide: "#0f766e", guideFill: "#ffffff", marker: "15,118,110", start: "#0f766e", end: "#1d4ed8", endpointFill: "#ffffff", words: "30,41,59" },
  chamber: { field: "rgba(14,10,22,0.35)", grid: "rgba(226,150,196,0.10)", halo: "#7a3d63", path: "#c27ea6", traced: "#f0a6c8", core: "#ffffff", guide: "#f0a6c8", guideFill: "#2a1530", marker: "240,166,200", start: "#e07aa8", end: "#c4b5fd", endpointFill: "#2a1530", words: "240,200,220" },
};

export function mountTrace(canvas, task, onComplete) {
  if (!canvas || !task) return;
  if (active?.canvas === canvas && active?.taskId === task.id) return;
  unmountTrace();

  const controller = createController(canvas, task, onComplete);
  active = {
    canvas,
    taskId: task.id,
    destroy: controller.destroy,
  };
}

export function unmountTrace() {
  if (active?.destroy) active.destroy();
  active = null;
}

function createController(canvas, task, onComplete) {
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
    points = buildPath(task.path, rect.width, rect.height);
    pathLength = points.slice(1).reduce((sum, point, index) => sum + distance(point, points[index]), 0);
  }

  function pointerDown(event) {
    if (completed || !points.length) return;
    if (event.button != null && event.button !== 0) return;
    const nextPointer = localPoint(event);
    const start = pointAt(points, progress);
    if (distance(nextPointer, start) > 76) return;
    pointer = nextPointer;
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
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
    // Search only the next short stretch: tolerance must not skip across loops.
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

    if (nearestDistance <= 50 && nearestIndex >= currentIndex) {
      const target = nearestIndex / (points.length - 1);
      const remaining = Math.max(0, target - progress);
      const eased = remaining * (1 - Math.exp(-delta / 180));
      progress += Math.min(eased, 95 * delta / 1000 / pathLength);
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
    if (!context || !points.length) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    drawField(context, width, height, skin);

    const delta = Math.min(40, now - lastGuideAt);
    lastGuideAt = now;
    advanceMovement(Math.max(0, delta));
    const guideTarget = Math.min(1, progress + (task.mode === "guided" ? 0.1 : 0.06));
    guideProgress += Math.min(guideTarget - guideProgress, delta / 9000);
    guideProgress = Math.max(progress, guideProgress);

    const fade =
      task.mode === "fading"
        ? Math.max(0.12, 0.66 - progress * 0.65)
        : task.mode === "cue"
          ? 0
          : 0.66;
    drawPath(context, points, skin.halo, 30, fade * 0.28);
    drawPath(context, points, skin.path, 2, fade);

    if (progress > 0) {
      const traced = [...points.slice(0, Math.floor(progress * (points.length - 1)) + 1), pointAt(points, progress)];
      drawPath(context, traced, skin.traced, 8, 0.82);
      drawPath(context, traced, skin.core, 2, 0.72);
    }

    if (task.mode !== "cue" || progress > 0.02) {
      const guideIndex = Math.min(points.length - 1, Math.floor(guideProgress * (points.length - 1)));
      const guide = points[guideIndex];
      const guideAlpha =
        task.mode === "fading" ? Math.max(0, 1 - progress * 2.2) : task.mode === "cue" ? 0 : 0.9;
      drawGuide(context, guide, task.reduced ? 0 : now, guideAlpha, skin);
    }

    drawWords(context, points, task.embeddedWords || [], progress, skin);
    const marker = pointAt(points, progress);
    context.beginPath();
    context.fillStyle = `rgba(${skin.marker},${drawing ? 0.07 : 0.035})`;
    context.arc(marker.x, marker.y, 38, 0, Math.PI * 2);
    context.fill();
    drawEndpoint(context, marker, "START", true, skin.start, skin);
    drawEndpoint(context, points[points.length - 1], "END", progress >= 0.92, skin.end, skin);

    animationFrame = requestAnimationFrame(draw);
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
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

export function buildPath(path, width, height) {
  const pad = Math.min(width, height) * 0.1;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const points = [];

  for (let index = 0; index < 240; index += 1) {
    const t = index / 239;
    let x;
    let y;

    if (path === "human-a") {
      x = 0.08 + t * 0.84;
      y = 0.5 + Math.sin(t * Math.PI * 3.1) * 0.25 * (0.75 + Math.sin(t * Math.PI) * 0.25);
    } else if (path === "human-b") {
      x = 0.1 + t * 0.8;
      y = 0.18 + t * 0.64 + Math.sin(t * Math.PI * 4) * 0.12;
    } else if (path === "follow-loop") {
      const angle = t * Math.PI * 2;
      x = 0.5 + Math.sin(angle) * 0.38;
      y = 0.5 + Math.sin(angle * 2) * 0.28;
    } else {
      const angle = t * Math.PI * 2 * 2.2;
      const radius = 0.46 * (1 - t);
      x = 0.5 + Math.cos(angle) * radius;
      y = 0.5 + Math.sin(angle) * radius;
    }

    if (path === "spiral-in") {
      const size = Math.min(w, h);
      points.push({
        x: pad + (w - size) / 2 + x * size,
        y: pad + (h - size) / 2 + y * size,
      });
    } else {
      points.push({
        x: pad + x * w,
        y: pad + y * h,
      });
    }
  }
  // Uniform spacing makes the follower's speed independent of the path's bends.
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i], points[i - 1]));
  const total = lengths.at(-1);
  let segment = 1;
  return Array.from({ length: 480 }, (_, i) => {
    const target = i / 479 * total;
    while (segment < points.length - 1 && lengths[segment] < target) segment++;
    const fraction = (target - lengths[segment - 1]) / Math.max(0.0001, lengths[segment] - lengths[segment - 1]);
    return { x: points[segment - 1].x + (points[segment].x - points[segment - 1].x) * fraction,
      y: points[segment - 1].y + (points[segment].y - points[segment - 1].y) * fraction };
  });
}

function pointAt(points, progress) {
  const index = Math.min(points.length - 1, progress * (points.length - 1));
  const a = points[Math.floor(index)];
  const b = points[Math.min(points.length - 1, Math.floor(index) + 1)];
  const fraction = index - Math.floor(index);
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

function drawField(context, width, height, skin) {
  context.fillStyle = skin.field;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = skin.grid;
  context.lineWidth = 1.25;
  context.strokeRect(0.5, 0.5, width - 1, height - 1);
  for (let column = 1; column < 3; column += 1) {
    const x = (width / 3) * column;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let row = 1; row < 3; row += 1) {
    const y = (height / 3) * row;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawPath(context, points, color, width, alpha) {
  if (points.length < 2) return;
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
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
  context.arc(point.x, point.y, 10 * pulse, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawEndpoint(context, point, label, activeEndpoint, color, skin) {
  context.save();
  context.fillStyle = activeEndpoint ? color : skin.endpointFill;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(point.x, point.y, 13, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = activeEndpoint ? "#ffffff" : color;
  context.font = "600 9px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label === "START" ? "S" : "E", point.x, point.y + 0.5);
  context.restore();
}

function drawWords(context, points, words, progress, skin) {
  if (!words.length) return;
  context.save();
  context.fillStyle = `rgba(${skin.words},${0.18 + progress * 0.18})`;
  context.font = "600 10px ui-monospace, monospace";
  context.textAlign = "center";
  words.forEach((word, index) => {
    const p = (index + 1) / (words.length + 1);
    const point = points[Math.floor(p * (points.length - 1))];
    context.fillText(word, point.x, point.y - 16);
  });
  context.restore();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
