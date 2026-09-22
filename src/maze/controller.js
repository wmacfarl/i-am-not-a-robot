let active = null;

const COLORS = {
  background: "#faf9f6",
  route: "#35393c",
  signal: "#2864dc",
  complete: "#ffffff",
};

const POINTER_HISTORY_MS = 300;

export function mountMazeTrace(canvas, task, onComplete) {
  if (!canvas || !task) return;
  if (active?.canvas === canvas && active?.taskId === task.id) return;
  unmountMazeTrace();
  const controller = createController(canvas, task, onComplete);
  active = { canvas, taskId: task.id, destroy: controller.destroy };
}

export function unmountMazeTrace() {
  active?.destroy?.();
  active = null;
}

function createController(canvas, task, onComplete) {
  const context = canvas.getContext("2d");
  let geometry = null;
  let drawing = false;
  let started = false;
  let completed = false;
  let pointerId = null;
  let animationFrame = null;
  let resizeObserver = null;
  let pointerHistory = [];
  let activeLocation = null;
  let activeNodeId = null;
  let displayPoint = null;
  let displayQueue = [];
  let trails = [];
  let currentTrail = null;
  let lastDrawAt = performance.now();
  let completionNotified = false;
  let completionTimer = null;

  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("contextmenu", preventDefault);
  animationFrame = requestAnimationFrame(draw);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    geometry = buildGeometry(task.geometry, rect.width, rect.height);
    if (!started) {
      activeNodeId = geometry.graph.startNodeId;
      activeLocation = locationForNode(geometry.graph.nodes[activeNodeId]);
      displayPoint = activeLocation.point;
      displayQueue = [];
    }
  }

  function pointerDown(event) {
    if (completed || drawing || !geometry) return;
    const point = localPoint(event);
    const target = started ? activeLocation?.point : geometry.start;
    const threshold = geometry.tolerance * (started ? 1.7 : 1.5);
    if (!target || distance(point, target) > threshold) {
      setLiveState(started ? "resume" : "seek");
      return;
    }

    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    drawing = true;
    pointerHistory = [{ point, time: event.timeStamp }];
    currentTrail = [activeLocation?.point || point];
    trails.push(currentTrail);
    if (!started) started = true;
    setLiveState("tracking");
    event.preventDefault();
  }

  function pointerMove(event) {
    if (!drawing || completed || event.pointerId !== pointerId) return;
    const coalesced = event.getCoalescedEvents?.() || [];
    const samples = coalesced.length ? coalesced : [event];
    samples.forEach((sample) => {
      pullNavigatorToward(localPoint(sample), sample.timeStamp);
    });
    event.preventDefault();
  }

  function pullNavigatorToward(point, timeStamp) {
    const time = Number.isFinite(timeStamp) ? timeStamp : performance.now();
    pointerHistory.push({ point, time });
    const cutoff = time - POINTER_HISTORY_MS;
    while (pointerHistory.length > 1 && pointerHistory[0].time < cutoff) {
      pointerHistory.shift();
    }

    const nodes = geometry.graph.nodes;
    const historyTravel = traceLength(pointerHistory);
    const captureRadius = geometry.tolerance * 2;
    const directTarget = directTargetToward(
      point,
      displayPoint || activeLocation?.point,
      geometry,
      activeNodeId,
      captureRadius,
    );
    if (directTarget) {
      const startingNode = nodes[activeNodeId];
      if (!currentTrail) {
        currentTrail = [displayPoint || startingNode.point];
        trails.push(currentTrail);
      }
      activeNodeId = directTarget.nodeId;
      activeLocation = directTarget.location;
      displayPoint = directTarget.location.point;
      displayQueue = [];
      currentTrail.push(directTarget.location.point);
      if (currentTrail.length > 6000) currentTrail.shift();
      if (directTarget.node.isGoal) {
        complete();
        return;
      }
      setLiveState("tracking");
      return;
    }

    const localReach = Math.min(
      geometry.tolerance * 14,
      Math.max(
        geometry.tolerance * 2.5,
        historyTravel * 1.65 + geometry.tolerance * 1.25,
      ),
    );
    const maxSteps = Math.ceil(localReach / geometry.graph.spacing) + 5;
    const route = forgivingRouteToward(
      activeNodeId,
      point,
      nodes,
      maxSteps,
      pointerHistory,
      captureRadius,
      geometry.graph.spacing,
      geometry.tolerance,
    );
    const targetNode = route ? nodes[route[route.length - 1]] : null;
    if (!targetNode || pointToTraceDistance(targetNode.point, pointerHistory) > captureRadius) {
      setLiveState("tracking");
      return;
    }

    const startingNode = nodes[activeNodeId];
    if (!currentTrail) {
      currentTrail = [startingNode.point];
      trails.push(currentTrail);
    }
    for (let index = 1; index < route.length; index += 1) {
      const nextNode = nodes[route[index]];
      activeNodeId = nextNode.id;
      activeLocation = locationForNode(nextNode);
      displayQueue.push(nextNode.point);
      currentTrail.push(nextNode.point);
      if (currentTrail.length > 6000) currentTrail.shift();
      if (nextNode.isGoal) {
        complete();
        return;
      }
    }
    setLiveState("tracking");
  }

  function pointerUp(event) {
    if (!drawing || event.pointerId !== pointerId) return;
    finishContact(true);
    if (!completed) {
      setLiveState("released");
    }
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    pointerId = null;
    event.preventDefault();
  }

  function finishContact(snapDisplay = false) {
    if (!drawing) return;
    drawing = false;
    pointerHistory = [];
    currentTrail = null;
    if (snapDisplay && activeLocation) {
      displayPoint = activeLocation.point;
      displayQueue = [];
    }
  }

  function complete() {
    if (completed) return;
    completed = true;
    activeLocation = { point: geometry.goal, pathIndex: -1, pointIndex: 0, distance: 0 };
    finishContact();
    if (window.navigator.vibrate) window.navigator.vibrate([16, 34, 22]);
  }

  function draw(now) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width && height && geometry) {
      const elapsed = Math.min(50, Math.max(0, now - lastDrawAt));
      displayPoint = advanceDisplayPoint(displayPoint, displayQueue, elapsed);
      const visuallyComplete = completed && displayQueue.length === 0;
      context.clearRect(0, 0, width, height);
      drawBackground(context, width, height);
      drawNetwork(
        context,
        geometry,
        displayPoint ? { point: displayPoint } : activeLocation,
        trails,
        {
          started,
          completed: visuallyComplete,
        },
      );
      if (visuallyComplete && !completionNotified) {
        completionNotified = true;
        setLiveState("complete");
        completionTimer = setTimeout(() => onComplete?.(), 180);
      }
    }
    lastDrawAt = now;
    animationFrame = requestAnimationFrame(draw);
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function destroy() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    clearTimeout(completionTimer);
    resizeObserver?.disconnect();
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerUp);
    canvas.removeEventListener("contextmenu", preventDefault);
  }

  setLiveState("ready");
  return { destroy };
}

