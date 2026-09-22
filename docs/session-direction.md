# Current session direction

This direction supersedes conflicting proposals in the original game-design draft.

## Purpose and session

A fictional robot-transformation and programming game: familiar, satisfying
activities develop into practicing and running robot routines. There is no
research study, behavioral measurement, or requirement to prove a psychological
effect. Metronome timing is not a core requirement.

The provisional arc, roughly 20–25 minutes, is:

1. **Human verification:** ordinary category CAPTCHAs and simple tracing establish
   the controls, premise, and satisfying completion feedback.
2. **Familiar motions:** repeat vocabulary and related routes; word clouds move
   from describing a category to describing the task.
3. **How you are responding:** interleave tracing with clouds inviting descriptions
   such as deliberate, familiar, smooth, hesitant, automatic, and absorbing.
4. **Automatic feels good:** allow substantial time for flowing routes, familiar
   gestures, and associations with ease, comfort, satisfaction, and pleasure.
5. **Robot response accepted:** identifying words about robot behavior becomes
   performing familiar actions under FOLLOW, REPEAT, and EXECUTE instructions.
6. **Programming interface:** practice CENTER and FOLLOW, reduce guidance, and
   recall movements through recognizable cues. Clouds connect signals,
   instructions, repetition, and programming.
7. **Run the program:** combine familiar selections and movements with fewer
   explanations and sustained continuity.
8. **Close the session:** settle motion, end task expectations, and reorient.

Robot identity happens with substantial play remaining. Familiar action becoming
enjoyable is the important middle, preceding explicit programming.

## Language and interaction

Word clouds make reading part of the task. Tracing supplies sustained physical
engagement. Share visual forms and completion feedback without requiring a
common beat or rigid alternation.

Cloud instructions progressively move inward:

- Select all words related to repetition.
- Select all words that describe this task.
- Select all words that describe how you are responding.
- Select all words that fit your experience right now.

Category tasks have understandable matching answers. Experience prompts accept
the player's selections, including mixed descriptions, without hidden preferred
answers or surveys. Recurring vocabulary can change position to keep reading useful.

The familiar word **Correct** and acceptance chime change meaning: correct
classification, accepted self-description, successful robotic instruction, then
completed routine. **Correct. Robot response accepted.** marks the shift from
identifying robot behavior to performing it. No calculated classification is needed.

## Presentation

Use `compliance-research-2` as the primary presentation reference:

- Light gray page, centered white card, restrained blue-gray palette.
- Plain sans-serif typography, modest borders, ordinary controls, clear hierarchy.
- Phone-first layout, legible word tiles, generous touch targets.
- Brief procedural instructions and short acceptance feedback.
- Stable institutional page structure across verification and programming.
- Gradual visual warming and restrained motion; prompt text stays crisp.
- Sparse audio and one consistent, satisfying acceptance vocabulary.
- Accessible pause, mute, intensity settings, and exit.

Express robot programming through changing tasks, labels, and language within
that familiar interface. Avoid a sudden cockpit or neon sci-fi reskin. The fiction
is an automated verification service becoming a programming interface. Omit
accuracy readouts, prediction confidence, behavioral reports, survey framing,
and invented data-collection claims.

## Target stack

Match `compliance-research-2`: plain JavaScript ES modules, locally bundled Choo
and nanohtml for routing/state/views, PixiJS for visual stimuli, Tone.js for audio,
plain CSS, and a minimal Node HTTP development server. Canvas and pointer input
support tracing. Keep authored content separate from flow, views, visuals, and audio.

The active MVP now uses this stack, including the locally bundled Tone.js audio layer. The previous direct Web Audio module remains only in the historical prototype code.

Keep operational state for activities, selection matching, tracing progress,
animation, and settings. Discard behavioral statistics and reporting in the
revised implementation. Animation timing does not imply response measurement.

