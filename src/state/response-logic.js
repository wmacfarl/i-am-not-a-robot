export function recordRoundResponse(study, step) {
  const selected = [...study.round.selectedPositions].sort((a, b) => a - b);
  const expected = [...step.expected].sort((a, b) => a - b);
  const exact =
    selected.length === expected.length &&
    selected.every((position, index) => position === expected[index]);
  const now = performance.now();
  const firstSelectionMs =
    study.round.firstSelectionAt == null
      ? Math.max(0, now - study.stepStartedAt)
      : Math.max(0, study.round.firstSelectionAt - study.stepStartedAt);
  const verifyMs = Math.max(0, now - study.stepStartedAt);

  updateAverage(
    study.stats,
    "meanFirstSelectionMs",
    firstSelectionMs,
    study.stats.roundsCompleted + 1,
  );
  updateAverage(study.stats, "meanVerifyMs", verifyMs, study.stats.roundsCompleted + 1);
  if (study.stats.baselineFirstSelectionMs == null) {
    study.stats.baselineFirstSelectionMs = firstSelectionMs;
  }
  study.stats.roundsCompleted += 1;
  study.stats.selections += selected.length;
  study.stats.corrections += study.round.corrections;
  if (exact) study.stats.exactRounds += 1;

  selected.forEach((position) => {
    study.model.positionCounts[position] += 1;
  });
  study.model.recentPatterns.push(selected);
  study.model.recentPatterns = study.model.recentPatterns.slice(-5);

  const predicted = study.round.predictedPositions;
  if (study.round.predictionShown && predicted.length) {
    study.model.predictionTrials += 1;
    if (samePositions(selected, predicted)) study.model.predictionMatches += 1;
  }
  if (study.round.familiarPositionTapped) study.model.familiarPositionTaps += 1;

  const result = {
    selected,
    expected,
    exact,
    firstSelectionMs,
    verifyMs,
    corrections: study.round.corrections,
    predicted: [...predicted],
    predictionMatched: samePositions(selected, predicted),
    familiarPositionTapped: study.round.familiarPositionTapped,
  };
  study.responses.push({
    stepId: step.id,
    type: "round",
    at: Date.now(),
    ...result,
  });
  return result;
}

export function recordTraceResponse(study, step, metrics) {
  const count = study.stats.traceCount + 1;
  const deviation = Number.isFinite(metrics.meanDeviation) ? metrics.meanDeviation : 0;
  study.stats.traceCount = count;
  study.stats.meanTraceDeviation += (deviation - study.stats.meanTraceDeviation) / count;
  study.responses.push({
    stepId: step.id,
    type: "trace",
    at: Date.now(),
    durationMs: metrics.durationMs || 0,
    corrections: metrics.corrections || 0,
    meanDeviation: deviation,
  });
}

export function recordClassification(study, step, selected) {
  study.responses.push({
    stepId: step.id,
    type: "classification",
    at: Date.now(),
    selected,
    modelClassification: "robot",
    agreesWithModel: selected === "robot",
  });
}

export function predictPositions(study, count = 3) {
  const recentCounts = Array(9).fill(0);
  study.model.recentPatterns.slice(-4).forEach((pattern) => {
    pattern.forEach((position) => {
      recentCounts[position] += 1;
    });
  });
  return recentCounts
    .map((score, position) => ({ position, score }))
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, count)
    .map((entry) => entry.position)
    .sort((a, b) => a - b);
}

export function classificationDiagnostics(study) {
  const baseline = study.stats.baselineFirstSelectionMs || study.stats.meanFirstSelectionMs || 0;
  const current = study.stats.meanFirstSelectionMs || baseline;
  const speedChange = baseline > 0 ? Math.round(((baseline - current) / baseline) * 100) : 0;
  const exactRate = study.stats.roundsCompleted
    ? study.stats.exactRounds / study.stats.roundsCompleted
    : 0;
  const predictionRate = study.model.predictionTrials
    ? study.model.predictionMatches / study.model.predictionTrials
    : 0;

  return {
    meanFirstSelectionMs: Math.round(current),
    speedChange,
    exactRate,
    predictionRate,
    corrections: study.stats.corrections,
    familiarPositionTaps: study.model.familiarPositionTaps,
  };
}

function samePositions(left, right) {
  if (!left.length || left.length !== right.length) return false;
  const a = [...left].sort((x, y) => x - y);
  const b = [...right].sort((x, y) => x - y);
  return a.every((position, index) => position === b[index]);
}

function updateAverage(target, key, value, count) {
  target[key] += (value - target[key]) / Math.max(1, count);
}
