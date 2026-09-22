# Perceptible Conditioning: Mechanics and Implementation Plan

Status: proposed extension to the active session  
Target branch: codex/rebuild-from-scratch  
Related documents: [current session direction](./session-direction.md) and [historical game design](./game-design.md)

## 1. Product decision

The game should simulate covert conditioning without attempting covert manipulation.

The player explicitly opts into an adult robot-transformation fantasy before play. Inside the fiction, the verification interface may claim that messages were unnoticed, choices were predicted, and responses were programmed. Outside the fiction:

- every stimulus is part of the opted-in session;
- pause, mute, intensity controls, and exit remain genuine and immediately available;
- the application does not run in the background, send notifications, collect hidden behavioral profiles, or continue conditioning after the session;
- the application makes no claim that it can reduce intelligence, create sexual consent, or override values;
- reduced-motion and non-flashing modes preserve the full narrative and task structure.

The intended effect is a convincing subjective sequence:

1. “I saw something, but I was busy with the task.”
2. “That message keeps seeming familiar.”
3. “My hand knows this interaction now.”
4. “The interface rewards the response before I inspect it.”
5. “The system can describe what just happened in robot-programming language.”
6. “For the duration of the scene, following the next cue feels simpler than stepping outside the loop.”

That sequence is achievable with normal game-design tools: divided attention, repetition, learned interaction, expectation, feedback, authored escalation, and reinterpretation. It should not be described internally as scientifically proven brainwashing.

## 2. Translating the fantasy into mechanics

| Fantasy target | Deliverable game sensation | Concrete mechanism | Claim the game must avoid |
| --- | --- | --- | --- |
| “Subliminal” or imperceptible | The player notices fragments but cannot always quote or place them | Brief peripheral copy, competing task demands, interrupted phrases, immediate replacement, later recurrence | That unreadable frames reliably implant complex desires |
| “Unconscious conditioning” | A later cue feels familiar and the response is easy | Repeated cue/action pairs, stable layouts, fading guidance, delayed naming of the learned routine | That the application changed the player without participation |
| “Too dumb to think” | Attention narrows to the next simple action; reflection is deferred | Short instructions, continuous tracing, quick task handoffs, limited choices, visual continuity | That IQ or general reasoning has been reduced |
| “Too aroused to think” | Erotic framing and task flow compete with reflective narration | Opt-in adult content layer, sensual audio/visual tone, anticipation, self-description, scene pacing | That covert stimuli can manufacture sexual consent or dependable arousal |
| “Wants approval and praise” | The acceptance signal becomes anticipated and emotionally meaningful | One consistent success sound, visual acknowledgement, increasingly personal but bounded feedback | That intermittent punishment or dependency engineering is needed |
| “Robot programmed to serve” | Instructions and responses feel like parts of one familiar routine | CAPTCHA classification becomes execution; tracing becomes FOLLOW; feedback becomes PROGRAM APPLIED | That the player has surrendered real-world agency |
| “Non-consensual” fiction | The interface treats the fictional character as an object under test | Cold procedural voice, system labels, in-fiction inevitability | Hiding the real content, blocking exit, or treating real withdrawal as part of the game |

The key design move is not to make a message physically invisible. It is to make it visible but lower-priority than the task occupying focal attention. The player should be able to say, “I definitely saw that,” while also feeling, “I did not stop to process it.”

## 3. Core loop

Each loop contains four functional beats:

1. **Focal task:** classify words, complete a CAPTCHA, or trace a route.
2. **Secondary stimulus:** a visible fragment appears in the margin, beneath feedback, inside the route, or during a transition.
3. **Acceptance:** the same chime and confirmation language reward completion.
4. **Reinterpretation:** a later prompt describes the ordinary learned response as robot programming.

~~~mermaid
flowchart TD
    A["Focal task"] --> B["Visible secondary fragment"]
    B --> C["Action completed"]
    C --> D["Acceptance signal"]
    D --> E["Later cue or repeated phrase"]
    E --> F["Robot-programming interpretation"]
    F --> A
~~~

A single loop does very little. The effect comes from repeating the grammar while changing its meaning.

## 4. Stimulus system: perceptible, unattended, recoverable

