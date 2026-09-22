import { TRACE_ROUND_COUNT } from "../maze/routes.js";

export function mazePrototypeView(state, emit) {
  const maze = state.mazePrototype;
  if (maze.phase === "intro") return introView(emit);
  if (maze.phase === "complete") return completeView(emit);
  return tracingView(maze, emit);
}

function introView(emit) {
  return html`
    <body class="maze-test-body">
      <main class="maze-test maze-test-intro">
        <section>
          <p class="maze-test-kicker">Maze tracing prototype</p>
          <h1>Trace to the center.</h1>
          <p>
            Press and hold the blue start point, then trace the path inward to the blue center point.
          </p>
          <button type="button" onclick=${() => emit("maze:start")}>Start</button>
          <a href="/">Back</a>
        </section>
      </main>
    </body>
  `;
}

function tracingView(maze, emit) {
  return html`
    <body class="maze-test-body maze-test-playing">
      <main class="maze-test maze-test-session">
        <header class="maze-test-header">
          <div>
            <strong>Maze ${maze.roundIndex + 1} of ${TRACE_ROUND_COUNT}</strong>
          </div>
          <button type="button" onclick=${() => emit("maze:reset")}>End</button>
        </header>

        <p class="maze-test-instruction">
          Hold the blue start point and trace to the center.
        </p>

        <div class="maze-canvas-shell">
          <canvas
            id="maze-trace-canvas"
            aria-label="Maze tracing area. Hold the blue start point and trace the path to the center."
          ></canvas>
        </div>

        <p id="maze-live-status" class="maze-test-status" role="status">
          Press and hold START
        </p>
      </main>
    </body>
  `;
}

function completeView(emit) {
  return html`
    <body class="maze-test-body">
      <main class="maze-test maze-test-intro">
        <section>
          <p class="maze-test-kicker">Maze tracing prototype</p>
          <h1>Finished.</h1>
          <p>You reached the center of all twelve mazes.</p>
          <button type="button" onclick=${() => emit("maze:start")}>Again</button>
          <a href="/">Back</a>
        </section>
      </main>
    </body>
  `;
}
