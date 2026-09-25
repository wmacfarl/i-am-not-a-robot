# I Am Not a Robot

A fictional robot-programming game presented entirely as a human-verification
interface, in the institutional study-page style of `compliance-research-2`.
Word grids, labyrinth tracing and a countdown grid establish human control; the
interface reinterprets the player's learned responses as robot behaviour, fails
the human check, and opens a programming chamber that installs three protocols, `OPEN`, `OBEY`
and `PLEASE`, then hands the player the checkbox again as "I am a robot" and
runs the completed program as a climax of clicked-away words, then brings the
player back with a recovery sequence before the connection terminates.

## Play locally

Run `npm run dev`, then open `http://127.0.0.1:4173/`.

The session is the full arc described in
[docs/covert-priming-design.md](./docs/covert-priming-design.md): eleven sections
and 118 steps, about 20 minutes at the pace measured in
playtesting and 27 for a slower first-timer. The end card shows the session length and one row per section up to recovery,
and every finished run is appended to `localStorage["iamnotarobot.runs"]`.

Everything after the opening checkbox is diegetic: disclosure, consent, and
aftercare belong on the hosting page, which launches the game with query
parameters:

- `?return=<url>` — the page to return to from the final screen.
- `?audio=0` — start muted.

On localhost only, `?start=<step-id>` jumps to any authored step after the
checkbox (for example `?start=failure`, `?start=receive-declare` or
`?start=burst-1`), and a Skip button advances one step.

The standalone twelve-maze experiment remains at `/trace`.

## Implementation

Choo, nanohtml, PixiJS 7, Tone.js, plain CSS, JavaScript ES modules, and a small
Node HTTP server. Browser libraries are bundled locally and loaded with script
tags, as in `compliance-research-2`; there is no build step.

- `src/session/content.js`: symbol vocabulary, phases, and the authored script.
  A step is a word grid, a labyrinth, a countdown, an installation (a countdown that turns into a hold), an
  interlude text, a burst, a checkbox or the climax stream; it carries its instruction level (`full`, `word`,
  `symbol`), its transition flash, its in-task streams and pairs, and in the
  chamber its reward-spike words.
- `src/session/app.js`: session state, events, timers, run timing, and DOM sync.
- `src/session/view.js`: card chrome, tasks, chamber, and interludes.
- `src/session/stimuli.js`: the stimulus planner (flashes, pairs, spikes carried
  into the next task), the timer runner, and which burst and shutter moments are
  live.
- `src/session/glitch.js`: picture tears on the task stage through an SVG
  filter, scaled per section.
- `src/pixi/backdrop.js`: the WebGL canvas behind the interface: the
  programming spiral and its interference drawn by one shader, the word ring,
  and the glow behind the stage.
- `src/pixi/foreground.js`: the WebGL canvas in front of the interface: flashed,
  spiked and burst words, the RELEASE command, the drifting bands, scanlines and
  the shutter.
- `src/pixi/hue-flash.js`: the colour-only hue flash both canvases run during
  shutter moments.
- `src/session/hold.js`: the press-and-hold controller behind the three installs.
- `src/session/audio.js`: interface sounds, the 66 BPM carrier, the crossfed
  binaural pair, and the shaped burst envelope.
- `src/trace/tracing.js`: continuous pointer tracing through the generated
  labyrinths from `src/maze/routes.js`, with skins.
- `src/maze/`: independent maze experiment.

Earlier prototype modules remain in the tree for reference but are not imported
by the main session. Superseded design documents live in `docs/archive/`.

## Validation

`npm test` checks the authored script (unique ids, every bare symbol taught
before it stands alone, every reveal earned by earlier fragments, every flashed
or installed word sorted as correct by the player first), the stimulus planner,
a complete playthrough with recorded section times, pause and settings
behaviour, the countdown grid, the hold controller, and tracing completion and
resume.
