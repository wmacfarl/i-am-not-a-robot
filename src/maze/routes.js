export const TRACE_ROUND_COUNT = 12;

const TAU = Math.PI * 2;
const RING_COUNTS = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];

/**
 * Construct a unicursal labyrinth from concentric inset rings.
 *
 * Openings advance around the perimeter in a fixed phase sequence. Maze one
 * is strictly orthogonal; later mazes add curvature monotonically toward the
 * center while preserving the same ring spacing and traversal grammar.
 */
export function routeForRound(roundIndex) {
  const index = clamp(Math.floor(roundIndex), 0, TRACE_ROUND_COUNT - 1);
  const progress = index / (TRACE_ROUND_COUNT - 1);
  const roundness = smoothstep(0.02, 0.78, progress);
  const spiral = smoothstep(0.42, 1, progress);
  const ringCount = RING_COUNTS[index];
  const transitionCount = ringCount - 1;
  const outerRadius = 0.445;
  const innerRadius = 0.13;
  const pitch = (outerRadius - innerRadius) / transitionCount;
  const direction = index % 2 === 0 ? -1 : 1;
  const baseExitPhase = positiveModulo(0.25 + (index % 4) * 0.25, 1);
  const rings = Array.from({ length: ringCount }, (_, ringIndex) => {
    const radius = outerRadius - pitch * ringIndex;
    const cornerRatio = roundness;
    return {
      radius,
      cornerRadius: radius * cornerRatio,
      center: { x: 0.5, y: 0.5 },
    };
  });
  const routePoints = [];
  let entryPhase = baseExitPhase + direction * 0.25;

  rings.forEach((ring, ringIndex) => {
    const exitPhase = baseExitPhase - direction * ringIndex * 0.25;
    appendPoints(
      routePoints,
      sampleRoundedSquareArc(ring, entryPhase, exitPhase, direction),
    );
    if (ringIndex < rings.length - 1) {
      const curveAmount = roundness;
      const phaseAdvance = direction * 0.045 * curveAmount;
      appendPoints(
        routePoints,
        sampleRingBridge(
          ring,
          rings[ringIndex + 1],
          exitPhase,
          phaseAdvance,
          curveAmount,
          48,
        ),
      );
      entryPhase = exitPhase + phaseAdvance;
    } else {
      appendPoints(
        routePoints,
        sampleGoalFinish(ring, exitPhase, direction, roundness, 144),
      );
    }
  });
  const uniformlySampledRoute = resamplePolyline(routePoints, 0.0035);
  const paths = [
    {
      id: "continuous-route",
      kind: "goal",
      fromRing: 0,
      closed: false,
      points: uniformlySampledRoute,
    },
  ];
  const stage = stageFor(progress);
  return {
    id: `generated-maze-${index + 1}`,
    roundIndex: index,
    ...stage,
    geometry: {
      paths,
      start: { ...uniformlySampledRoute[0] },
      goal: { x: 0.5, y: 0.5 },
      center: { x: 0.5, y: 0.5 },
      ringCount,
      bridgeCount: transitionCount,
      outerRadius,
      innerRadius,
      pitch,
      cornerRatio: roundness,
      orthogonal: roundness === 0,
      roundness,
      spiral,
    },
  };
}

export function validateMazeTopology(task) {
  const paths = task?.geometry?.paths || [];
  const route = paths.length === 1 ? paths[0] : null;
  const routeStartsCorrectly = route && pointsEqual(route.points[0], task.geometry.start);
  const routeEndsCorrectly =
    route && pointsEqual(route.points[route.points.length - 1], task.geometry.goal);
  const valid =
    route?.kind === "goal" &&
    !route.closed &&
    route.points.length > task?.geometry?.ringCount * 40 &&
    routeStartsCorrectly &&
    routeEndsCorrectly;
  return {
    valid,
    cycleCount: 0,
    bridgeCount: task?.geometry?.bridgeCount || 0,
    goalBridgeCount: route?.kind === "goal" ? 1 : 0,
    nonGoalDeadEnds: valid ? 0 : null,
  };
}

function stageFor(progress) {
  if (progress < 0.27) {
    return {
      label: "RECTILINEAR LATTICE",
      instruction: "Trace from START to CENTER. Every branch loops back.",
      signal: "FOLLOW",
    };
  }
  if (progress < 0.58) {
    return {
      label: "CURVATURE CALIBRATION",
      instruction: "Keep contact as the square routes begin to round.",
      signal: "CONTINUE",
    };
  }
  if (progress < 0.82) {
    return {
      label: "RADIAL ROUTING",
      instruction: "Use the connected loops to find a route inward.",
      signal: "INWARD",
    };
  }
  return {
    label: "SPIRAL ROUTING",
    instruction: "Follow any continuous route toward the center signal.",
    signal: "CENTER",
  };
}