function buildGeometry(source, width, height) {
  const size = Math.min(width * 0.94, height * 0.94);
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;
  const scalePoint = (point) => ({
    x: offsetX + point.x * size,
    y: offsetY + point.y * size,
  });
  const radialSpan = (source.outerRadius ?? 0.445) - (source.innerRadius ?? 0.125);
  const normalizedPitch =
    source.pitch ??
    (source.ringCount > 1 ? radialSpan / (source.ringCount - 1) : 1);
  const ringGap = normalizedPitch * size;
  const tolerance = clamp(ringGap * 0.28, 8, 18);
  const pathWidth = clamp(ringGap * 0.43, 9, 26) * 1.5;
  const trailWidth = pathWidth;
  const paths = source.paths.map((path) => ({
    ...path,
    points: resamplePath(path.points.map(scalePoint), 2.5),
  }));
  const junctions = buildJunctions(paths);
  const start = scalePoint(source.start);
  const goal = scalePoint(source.goal);
  const center = scalePoint(source.center);
  const graph = buildTraversalGraph(paths, junctions, start, 2.5);
  return {
    ...source,
    width,
    height,
    size,
    paths,
    junctions,
    graph,
    start,
    goal,
    center,
    startRadius: distance(start, center),
    ringGap,
    pathWidth,
    trailWidth,
    tolerance,
  };
}

function buildJunctions(paths) {
  const pathIndexById = new Map(paths.map((path, index) => [path.id, index]));
  const junctions = [];

  paths.forEach((path, pathIndex) => {
    if (path.kind !== "bridge" && path.kind !== "goal") return;
    const fromRingIndex = pathIndexById.get(`ring-${path.fromRing}`);
    if (fromRingIndex != null) {
      junctions.push(
        makeJunction(paths, pathIndex, 0, fromRingIndex, path.points[0]),
      );
    }
    if (path.kind === "bridge") {
      const toRingIndex = pathIndexById.get(`ring-${path.toRing}`);
      if (toRingIndex != null) {
        junctions.push(
          makeJunction(
            paths,
            pathIndex,
            path.points.length - 2,
            toRingIndex,
            path.points[path.points.length - 1],
          ),
        );
      }
    }
  });

  return junctions;
}

