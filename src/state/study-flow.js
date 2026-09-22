import { protocolSteps, stepAt } from "../data/phases.js";
import { createRoundState } from "./initial-state.js";

export function currentStep(study) {
  return stepAt(study.stepIndex);
}

export function startStudy(study) {
  study.screen = "protocol";
  study.stepIndex = 0;
  resetStepState(study);
  study.session.startedAt = Date.now();
}

export function advanceStudy(study) {
  const nextIndex = study.stepIndex + 1;
  if (nextIndex >= protocolSteps.length) {
    beginRecovery(study);
    return null;
  }

  study.stepIndex = nextIndex;
  resetStepState(study);
  return currentStep(study);
}

export function resetStepState(study) {
  study.round = createRoundState();
  study.classificationChoice = null;
  study.feedback = "";
  study.feedbackTone = "neutral";
  study.answerLocked = false;
  study.stepStartedAt = performance.now();
}

export function beginRecovery(study) {
  study.screen = "recovery";
  study.recovery.step = 0;
  study.exitConfirming = false;
  study.paused = false;
}

export function completeStudy(study) {
  study.screen = "complete";
  study.session.completedAt = Date.now();
}

export function totalProgress(study) {
  if (study.screen === "recovery" || study.screen === "complete") return 1;
  return Math.max(0, Math.min(1, study.stepIndex / Math.max(1, protocolSteps.length - 1)));
}