### 4.1 Stimulus modes

Implement five authored display modes. None should rely on below-threshold presentation.

| Mode | Presentation | Player experience | Use |
| --- | --- | --- | --- |
| foreground | Normal prompt or feedback copy | Fully read and understood | Establish vocabulary and rules |
| peripheral | Small but readable copy outside the task’s focal area | Seen, often not inspected | Create divided attention |
| interrupted | Phrase appears, then is replaced by task feedback | Partial encoding and uncertainty | Make fragments feel fleeting |
| embedded | Word or symbol appears inside tiles, routes, labels, or status text | Processed as part of the task surface | Bind vocabulary to action |
| echo | A previously peripheral fragment returns as normal copy | Recognition without certain source memory | Deliver the “it was already there” payoff |

Use authored minimum readable presentation, not one-frame flashes. A practical starting range is roughly 400–1200 ms for interrupted copy, adjusted by readability testing and the player’s intensity setting. Peripheral and embedded copy may remain longer. The success criterion is “noticed but not fully attended,” not “objectively invisible.”

### 4.2 Placement rules

Secondary stimuli should appear at moments when the interface already has a legitimate visual event:

- while a CAPTCHA grid settles into place;
- beside a word cloud while the player scans;
- immediately after a selection but before acceptance;
- at a maze junction or along a traced route;
- beneath the acceptance label as a secondary status line;
- during a short transition between two related tasks.

Do not cover controls, masquerade as browser chrome, or display outside the game surface.

### 4.3 Phrase lifecycle

Every important phrase should pass through a four-stage lifecycle:

1. **Fragment:** one word or incomplete phrase appears peripherally.
2. **Recurrence:** the same concept appears in a different task context.
3. **Action:** the player performs an interaction that concretely exemplifies it.
4. **Naming:** the interface presents the complete phrase as an interpretation.

Example, kept procedural:

| Stage | Display | Mechanic |
| --- | --- | --- |
| Fragment | FOLLOW | Small route label during an ordinary trace |
| Recurrence | FOLLOW SIGNAL | Status copy during the next path |
| Action | Follow a moving guide through a familiar route | Tracing |
| Naming | ROBOT RESPONSE: FOLLOW | Acceptance feedback |

The late statement feels discovered because the game has earned it through interaction.

## 5. Task-specific design

### 5.1 Fake CAPTCHA shell

The fake CAPTCHA supplies legitimacy, simple decisions, and a stable visual frame.

Start with familiar elements:

- checkbox labeled “I am not a robot”;
- image or symbol grid;
- short instruction;
- progress indicator;
- neutral error and acceptance language.

Progression:

1. **Verification:** select matching symbols or words.
2. **Consistency check:** repeat a familiar layout with minor changes.
3. **Automation check:** reuse the same action pattern while shortening explanatory copy.
4. **Identity check:** categories shift from external objects to descriptions of the task and response.
5. **Robot confirmation:** the action itself, not a computed psychological score, is accepted as a robot response.
6. **Programming:** the CAPTCHA is now an instruction surface; selecting the requested item executes a routine.

Concrete CAPTCHA patterns:

- Select every item related to repetition.
- Select every symbol previously associated with FOLLOW.
- Select the words that describe this task.
- Select the words that fit your experience now. Any selection, including none, is accepted.
- Click the familiar position after the cue appears.
- Complete a known sequence with one missing symbol.

Avoid dishonest “accuracy declined” or “we measured your mind” readouts. The current application intentionally does not collect behavioral statistics. The system may make fictional categorical statements based on authored progression, not fabricated personal analysis.

### 5.2 Word categorization

Word clouds do three jobs: occupy reading attention, repeat semantic material, and let the player participate in the interpretation.

Use four prompt families:

| Family | Example instruction | Purpose |
| --- | --- | --- |
| external category | Select words related to repetition | Establish honest rules |
| task description | Select words that describe this task | Move attention inward |
| response description | Select words that describe how you are responding | Invite self-observation |
| present experience | Select words that fit your experience right now | Allow player-authored meaning |

Author recurring vocabulary clusters:

