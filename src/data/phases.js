const POSITIONS = Array.from({ length: 9 }, (_, position) => position);
const LEARNED_PATTERN = [0, 2, 4];

const gate = (id, act, phase, title, statement, button, options = {}) => ({
  id,
  type: "gate",
  act,
  phase,
  title,
  statement,
  button,
  gate: options.gate || "protocol",
  mode: options.mode || "captcha",
});

const round = (id, act, phase, instruction, tiles, expected, options = {}) => ({
  id,
  type: "round",
  act,
  phase,
  instruction,
  tiles,
  expected,
  verifyDelayMs: options.verifyDelayMs ?? 2200,
  feedback: options.feedback || "VERIFICATION SAMPLE ACCEPTED",
  mismatchFeedback: options.mismatchFeedback || "EXPECTATION MISMATCH / MODEL UPDATED",
  showPrediction: Boolean(options.showPrediction),
  predictionOverride: options.predictionOverride || null,
  familiarPositions: options.familiarPositions || [],
  inhibition: Boolean(options.inhibition),
  autoVerify: Boolean(options.autoVerify),
  mode: options.mode || "captcha",
});

const trace = (id, act, phase, instruction, mode, options = {}) => ({
  id,
  type: "trace",
  act,
  phase,
  instruction,
  path: "spiral-in",
  mode,
  cue: options.cue || "CENTER",
  feedback: options.feedback || "CONTINUOUS RESPONSE ACCEPTED",
  visualMode: "center",
});

const classification = {
  id: "robot-classification",
  type: "classification",
  act: "automatic",
  phase: "Classification",
  title: "Verification status review",
  statement:
    "Your declaration and the behavioral model are recorded separately. Select the statement that best describes your experience.",
  options: [
    { id: "human", label: "I am not a robot" },
    { id: "automatic", label: "I respond automatically" },
    { id: "becoming", label: "I am becoming a robot" },
    { id: "robot", label: "I am a robot" },
  ],
  mode: "classification",
};

const shapeTiles = (kinds, targetPositions, labels = {}) =>
  POSITIONS.map((position) => ({
    id: `position-${position}`,
    position,
    kind: kinds[position],
    text: labels[position] || "",
    target: targetPositions.includes(position),
  }));

const textTiles = (texts, targetPositions) =>
  POSITIONS.map((position) => ({
    id: `position-${position}`,
    position,
    kind: "text",
    text: texts[position],
    target: targetPositions.includes(position),
  }));

const baselineRounds = [
  round(
    "baseline-circles",
    "human",
    "Object Verification",
    "Select every circle.",
    shapeTiles(
      ["square", "circle", "triangle", "circle", "cross", "circle", "diamond", "grid", "bars"],
      [1, 3, 5],
    ),
    [1, 3, 5],
    { verifyDelayMs: 2800, feedback: "OBJECT RESPONSE ACCEPTED" },
  ),
  round(
    "baseline-triangles",
    "human",
    "Object Verification",
    "Select every triangle.",
    shapeTiles(
      ["triangle", "ring", "square", "cross", "triangle", "circle", "grid", "diamond", "triangle"],
      [0, 4, 8],
    ),
    [0, 4, 8],
    { verifyDelayMs: 2700, feedback: "OBJECT RESPONSE ACCEPTED" },
  ),
  round(
    "baseline-pattern",
    "human",
    "Pattern Verification",
    "Select every repeated signal.",
    shapeTiles(
      ["bars", "circle", "pulse", "diamond", "grid", "square", "pulse", "cross", "pulse"],
      [2, 6, 8],
    ),
    [2, 6, 8],
    { verifyDelayMs: 2500, feedback: "PATTERN RESPONSE ACCEPTED" },
  ),
  round(
    "baseline-words",
    "human",
    "Semantic Verification",
    "Select every attention-related word.",
    textTiles(
      ["random", "focus", "noise", "signal", "attention", "object", "static", "observe", "chance"],
      [1, 4, 7],
    ),
    [1, 4, 7],
    { verifyDelayMs: 2500, feedback: "SEMANTIC RESPONSE ACCEPTED" },
  ),
];