function makeJunction(paths, connectorPathIndex, connectorPointIndex, ringPathIndex, point) {
  const ringLocation = nearestPointOnPath(point, paths[ringPathIndex], ringPathIndex);
  return {
    point,
    sides: [
      {
        pathIndex: connectorPathIndex,
        pointIndex: connectorPointIndex,
        point,
      },
      ringLocation,
    ],
  };
}

function nearestPointOnPath(pointer, path, pathIndex) {
  let nearest = {
    point: path.points[0],
    pathIndex,
    pointIndex: 0,
    distance: Infinity,
  };
  for (let pointIndex = 0; pointIndex < path.points.length - 1; pointIndex += 1) {
    const point = projectPointToSegment(
      pointer,
      path.points[pointIndex],
      path.points[pointIndex + 1],
    );
    const candidateDistance = distance(pointer, point);
    if (candidateDistance < nearest.distance) {
      nearest = { point, pathIndex, pointIndex, distance: candidateDistance };
    }
  }
  return nearest;
}

function resamplePath(points, spacing) {
  if (points.length < 2) return [...points];
  const sampled = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const steps = Math.max(1, Math.ceil(distance(from, to) / spacing));
    for (let step = 1; step <= steps; step += 1) {
      const amount = step / steps;
      sampled.push({
        x: from.x + (to.x - from.x) * amount,
        y: from.y + (to.y - from.y) * amount,
      });
    }
  }
  return sampled;
}

function buildTraversalGraph(paths, junctions, start, spacing) {
  const nodes = [];
  const nodeIdsByPath = [];

  paths.forEach((path, pathIndex) => {
    const ids = path.points.map((point, pointIndex) => {
      const node = {
        id: nodes.length,
        point,
        pathIndex,
        pointIndex,
        neighbors: new Set(),
        isGoal: path.kind === "goal" && pointIndex === path.points.length - 1,
      };
      nodes.push(node);
      return node.id;
    });
    nodeIdsByPath.push(ids);
    for (let index = 0; index < ids.length - 1; index += 1) {
      connectNodes(nodes, ids[index], ids[index + 1]);
    }
    if (path.closed && ids.length > 2) connectNodes(nodes, ids[0], ids[ids.length - 1]);
  });

  junctions.forEach((junction) => {
    const [left, right] = junction.sides;
    const leftId = nodeIdForLocation(paths, nodeIdsByPath, left);
    const rightId = nodeIdForLocation(paths, nodeIdsByPath, right);
    connectNodes(nodes, leftId, rightId);
  });

  const startLocation = nearestPointOnPath(start, paths[0], 0);
  const startNodeId = nodeIdForLocation(paths, nodeIdsByPath, startLocation);
  return { nodes, nodeIdsByPath, startNodeId, spacing };
}

function directTargetToward(
  pointer,
  displayPoint,
  geometry,
  activeNodeId,
  captureRadius,
) {
  if (!displayPoint) return null;
  const activeNode = geometry.graph.nodes[activeNodeId];
  if (!activeNode) return null;
  const path = geometry.paths[activeNode.pathIndex];
  if (!path || path.points.length < 2) return null;
  const searchRange = Math.ceil(
    Math.hypot(geometry.width, geometry.height) / geometry.graph.spacing,
  );
  const target = nearestPointOnPathRange(
    pointer,
    path,
    activeNode.pathIndex,
    activeNode.pointIndex,
    searchRange,
  );
  if (!target || target.distance > captureRadius) return null;
  const displayLocation = nearestPointOnPathRange(
    displayPoint,
    path,
    activeNode.pathIndex,
    activeNode.pointIndex,
    searchRange,
  );
  if (!displayLocation) return null;
  const corridorRadius = Math.max(
    0.75,
    (geometry.pathWidth - geometry.trailWidth) / 2,
  );
  const minimumIndex = Math.max(
    0,
    Math.min(displayLocation.pointIndex, target.pointIndex) - 8,
  );
  const maximumIndex = Math.min(
    path.points.length - 2,
    Math.max(displayLocation.pointIndex, target.pointIndex) + 8,
  );
  if (
    !segmentStaysInsidePath(
      displayPoint,
      target.point,
      path,
      minimumIndex,
      maximumIndex,
      corridorRadius,
    )
  ) {
    return null;
  }
  const nodeId = nodeIdForLocation(
    geometry.paths,
    geometry.graph.nodeIdsByPath,
    target,
  );
  return {
    nodeId,
    node: geometry.graph.nodes[nodeId],
    location: {
      point: target.point,
      pathIndex: target.pathIndex,
      pointIndex: target.pointIndex,
      distance: target.distance,
    },
  };
}