- repetition: repeat, again, familiar, routine, pattern;
- attention: center, focus, follow, signal, return;
- automaticity: smooth, easy, expected, practiced, immediate;
- acceptance: correct, accepted, approved, useful, complete;
- robot fiction: instruction, routine, execute, program, unit;
- erotic layer, if enabled: use content appropriate to the selected adult intensity and keep it separate from the factual system layer.

Important rules:

- objective category tasks have understandable matching answers and allow correction;
- experience prompts have no hidden preferred answer;
- tile positions change so reading still matters;
- “Correct” migrates from factual classification to accepted self-description to successful execution;
- no answer to an experience prompt should revoke safety controls or be treated as real-world consent.

### 5.3 Maze and tracing

Tracing produces the strongest “my hand already knows” sensation because it turns repetition into movement.

Progression:

1. **Voluntary liveness test:** visible start, destination, full route, self-paced movement.
2. **Familiar route:** repeat recognizable geometry.
3. **Guided route:** add a moving point or illuminated segment.
4. **Fading guidance:** progressively remove route detail while preserving generous tolerance.
5. **Cue recall:** show the route symbol, then present the familiar motion.
6. **Robot routine:** label the same interaction CENTER, FOLLOW, RETURN, or EXECUTE.
7. **Continuous program:** connect several familiar routes with minimal explanatory interruption.

The route system should remain forgiving:

- preserve progress after lifting or pausing;
- use wide tolerances;
- avoid full restarts for ordinary drift;
- treat correction as guidance rather than failure;
- scale to the viewport;
- do not disable the settings button during tracing.

Messages can be embedded at route junctions or revealed just ahead of the finger. They should remain legible in the reduced-motion mode and should never require flashing to work.

### 5.4 Approval and praise

Use one consistent acceptance token across the session:

- the same short chime;
- a brief visual pulse;
- one concise line of confirmation;
- automatic advance after a stable delay.

Its semantic progression:

1. Correct.
2. Human response accepted.
3. Familiar response accepted.
4. Expected response accepted.
5. Robot response accepted.
6. Program applied.
7. Routine complete.

This creates anticipation without using punishment or opaque variable-ratio rewards. Praise can become warmer and more direct after the robot transition, but should remain attached to in-game actions. Avoid claims that the system knows the player’s private feelings.

## 6. The “too occupied to reflect” sequence

The game cannot reduce IQ. It can create a temporary, voluntary experience of narrowed attention by keeping the next action easier than reflective analysis.

Use the following composition:

- one dominant task at a time;
- short, concrete instructions;
- familiar controls;
- no dead air between successful actions;
- a secondary stream of readable but nonessential copy;
- repeated audio/visual acceptance;
- occasional self-description prompts that reinterpret the immediately preceding action;
- a deliberate reorientation sequence at the end.

Do not simply increase speed. Excessive speed creates frustration and breaks absorption. The target is fluency: the player should have enough capacity to succeed, but little incentive to stop and audit every secondary fragment.

A good test is whether the player can continue accurately while later recalling the gist of the secondary stream but not every placement or exact wording.

## 7. Authored session plan

The active session already contains 43 steps across seven sections. Preserve that content model and refine it into the following arc.

| Phase | Approx. time | Primary mechanics | Secondary-stimulus role | Narrative result |
| --- | ---: | --- | --- | --- |
| 0. Setup | 1 min | Intensity, audio, motion, exit explanation | None | Real consent and controls established |
| 1. Human verification | 3–4 min | Objective word CAPTCHA, simple trace | Neutral peripheral system terms | Interface earns trust |
| 2. Familiar motion | 3 min | Repeated clouds and routes | Fragments recur around completion | Actions begin to feel practiced |
| 3. Response observation | 3 min | Task/experience clouds, fading guidance | Phrases describe attention and ease | Player notices automaticity |
| 4. Robot confirmation | 2 min | Familiar cue/action tests | Earlier fragments return in full | Robot identity becomes the interpretation |
| 5. Programming | 7–9 min | CENTER/FOLLOW/EXECUTE routines | Embedded commands and echoes | Instructions become familiar routines |
| 6. Run program | 2–3 min | Continuous mixed sequence | Minimal copy; strong learned vocabulary | Sustained robot-state fantasy |
| 7. Close | 1–2 min | Slow final trace, explicit end | No fleeting copy | Task expectations end and player reorients |