const conditioningRounds = [
  round(
    "pattern-spirals",
    "automatic",
    "Adaptive Verification",
    "Select every spiral.",
    shapeTiles(
      ["spiral", "ring", "spiral", "grid", "spiral", "cross", "diamond", "bars", "circle"],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 2200, feedback: "REPEATED POSITION SET RECORDED" },
  ),
  round(
    "pattern-signals",
    "automatic",
    "Adaptive Verification",
    "Select every matching signal.",
    shapeTiles(
      ["pulse", "square", "pulse", "ring", "pulse", "diamond", "bars", "cross", "grid"],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 2050, feedback: "POSITION CONSISTENCY INCREASING" },
  ),
  round(
    "pattern-observation",
    "automatic",
    "Adaptive Verification",
    "Select every phrase describing this task.",
    textTiles(
      [
        "same pattern",
        "random order",
        "familiar route",
        "new positions",
        "positions repeat",
        "manual review",
        "unrelated task",
        "no pattern",
        "unknown layout",
      ],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1900, feedback: "REPEATED MOTOR SEQUENCE DETECTED" },
  ),
  round(
    "pattern-self-report",
    "automatic",
    "Adaptive Verification",
    "Select every phrase that matches your current response.",
    textTiles(
      [
        "I recognize it",
        "I start over",
        "my hand remembers",
        "I resist easily",
        "selection is easier",
        "I reconsider",
        "the layout is new",
        "I stop each time",
        "I need more time",
      ],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1750, feedback: "DELIBERATION LATENCY REDUCED" },
  ),
  round(
    "prediction-visible",
    "automatic",
    "Prediction Trial",
    "Select every automatic response phrase.",
    textTiles(
      [
        "I respond faster",
        "I pause to check",
        "I follow patterns",
        "I reject the route",
        "the first response comes",
        "I choose new positions",
        "I ignore repetition",
        "I need to restart",
        "nothing is familiar",
      ],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    {
      verifyDelayMs: 1600,
      showPrediction: true,
      feedback: "PREDICTED SELECTION SET CONFIRMED",
    },
  ),
  round(
    "inhibition-shift",
    "automatic",
    "Inhibition Trial",
    "Select every open ring. Do not select the filled spirals.",
    shapeTiles(
      ["spiral-filled", "ring", "spiral-filled", "ring", "spiral-filled", "ring", "cross", "grid", "bars"],
      [1, 3, 5],
    ),
    [1, 3, 5],
    {
      verifyDelayMs: 2300,
      showPrediction: true,
      predictionOverride: LEARNED_PATTERN,
      familiarPositions: LEARNED_PATTERN,
      inhibition: true,
      feedback: "INHIBITION RESPONSE RECORDED",
      mismatchFeedback: "PREDICTED MOTOR RESPONSE INITIATED / MODEL UPDATED",
    },
  ),
  round(
    "pattern-return",
    "automatic",
    "Response Recovery",
    "Select every familiar signal.",
    shapeTiles(
      ["pulse", "diamond", "pulse", "ring", "pulse", "square", "grid", "bars", "cross"],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1450, feedback: "FAMILIAR RESPONSE RESTORED" },
  ),
  round(
    "behavioral-evidence",
    "automatic",
    "Behavioral Evidence",
    "Select every statement supported by the response record.",
    textTiles(
      [
        "the pattern guides me",
        "every choice is new",
        "my response repeats",
        "the system cannot predict me",
        "the system predicts me",
        "repetition has no effect",
        "I use random positions",
        "nothing became easier",
        "I avoided every pattern",
      ],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1450, feedback: "AUTOMATIC RESPONSE EVIDENCE ACCEPTED" },
  ),
];

const centerRounds = [
  round(
    "center-selection-a",
    "center",
    "CENTER Installation",
    "Select every signal directed toward the center.",
    shapeTiles(
      ["arrow-in", "arrow-out", "arrow-in", "cross", "center", "arrow-out", "grid", "ring", "bars"],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1800, mode: "center", feedback: "CENTER ROUTE IDENTIFIED" },
  ),
  round(
    "center-selection-b",
    "center",
    "CENTER Installation",
    "Repeat the inward selection route.",
    shapeTiles(
      ["arrow-in", "diamond", "arrow-in", "square", "center", "arrow-out", "cross", "ring", "grid"],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1500, mode: "center", feedback: "CENTER SELECTION REPEATED" },
  ),
  trace(
    "center-trace-guided-a",
    "center",
    "CENTER Guidance",
    "Touch START and follow the illuminated route inward.",
    "guided",
  ),
  trace(
    "center-trace-guided-b",
    "center",
    "CENTER Guidance",
    "Repeat the same inward route.",
    "guided",
    { feedback: "INWARD MOVEMENT REPEATED" },
  ),
  trace(
    "center-trace-fading-a",
    "center",
    "CENTER Withdrawal",
    "Continue inward when the route begins to disappear.",
    "fading",
  ),
  trace(
    "center-trace-fading-b",
    "center",
    "CENTER Withdrawal",
    "Complete the familiar movement with reduced guidance.",
    "fading",
    { feedback: "GUIDANCE REDUCED / RESPONSE PRESERVED" },
  ),
  round(
    "center-cue-test-a",
    "center",
    "CENTER Cue Test",
    "Respond to the CENTER signal.",
    shapeTiles(
      ["blank", "blank", "blank", "blank", "center-cue", "blank", "blank", "blank", "blank"],
      [4],
    ),
    [4],
    {
      verifyDelayMs: 0,
      autoVerify: true,
      mode: "center",
      feedback: "CENTER CUE PRODUCED EXPECTED RESPONSE",
    },
  ),
  round(
    "center-interpretation",
    "center",
    "CENTER Interpretation",
    "Select every statement supported by the CENTER test.",
    textTiles(
      [
        "my eyes return",
        "the route is unknown",
        "my finger follows",
        "nothing repeated",
        "the cue directs me",
        "guidance stayed complete",
        "I moved outward",
        "the center was avoided",
        "no response occurred",
      ],
      LEARNED_PATTERN,
    ),
    LEARNED_PATTERN,
    { verifyDelayMs: 1500, mode: "center", feedback: "CENTER PROGRAM INTERPRETED" },
  ),
  round(
    "center-cue-test-b",
    "center",
    "CENTER Cue Test",
    "Respond to the signal.",
    shapeTiles(
      ["blank", "blank", "blank", "blank", "center-cue", "blank", "blank", "blank", "blank"],
      [4],
    ),
    [4],
    {
      verifyDelayMs: 0,
      autoVerify: true,
      mode: "center",
      feedback: "CENTER RESPONSE VERIFIED",
    },
  ),
];

export const protocolBlocks = [
  {
    id: "human-baseline",
    act: "human",
    steps: [
      gate(
        "human-intro",
        "human",
        "Baseline",
        "Human verification",
        "Complete each CAPTCHA by selecting all matching tiles. The Verify control opens after the response scan. Work accurately and respond at a natural pace.",
        "Begin verification",
      ),
      ...baselineRounds,
    ],
  },
  {
    id: "automatic-response",
    act: "automatic",
    steps: [...conditioningRounds, classification],
  },
  {
    id: "center-program",
    act: "center",
    steps: [
      gate(
        "center-consent",
        "center",
        "Programming Interface",
        "CENTER programming available",
        "The next section uses repeated visual and movement exercises to establish a CENTER cue-response routine. It includes explicit programming language. Continue only if you want this content.",
        "Begin CENTER programming",
        { gate: "consent", mode: "center" },
      ),
      ...centerRounds,
      gate(
        "prototype-complete",
        "center",
        "Complete",
        "Prototype complete",
        "Human verification, automatic-response modeling, robot classification, and the CENTER cue cycle are complete. The session will now close through the recovery protocol.",
        "Begin recovery",
        { gate: "complete", mode: "center" },
      ),
    ],
  },
];

export const protocolSteps = protocolBlocks.flatMap((block) => block.steps);

export const acts = {
  human: {
    number: 1,
    label: "Human Verification",
    classification: "HUMAN",
  },
  automatic: {
    number: 2,
    label: "Adaptive Verification",
    classification: "MODELING",
  },
  center: {
    number: 3,
    label: "Programming Interface",
    classification: "ROBOT",
  },
};

export function stepAt(index) {
  return protocolSteps[index] || null;
}

export function taskNumberAt(index) {
  return protocolSteps.slice(0, index + 1).filter((step) => step.type !== "gate").length;
}

export const taskCount = protocolSteps.filter((step) => step.type !== "gate").length;