function nearestPointOnPathRange(pointer, path, pathIndex, centerIndex, range) {
  const firstIndex = Math.max(0, centerIndex - range);
  const lastIndex = Math.min(path.points.length - 2, centerIndex + range);
  let nearest = null;
  for (let pointIndex = firstIndex; pointIndex <= lastIndex; pointIndex += 1) {
    const point = projectPointToSegment(
      pointer,
      path.points[pointIndex],
      path.points[pointIndex + 1],
    );
    const candidateDistance = distance(pointer, point);
    if (!nearest || candidateDistance < nearest.distance) {
      nearest = { point, pathIndex, pointIndex, distance: candidateDistance };
    }
  }
  return nearest;
}

function segmentStaysInsidePath(
  from,
  to,
  path,
  firstIndex,
  lastIndex,
  corridorRadius,
) {
  const sampleCount = Math.max(
    1,
    Math.ceil(distance(from, to) / Math.max(3, corridorRadius * 0.32)),
  );
  for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
    const amount = sampleIndex / sampleCount;
    const sample = {
      x: from.x + (to.x - from.x) * amount,
      y: from.y + (to.y - from.y) * amount,
    };
    let nearestDistance = Infinity;
    for (let pointIndex = firstIndex; pointIndex <= lastIndex; pointIndex += 1) {
      nearestDistance = Math.min(
        nearestDistance,
        distance(
          sample,
          projectPointToSegment(
            sample,
            path.points[pointIndex],
            path.points[pointIndex + 1],
          ),
        ),
      );
    }
    if (nearestDistance > corridorRadius) return false;
  }
  return true;
}

function nodeIdForLocation(paths, nodeIdsByPath, location) {
  const path = paths[location.pathIndex];
  const leftIndex = clamp(location.pointIndex, 0, path.points.length - 1);
  const rightIndex = Math.min(path.points.length - 1, leftIndex + 1);
  const left = path.points[leftIndex];
  const right = path.points[rightIndex];
  const pointIndex =
    distance(location.point, left) <= distance(location.point, right)
      ? leftIndex
      : rightIndex;
  return nodeIdsByPath[location.pathIndex][pointIndex];
}

function connectNodes(nodes, leftId, rightId) {
  if (leftId == null || rightId == null || leftId === rightId) return;
  nodes[leftId].neighbors.add(rightId);
  nodes[rightId].neighbors.add(leftId);
}

function forgivingRouteToward(
  startId,
  point,
  nodes,
  maxSteps,
  pointerHistory,
  captureRadius,
  spacing,
  tolerance,
) {
  const queue = [startId];
  const previous = new Map([[startId, null]]);
  const depth = new Map([[startId, 0]]);
  let cursor = 0;
  let nearestId = startId;
  let nearestDepth = 0;
  let nearestScore = distance(point, nodes[startId].point);

  while (cursor < queue.length) {
    const nodeId = queue[cursor];
    cursor += 1;
    const nextDepth = depth.get(nodeId) + 1;
    if (nextDepth > maxSteps) continue;

    for (const neighborId of nodes[nodeId].neighbors) {
      if (previous.has(neighborId)) continue;
      const traceDistance = pointToTraceDistance(
        nodes[neighborId].point,
        pointerHistory,
      );
      if (traceDistance > captureRadius) continue;
      previous.set(neighborId, nodeId);
      depth.set(neighborId, nextDepth);
      const progressBias = Math.min(nextDepth * spacing, tolerance * 2) * 0.04;
      const candidateScore =
        distance(point, nodes[neighborId].point) +
        traceDistance * 0.08 -
        progressBias;
      if (
        candidateScore < nearestScore - 0.08 ||
        (Math.abs(candidateScore - nearestScore) <= 0.08 && nextDepth > nearestDepth)
      ) {
        nearestId = neighborId;
        nearestDepth = nextDepth;
        nearestScore = candidateScore;
      }
      queue.push(neighborId);
    }
  }

  const route = [nearestId];
  let step = previous.get(nearestId);
  while (step != null) {
    route.push(step);
    step = previous.get(step);
  }
  return route.reverse();
}

