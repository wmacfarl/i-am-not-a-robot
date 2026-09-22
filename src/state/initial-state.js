export function createInitialStudyState() {
  return {
    screen: "setup",
    setupAccepted: false,
    stepIndex: 0,
    stepStartedAt: 0,
    answerLocked: false,
    feedback: "",
    feedbackTone: "neutral",
    exitConfirming: false,
    paused: false,
    settingsOpen: false,
    settings: {
      muted: false,
      visualMode: "standard",
    },
    round: createRoundState(),
    classificationChoice: null,
    session: {
      id: createSessionId(),
      startedAt: null,
      completedAt: null,
    },
    model: {
      positionCounts: Array(9).fill(0),
      recentPatterns: [],
      predictedPositions: [],
      predictionShown: false,
      predictionMatches: 0,
      predictionTrials: 0,
      familiarPositionTaps: 0,
    },
    stats: {
      roundsCompleted: 0,
      exactRounds: 0,
      selections: 0,
      corrections: 0,
      meanFirstSelectionMs: 0,
      baselineFirstSelectionMs: null,
      meanVerifyMs: 0,
      traceCount: 0,
      meanTraceDeviation: 0,
    },
    responses: [],
    recovery: {
      step: 0,
    },
  };
}

export function createRoundState() {
  return {
    phase: "loading",
    selectedPositions: [],
    selectionOrder: [],
    corrections: 0,
    firstSelectionAt: null,
    verifyReady: false,
    predictedPositions: [],
    predictionShown: false,
    familiarPositionTapped: false,
    exact: null,
  };
}

function createSessionId() {
  const stamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 46656).toString(36).padStart(3, "0");
  return `verify-${stamp}-${random}`;
}