Robot confirmation should occur with substantial play remaining. It is the entrance to the main programming act, not the final reveal.

### Representative eight-step micro-sequence

1. Objective cloud: select words related to repetition.
2. Trace a simple route; FOLLOW appears as a small route label.
3. Repeat the route with a guide point.
4. Experience cloud: select words that describe the movement.
5. Acceptance: “Familiar response accepted.”
6. Show the route symbol without the word.
7. Run the familiar trace with reduced guidance.
8. Echo in foreground: “ROBOT RESPONSE: FOLLOW.”

This sequence is the reusable unit for every installed routine.

## 8. Data and state model

Keep all state transient and local to the running session. Do not add analytics or a hidden player profile.

### 8.1 Authored step schema

~~~js
{
  id: "follow-04",
  section: "programming",
  activity: "trace",
  prompt: "Follow the signal.",
  trace: {
    routeId: "inward-spiral",
    guidance: 0.45,
    cue: "follow"
  },
  secondaryStimulus: {
    mode: "embedded",
    text: "FOLLOW",
    anchor: "route",
    intensity: 2
  },
  acceptance: {
    label: "ROBOT RESPONSE ACCEPTED",
    sound: "accept"
  },
  next: "follow-05"
}
~~~

### 8.2 Runtime state

~~~js
{
  stepIndex: 0,
  selectedWords: [],
  traceProgress: 0,
  paused: false,
  settingsOpen: false,
  soundEnabled: true,
  motionLevel: "standard",
  stimulusIntensity: 2,
  completedRoutineIds: []
}
~~~

Do not persist response latency, click history, truth bias, trace speed, inferred arousal, inferred suggestibility, or a vulnerability score. If temporary animation timing is needed to operate a task, discard it when the task ends.

### 8.3 Stimulus controller contract

Add a small renderer, not an adaptive persuasion engine.

~~~js
showSecondaryStimulus({
  mode,
  text,
  anchor,
  intensity,
  reducedMotion
})

clearSecondaryStimulus()
~~~

The controller receives authored instructions from the current step. It never chooses content based on inferred mental state.

## 9. Repository implementation plan

### 9.1 Files to change

| File | Change |
| --- | --- |
| src/session/content.js | Add phase metadata, secondaryStimulus objects, acceptance labels, and echo references to authored steps |
| src/session/app.js | Render the secondary stimulus layer, clear it on pause/exit, and enforce phase transitions |
| src/session/stimulus.js | New small module for foreground/peripheral/interrupted/embedded/echo presentation |
| src/session/style.css | Add anchored stimulus styles plus reduced-motion and non-flashing variants |
| src/session/audio.js | Keep the learned acceptance sound stable; add only sparse phase accents |
| test/session.test.js | Test authored ordering, rendering modes, pause/exit behavior, and reduced-motion equivalence |
| README.md | Link this plan after the implementation lands |

### 9.2 Implementation order

#### Milestone 1: stimulus-layer vertical slice

- [ ] Add the secondaryStimulus schema to three existing steps.
- [ ] Implement peripheral, interrupted, and echo modes.
- [ ] Ensure pause/settings immediately clear or freeze stimulus presentation.
- [ ] Add reduced-motion behavior.
- [ ] Test one complete fragment → action → echo sequence.
- [ ] Verify no history or analytics are stored.

Exit criterion: one two-minute sequence produces the “I saw it earlier” effect without relying on unreadable frames.

#### Milestone 2: task integration

- [ ] Integrate embedded copy with word clouds.
- [ ] Integrate cue labels and embedded symbols with tracing.
- [ ] Add one CAPTCHA-style symbol selection task if it can reuse the current cloud renderer; otherwise defer it.
- [ ] Author CENTER and FOLLOW micro-sequences.
- [ ] Keep every task usable by touch and keyboard where applicable.

Exit criterion: the same vocabulary moves coherently through CAPTCHA, cloud, and tracing contexts.

#### Milestone 3: approval arc

