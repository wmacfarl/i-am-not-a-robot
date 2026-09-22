# I Am Not a Robot

A mobile-first fictional robot-transformation game. Word-selection CAPTCHAs and
continuous tracing develop from human verification into familiar robot routines.
The presentation follows the restrained institutional style of `compliance-research-2`.

## Play locally

Run `npm run dev`, then open `http://127.0.0.1:4173/`.

The complete MVP contains 43 authored steps across seven sections, followed by a
self-paced closing sequence. Allow roughly 10–15 minutes; this is a provisional
estimate, not an enforced duration. The planned full session is longer.

- Begin verification starts directly; age gating belongs on the itch page.
- Category clouds have matching answers and allow correction.
- Experience clouds accept any selection, including none.
- Repeated tracing leads into CENTER and FOLLOW practice, fading guidance, and cue recall.
- Correct feedback changes from human verification to robot execution.
- Successful tasks chime, celebrate briefly, and advance automatically.
- Tracing preserves progress after lifting, pausing, and opening settings.
- Tracing uses the authored guidance level; completing the route advances the task.
- The header settings button pauses play and contains mute and ending.
- Activities resize to the viewport without a floating control bar or page scrolling.
- No behavioral statistics, response history, or data transmission.

The standalone twelve-maze experiment remains at `/trace`.

## Implementation

Choo, nanohtml, PixiJS, Tone.js, plain CSS, JavaScript ES modules, and a small Node
HTTP server. Browser libraries are bundled locally; there is no build step.

- `src/session/content.js`: authored sections, clouds, routines, and closing copy.
- `src/session/app.js`: session state, events, and views.
- `src/session/audio.js`: optional Tone.js selection and acceptance sounds.
- `src/session/style.css`: institutional session presentation and responsive layout.
- `src/trace/tracing.js`: continuous pointer tracing with resumable progress.
- `src/pixi/stimulus.js`: shared visual background.
- `src/maze/`: independent maze experiment.

Earlier prototype modules remain in the tree for reference but are not imported
by the main session. The active session does not use their measurement logic.

## Validation

`npm test` checks maze geometry, authored content, session completion, correction,
input blocking, and tracing completion/resume through pointer event handlers.

See [current session direction](./docs/session-direction.md) for the design.
The [original draft](./docs/game-design.md) is historical.



