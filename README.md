# I Am Not a Robot

A fictional robot-programming game presented entirely as a human-verification
interface, in the institutional study-page style of `compliance-research-2`.
Word CAPTCHAs, symbol grids, and labyrinth tracing establish human
control; the interface then reinterprets the player's learned responses as robot
behaviour and opens an explicit programming chamber.

## Play locally

Run `npm run dev`, then open `http://127.0.0.1:4173/`.

The active session is the vertical slice from
[docs/covert-priming-design.md](./docs/covert-priming-design.md) §11: opening
checkbox, human verification, covert subliminal preparation, shortening
instructions, robot conversion, chamber activation, `OPEN`, `OBEY`, and the
diegetic shutdown. Allow roughly 10–12 minutes.

Everything after the opening checkbox is diegetic: disclosure, consent, and
aftercare belong on the hosting page, which launches the game with query
parameters:

- `?return=<url>` — the page to return to from the final screen.
- `?audio=0` — start muted.

On localhost only, `?start=<step-id>` jumps to any authored step after the
checkbox (for example `?start=channels` or `?start=receive-a`), and a Skip
button advances one step.

The standalone twelve-maze experiment remains at `/trace`.

## Implementation

Choo, nanohtml, Tone.js, plain CSS, JavaScript ES modules, and a small Node
HTTP server. Browser libraries are bundled locally; there is no build step.

- `src/session/content.js`: symbol vocabulary, phases, and the authored script.
  Every step carries its instruction level (`full`, `word`, `symbol`) and its
  subliminal annotations (`note`, `interrupted`, `flash`); text steps carry
  timed lines and the fragments they reveal.
- `src/session/app.js`: session state, events, timers, and DOM sync.
- `src/session/view.js`: card chrome, tasks, chamber, and the stimulus layers.
- `src/session/stimuli.js`: the subliminal planner and timer runner.
- `src/session/hold.js`: press-and-hold and tap canvas controller.
- `src/session/spiral.js`: full-viewport programming spiral.
- `src/session/audio.js`: Tone.js interface sounds, pulse carrier, and the
  binaural-style layer.
- `src/trace/tracing.js`: continuous pointer tracing through the generated
  labyrinths from `src/maze/routes.js`, with skins.
- `src/maze/`: independent maze experiment.

Earlier prototype modules remain in the tree for reference but are not imported
by the main session.

## Validation

`npm test` checks the authored script (unique ids, every bare symbol taught
before it stands alone, every reveal earned by earlier fragments), the stimulus
planner, a complete playthrough, pause and settings
behaviour, the hold controller, and tracing completion and resume.