- [ ] Define acceptance labels by phase.
- [ ] Preserve one recognizable acceptance sound.
- [ ] Add restrained visual feedback variants.
- [ ] Verify that objective errors remain understandable early.
- [ ] Verify that experience prompts accept all selections without secret scoring.

Exit criterion: playtesters anticipate the signal and understand the shift from correctness to routine completion.

#### Milestone 4: full authored session

- [ ] Apply the phrase lifecycle to each major routine.
- [ ] Position robot confirmation before the programming act.
- [ ] Add the optional adult content layer at explicit intensity settings.
- [ ] Add the run-program sequence.
- [ ] Add a clean reorientation ending with no secondary stimuli.

Exit criterion: 20–25 minute authored session with no procedural dead zones and no claim of measured mind change.

#### Milestone 5: playtest and accessibility

- [ ] Test standard, reduced-motion, and non-flashing modes.
- [ ] Test phone portrait, phone landscape, and desktop.
- [ ] Check color contrast and touch target sizes.
- [ ] Verify pause, mute, settings, and exit during every activity.
- [ ] Conduct structured recall interviews.
- [ ] Revise any stimuli that players never notice or that dominate the task.

Exit criterion: the effect survives without flashing, the controls remain trustworthy, and no mode traps the player in the fiction.

## 10. Testing plan

### Automated tests

Add tests for:

- all authored step IDs are unique;
- all next and echo references resolve;
- every interrupted stimulus has a reduced-motion fallback;
- intensity 0 suppresses secondary stimuli while preserving task completion;
- opening settings pauses or clears transient stimuli;
- ending the session cancels timers and audio;
- experience clouds accept zero, one, or many selections;
- no task writes response history to storage or sends network requests;
- tracing progress survives pause and viewport resize.

### Playtest questions

Ask after the session, not during it:

1. Which messages do you remember seeing?
2. Which messages felt familiar before they were shown clearly?
3. At what point did the interface stop feeling like a test and start feeling like a program?
4. Did the acceptance signal become something you anticipated?
5. Did any message feel literally unreadable, unfair, or visually unsafe?
6. Did the next action ever feel easier than stopping to analyze it?
7. Could you pause or exit without uncertainty?
8. Did the ending clearly release the task rhythm?

Optional adult-content feedback should be self-report only. Do not infer arousal from input behavior, camera, microphone, or device sensors.

### Success criteria

- Most testers notice at least some secondary copy during play.
- Testers recall the themes better than exact placements.
- Echoed phrases produce recognition rather than surprise alone.
- Repeated routes feel easier without needing fabricated measurements.
- Approval is anticipated because of consistent pairing with completion.
- Robot confirmation feels like a reinterpretation of play already performed.
- Reduced-motion mode preserves the same narrative beats.
- Every tester can pause and exit immediately.
- No tester believes the game secretly operates outside the opted-in session.

## 11. Content authoring rules

1. Pair every transformation claim with an interaction the player just performed.
2. Prefer observable language before interpretive language.
3. Repeat vocabulary across different surfaces, not the exact same sentence in one place.
4. Keep secondary copy nonessential to task success.
5. Let the player author experience through selections; never falsify their answer.
6. Do not claim physiological knowledge the software does not have.
7. Do not turn safety controls into fictional tests.
8. End the program explicitly and restore ordinary interface language.
9. Treat adult intensity as a selected content layer, not as a hidden escalation.
10. Preserve the active design’s “no behavioral statistics, response history, or data transmission” rule.

## 12. Immediate next build

Build one polished six-to-eight-step vertical slice before rewriting the full 43-step session:

1. Objective repetition cloud.
2. Neutral trace with peripheral FOLLOW fragment.
3. Same trace with a guide and embedded FOLLOW label.
4. Experience cloud about familiarity and ease.
5. Cue-only trace with reduced guidance.
6. “Robot response accepted” echo.
7. Short uninterrupted FOLLOW routine.
8. Explicit return to neutral interface.

If that slice makes “noticed but not attended to” feel compelling, scale the pattern to CENTER, FOLLOW, and EXECUTE. If it does not, revise placement, recurrence, and task load before adding more intense language. The mechanic must carry the fantasy; stronger copy cannot rescue a loop that does not feel learned.