function advanceDisplayPoint(point, queue, elapsed) {
  if (!point || !queue.length || elapsed <= 0) return point;
  const queuedDistance = queuedPathLength(point, queue);
  let travel = (540 + Math.min(560, queuedDistance * 3.2)) * (elapsed / 1000);
  let current = point;

  while (queue.length && travel > 0) {
    const target = queue[0];
    const stepDistance = distance(current, target);
    if (stepDistance <= travel || stepDistance < 0.01) {
      current = target;
      queue.shift();
      travel -= stepDistance;
      continue;
    }
    const amount = travel / stepDistance;
    current = {
      x: current.x + (target.x - current.x) * amount,
      y: current.y + (target.y - current.y) * amount,
    };
    travel = 0;
  }
  return current;
}

function queuedPathLength(point, queue) {
  let total = 0;
  let previous = point;
  queue.forEach((next) => {
    total += distance(previous, next);
    previous = next;
  });
  return total;
}

function traceLength(history) {
  let length = 0;
  for (let index = 1; index < history.length; index += 1) {
    length += distance(history[index - 1].point, history[index].point);
  }
  return length;
}

function pointToTraceDistance(point, history) {
  if (!history.length) return Infinity;
  if (history.length === 1) return distance(point, history[0].point);
  let nearest = Infinity;
  for (let index = 1; index < history.length; index += 1) {
    nearest = Math.min(
      nearest,
      distance(
        point,
        projectPointToSegment(
          point,
          history[index - 1].point,
          history[index].point,
        ),
      ),
    );
  }
  return nearest;
}

function locationForNode(node) {
  return {
    point: node.point,
    pathIndex: node.pathIndex,
    pointIndex: node.pointIndex,
    distance: 0,
  };
}

function drawBackground(context, width, height) {
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, width, height);
}

function drawNetwork(context, geometry, activeLocation, trails, state) {
  geometry.paths.forEach((path) => {
    strokePath(context, path.points, COLORS.route, geometry.pathWidth);
  });

  trails.forEach((trail) => {
    if (trail.length < 2) return;
    strokePath(context, trail, COLORS.signal, geometry.trailWidth);
  });

  endpoint(context, geometry.start, geometry.center, "START");
  goalEndpoint(context, geometry.goal, state.completed);

  const markerPoint = activeLocation?.point;
  if (state.started && markerPoint) {
    context.beginPath();
    context.arc(markerPoint.x, markerPoint.y, 11, 0, Math.PI * 2);
    context.fillStyle = COLORS.complete;
    context.fill();
    context.strokeStyle = COLORS.signal;
    context.lineWidth = 3;
    context.stroke();
  }
}

function strokePath(context, points, color, width) {
  if (points.length < 2) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

function endpoint(context, point, center, label) {
  context.beginPath();
  context.arc(point.x, point.y, 11, 0, Math.PI * 2);
  context.fillStyle = COLORS.signal;
  context.fill();
  context.strokeStyle = COLORS.signal;
  context.lineWidth = 3;
  context.stroke();
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const labelPoint = horizontal
    ? { x: point.x + Math.sign(dx || 1) * 32, y: point.y }
    : { x: point.x, y: point.y + Math.sign(dy || 1) * 28 };
  context.fillStyle = COLORS.signal;
  context.font = "700 9px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, labelPoint.x, labelPoint.y);
}

function goalEndpoint(context, point, complete) {
  context.beginPath();
  context.arc(point.x, point.y, 11, 0, Math.PI * 2);
  context.fillStyle = complete ? COLORS.complete : COLORS.signal;
  context.fill();
  context.strokeStyle = COLORS.signal;
  context.lineWidth = 3;
  context.stroke();
}

function setLiveState(state) {
  const node = document.getElementById("maze-live-status");
  if (!node) return;
  node.dataset.state = state;
  const messages = {
    ready: "Press and hold START",
    seek: "Start at the outlined circle",
    resume: "Return to where you stopped",
    tracking: "Keep tracing",
    "off-route": "Return to the end of the blue trace",
    released: "Press where you stopped to continue",
    complete: "Complete",
  };
  node.textContent = messages[state] || messages.ready;
}

function preventDefault(event) {
  event.preventDefault();
}

function projectPointToSegment(point, from, to) {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const lengthSquared = x * x + y * y;
  if (!lengthSquared) return from;
  const amount = clamp(
    ((point.x - from.x) * x + (point.y - from.y) * y) / lengthSquared,
    0,
    1,
  );
  return {
    x: from.x + x * amount,
    y: from.y + y * amount,
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
