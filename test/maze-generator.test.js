import test from "node:test";
import assert from "node:assert/strict";
import {
  routeForRound,
  TRACE_ROUND_COUNT,
  validateMazeTopology,
} from "../src/maze/routes.js";

test("every generated maze is one continuous route with no non-goal dead ends", () => {
  for (let round = 0; round < TRACE_ROUND_COUNT; round += 1) {
    const result = validateMazeTopology(routeForRound(round));
    assert.equal(result.valid, true, `maze ${round + 1} should have valid topology`);
    assert.equal(result.nonGoalDeadEnds, 0, `maze ${round + 1} should have no dead ends`);
  }
});

test("the series progresses monotonically from rectilinear to round and spiral", () => {
  const mazes = Array.from({ length: TRACE_ROUND_COUNT }, (_, index) => routeForRound(index));
  for (let index = 1; index < mazes.length; index += 1) {
    assert.ok(
      mazes[index].geometry.roundness >= mazes[index - 1].geometry.roundness,
      `maze ${index + 1} should not become more rectilinear`,
    );
    assert.ok(
      mazes[index].geometry.spiral >= mazes[index - 1].geometry.spiral,
      `maze ${index + 1} should not become less spiral`,
    );
  }
  assert.equal(mazes[0].geometry.roundness, 0);
  assert.equal(mazes[0].geometry.spiral, 0);
  assert.equal(mazes.at(-1).geometry.roundness, 1);
  assert.equal(mazes.at(-1).geometry.spiral, 1);
});

test("complexity grows without changing the interaction grammar", () => {
  const first = routeForRound(0).geometry;
  const last = routeForRound(TRACE_ROUND_COUNT - 1).geometry;
  assert.ok(last.ringCount > first.ringCount);
  assert.ok(last.bridgeCount > first.bridgeCount);
  assert.ok(last.paths[0].points.length > first.paths[0].points.length);
});

test("the path network stays dense enough for roughly equal paths and gaps", () => {
  for (let round = 0; round < TRACE_ROUND_COUNT; round += 1) {
    const geometry = routeForRound(round).geometry;
    assert.ok(geometry.pitch <= 0.1, `maze ${round + 1} should not have broad empty bands`);
    assert.ok(geometry.pitch >= 0.03, `maze ${round + 1} should keep distinct neighboring paths`);
  }
});

test("each maze uses exact constant inset spacing", () => {
  for (let round = 0; round < TRACE_ROUND_COUNT; round += 1) {
    const geometry = routeForRound(round).geometry;
    assert.ok(
      Math.abs(
        geometry.pitch * (geometry.ringCount - 1) -
          (geometry.outerRadius - geometry.innerRadius),
      ) < 1e-9,
      `maze ${round + 1} should keep exact spacing between turns`,
    );
  }
});

test("every ring in a maze shares one curvature rule", () => {
  for (let round = 0; round < TRACE_ROUND_COUNT; round += 1) {
    const geometry = routeForRound(round).geometry;
    assert.equal(geometry.cornerRatio, geometry.roundness);
  }
});

test("maze one is literally orthogonal", () => {
  const geometry = routeForRound(0).geometry;
  assert.equal(geometry.orthogonal, true);
  const points = geometry.paths[0].points;
  points.slice(1).forEach((point, index) => {
    const previous = points[index];
    const dx = Math.abs(point.x - previous.x);
    const dy = Math.abs(point.y - previous.y);
    assert.ok(dx < 1e-9 || dy < 1e-9, `segment ${index + 1} should be perpendicular`);
  });
});

test("the continuous route contains no visible geometric jumps", () => {
  for (let round = 0; round < TRACE_ROUND_COUNT; round += 1) {
    const points = routeForRound(round).geometry.paths[0].points;
    const largestStep = points.slice(1).reduce((largest, point, index) => {
      const previous = points[index];
      return Math.max(largest, Math.hypot(point.x - previous.x, point.y - previous.y));
    }, 0);
    assert.ok(largestStep < 0.025, `maze ${round + 1} should remain continuous`);
  }
});

test("the opening mazes vary topology and layout from the first round", () => {
  const signatures = Array.from({ length: 4 }, (_, index) => {
    const geometry = routeForRound(index).geometry;
    const route = geometry.paths[0].points;
    const routeSamples = [0.25, 0.5, 0.75].map((progress) => {
      const point = route[Math.floor((route.length - 1) * progress)];
      return [point.x.toFixed(3), point.y.toFixed(3)];
    });
    return JSON.stringify({
      rings: geometry.ringCount,
      bridges: geometry.bridgeCount,
      start: [geometry.start.x.toFixed(3), geometry.start.y.toFixed(3)],
      routeSamples,
    });
  });
  assert.equal(new Set(signatures).size, 4);
});