function sampleRoundedSquareArc(ring, fromPhase, targetPhase, direction) {
  const sweep = directedPhaseSweep(fromPhase, targetPhase, direction);
  if (ring.cornerRadius < 1e-9) {
    const endPhase = fromPhase + sweep;
    const minimum = Math.min(fromPhase, endPhase);
    const maximum = Math.max(fromPhase, endPhase);
    const corners = [];
    for (
      let eighth = Math.floor(minimum * 8) - 1;
      eighth <= Math.ceil(maximum * 8) + 1;
      eighth += 1
    ) {
      if (Math.abs(eighth) % 2 !== 1) continue;
      const phase = eighth / 8;
      if (phase > minimum + 1e-9 && phase < maximum - 1e-9) corners.push(phase);
    }
    corners.sort((left, right) => (direction > 0 ? left - right : right - left));
    return [fromPhase, ...corners, endPhase].map((phase) =>
      roundedSquarePoint(ring, phase),
    );
  }

  const count = Math.max(32, Math.ceil(Math.abs(sweep) * 512));
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    points.push(roundedSquarePoint(ring, fromPhase + sweep * (index / count)));
  }
  return points;
}

function directedPhaseSweep(fromPhase, targetPhase, direction) {
  const unsigned =
    direction > 0
      ? positiveModulo(targetPhase - fromPhase, 1)
      : positiveModulo(fromPhase - targetPhase, 1);
  return (unsigned < 0.08 ? unsigned + 1 : unsigned) * direction;
}

function sampleRingBridge(
  fromRing,
  toRing,
  fromPhase,
  phaseAdvance,
  curveAmount,
  count,
) {
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const eased = t * t * (3 - 2 * t);
    const radialProgress = lerp(t, eased, curveAmount);
    points.push(
      roundedSquarePoint(
        {
          radius: lerp(fromRing.radius, toRing.radius, radialProgress),
          cornerRadius: lerp(
            fromRing.cornerRadius,
            toRing.cornerRadius,
            radialProgress,
          ),
          center: fromRing.center,
        },
        fromPhase + phaseAdvance * t,
      ),
    );
  }
  return points;
}

function sampleGoalFinish(ring, startPhase, direction, curveAmount, count) {
  const points = [];
  const startAngle = -Math.PI / 2 + positiveModulo(startPhase, 1) * TAU;
  const sweep = direction * TAU * 0.72 * curveAmount;
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const eased = t * t * (3 - 2 * t);
    const radialProgress = lerp(t, eased, curveAmount);
    const radius = ring.radius * (1 - radialProgress);
    const angle = startAngle + sweep * t;
    points.push({
      x: ring.center.x + Math.cos(angle) * radius,
      y: ring.center.y + Math.sin(angle) * radius,
    });
  }
  points[points.length - 1] = { ...ring.center };
  return points;
}

function roundedSquarePoint(ring, phase) {
  const normalized = positiveModulo(phase, 1);
  const quarter = Math.min(3, Math.floor(normalized * 4));
  const quarterProgress = normalized * 4 - quarter;
  const radius = ring.radius;
  const cornerRadius = clamp(ring.cornerRadius, 0, radius);
  const straightLength = radius - cornerRadius;
  const arcLength = (Math.PI / 2) * cornerRadius;
  const quarterLength = straightLength * 2 + arcLength;
  const distanceAlong = quarterProgress * quarterLength;
  let x;
  let y;

  if (distanceAlong <= straightLength || cornerRadius === 0) {
    x = Math.min(distanceAlong, straightLength);
    y = -radius;
  } else if (distanceAlong <= straightLength + arcLength) {
    const arcProgress = (distanceAlong - straightLength) / arcLength;
    const angle = -Math.PI / 2 + arcProgress * (Math.PI / 2);
    x = radius - cornerRadius + Math.cos(angle) * cornerRadius;
    y = -radius + cornerRadius + Math.sin(angle) * cornerRadius;
  } else {
    x = radius;
    y = -radius + cornerRadius + (distanceAlong - straightLength - arcLength);
  }

  const rotation = quarter * (Math.PI / 2);
  return {
    x: ring.center.x + x * Math.cos(rotation) - y * Math.sin(rotation),
    y: ring.center.y + x * Math.sin(rotation) + y * Math.cos(rotation),
  };
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function appendPoints(target, addition) {
  if (!addition.length) return;
  target.push(...(target.length ? addition.slice(1) : addition));
}

function resamplePolyline(points, spacing) {
  if (points.length < 2) return [...points];
  const sampled = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / spacing));
    for (let step = 1; step <= steps; step += 1) {
      const amount = step / steps;
      sampled.push({
        x: lerp(from.x, to.x, amount),
        y: lerp(from.y, to.y, amount),
      });
    }
  }
  return sampled;
}

function pointsEqual(left, right) {
  return Math.abs(left.x - right.x) < 1e-9 && Math.abs(left.y - right.y) < 1e-9;
}

function smoothstep(from, to, value) {
  const t = clamp((value - from) / Math.max(0.0001, to - from), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
