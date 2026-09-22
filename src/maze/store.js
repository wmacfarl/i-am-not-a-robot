import { mountMazeTrace, unmountMazeTrace } from "./controller.js";
import { routeForRound, TRACE_ROUND_COUNT } from "./routes.js";

export default function mazePrototypeStore(state, emitter) {
  state.mazePrototype = state.mazePrototype || createInitialState();
  let transitionTimer = null;
  let syncFrame = null;

  emitter.on("DOMContentLoaded", scheduleRuntimeSync);
  emitter.on("render", scheduleRuntimeSync);

  emitter.on("maze:start", () => {
    clearTimeout(transitionTimer);
    state.mazePrototype = createInitialState();
    state.mazePrototype.phase = "active";
    emitter.emit("render");
  });

  emitter.on("maze:traceComplete", () => {
    const maze = state.mazePrototype;
    if (maze.phase !== "active") return;
    maze.completedCount += 1;
    maze.phase = "transition";
    emitter.emit("render");

    transitionTimer = setTimeout(() => {
      if (maze.completedCount >= TRACE_ROUND_COUNT) {
        maze.phase = "complete";
      } else {
        maze.roundIndex += 1;
        maze.phase = "active";
      }
      emitter.emit("render");
    }, 260);
  });

  emitter.on("maze:reset", () => {
    clearTimeout(transitionTimer);
    unmountMazeTrace();
    state.mazePrototype = createInitialState();
    emitter.emit("render");
  });

  function scheduleRuntimeSync() {
    if (syncFrame) cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(() => {
      syncFrame = requestAnimationFrame(() => {
        syncFrame = null;
        syncRuntime();
      });
    });
  }

  function syncRuntime() {
    const onMazeRoute = window.location.pathname.replace(/\/$/, "") === "/trace";
    document.title = onMazeRoute
      ? "Continuous Input Test | I Am Not a Robot"
      : "I Am Not a Robot | Automated Verification";
    const maze = state.mazePrototype;
    if (onMazeRoute && maze.phase === "active") {
      mountMazeTrace(
        document.getElementById("maze-trace-canvas"),
        routeForRound(maze.roundIndex),
        () => emitter.emit("maze:traceComplete"),
      );
    } else {
      unmountMazeTrace();
    }
  }
}

export function createInitialState() {
  return {
    phase: "intro",
    roundIndex: 0,
    completedCount: 0,
  };
}
