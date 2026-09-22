import { studyCopy } from "./data/copy.js";
import { protocolSteps } from "./data/phases.js";
import { createInitialStudyState } from "./state/initial-state.js";
import {
  advanceStudy,
  beginRecovery,
  completeStudy,
  currentStep,
  resetStepState,
  startStudy,
  totalProgress,
} from "./state/study-flow.js";
import {
  predictPositions,
  recordClassification,
  recordRoundResponse,
  recordTraceResponse,
} from "./state/response-logic.js";
import {
  initializeAudio,
  playAcceptance,
  playClassification,
  playMismatch,
  playRoundLoad,
  playTileSelect,
  playVerifyPulse,
  setAudioMuted,
  updateAudio,
} from "./audio/output.js";
import { mountStimulus, pulseStimulus, unmountStimulus } from "./pixi/stimulus.js";
import { mountTrace, unmountTrace } from "./trace/tracing.js";

const ROUND_FEEDBACK_MS = 620;
const TRACE_FEEDBACK_MS = 720;

export default function store(state, emitter) {
  state.study = state.study || createInitialStudyState();
  const debugStepParam = new URLSearchParams(window.location.search).get("step");
  const debugStep = Number.parseInt(debugStepParam || "", 10);

  let verifyTimer = null;
  let predictionTimer = null;
  let feedbackTimer = null;
  let recoveryTimer = null;
  let syncFrame = null;

  const render = () => emitter.emit("render");

  emitter.on("DOMContentLoaded", () => {
    installGlobalInput();
    scheduleRuntimeSync();
  });
  emitter.on("render", scheduleRuntimeSync);

  emitter.on("setup:accept", (accepted) => {
    state.study.setupAccepted = Boolean(accepted);
    render();
  });

  emitter.on("settings:setVisualMode", (mode) => {
    if (!["reduced", "standard", "flashing"].includes(mode)) return;
    state.study.settings.visualMode = mode;
    render();
  });

  emitter.on("settings:toggleMute", () => {
    state.study.settings.muted = !state.study.settings.muted;
    setAudioMuted(state.study.settings.muted);
    render();
  });

  emitter.on("settings:open", () => {
    state.study.settingsOpen = true;
    render();
  });

  emitter.on("settings:close", () => {
    state.study.settingsOpen = false;
    render();
  });

  emitter.on("study:start", async () => {
    if (!state.study.setupAccepted) return;
    await initializeAudio();
    setAudioMuted(state.study.settings.muted);
    startStudy(state.study);
    if (
      window.location.hostname === "127.0.0.1" &&
      Number.isInteger(debugStep) &&
      debugStep >= 0 &&
      debugStep < protocolSteps.length
    ) {
      state.study.stepIndex = debugStep;
    }
    prepareStep();
    render();
  });

  emitter.on("study:continue", () => {
    if (state.study.answerLocked) return;
    const step = currentStep(state.study);
    if (step?.gate === "complete") {
      beginRecovery(state.study);
      startRecoveryStep();
      render();
      return;
    }
    advanceAndPrepare();
  });

  emitter.on("round:toggleTile", (position) => {
    const study = state.study;
    const step = currentStep(study);
    if (!canInteract(step, "round") || study.round.phase === "verified") return;
    const numericPosition = Number(position);
    const selected = new Set(study.round.selectedPositions);

    if (selected.has(numericPosition)) {
      selected.delete(numericPosition);
      study.round.corrections += 1;
      playTileSelect(numericPosition, false);
    } else {
      selected.add(numericPosition);
      if (study.round.firstSelectionAt == null) study.round.firstSelectionAt = performance.now();
      study.round.selectionOrder.push(numericPosition);
      if (step.familiarPositions.includes(numericPosition)) {
        study.round.familiarPositionTapped = true;
      }
      playTileSelect(numericPosition, true);
      pulseStimulus(0.35, [numericPosition]);
    }

    study.round.selectedPositions = [...selected].sort((a, b) => a - b);
    render();

    if (step.autoVerify && samePositions(study.round.selectedPositions, step.expected)) {
      study.answerLocked = true;
      study.round.phase = "auto-verifying";
      render();
      feedbackTimer = setTimeout(verifyCurrentRound, 180);
    }
  });

  emitter.on("round:verify", () => {
    const step = currentStep(state.study);
    if (
      !canInteract(step, "round") ||
      !state.study.round.verifyReady ||
      state.study.round.selectedPositions.length === 0
    ) {
      return;
    }
    verifyCurrentRound();
  });

  emitter.on("task:traceComplete", (metrics) => {
    const step = currentStep(state.study);
    if (!canInteract(step, "trace")) return;
    recordTraceResponse(state.study, step, metrics || {});
    state.study.answerLocked = true;
    state.study.feedback = step.feedback;
    state.study.feedbackTone = "accepted";
    playAcceptance(1.05, 1);
    pulseStimulus(1, [4]);
    render();
    feedbackTimer = setTimeout(advanceAndPrepare, TRACE_FEEDBACK_MS);
  });

  emitter.on("classification:select", (choice) => {
    const step = currentStep(state.study);
    if (!canInteract(step, "classification")) return;
    state.study.classificationChoice = choice;
    playTileSelect(step.options.findIndex((option) => option.id === choice), true);
    render();
  });

  emitter.on("classification:confirm", () => {
    const step = currentStep(state.study);
    const choice = state.study.classificationChoice;
    if (!canInteract(step, "classification") || !choice) return;
    recordClassification(state.study, step, choice);
    state.study.answerLocked = true;
    state.study.feedback =
      choice === "robot"
        ? "SELF-REPORT MATCHES BEHAVIORAL MODEL / ROBOT"
        : "DECLARATION RECORDED / BEHAVIORAL MODEL REMAINS ROBOT";
    state.study.feedbackTone = "classification";
    playClassification();
    pulseStimulus(1.5, [0, 2, 4]);
    render();
    feedbackTimer = setTimeout(advanceAndPrepare, 1350);
  });

  emitter.on("study:togglePause", () => {
    if (state.study.screen !== "protocol") return;
    state.study.paused = !state.study.paused;
    clearTrialTimers();
    if (!state.study.paused) prepareStep();
    updateAudio(totalProgress(state.study), state.study.paused);
    render();
  });

  emitter.on("study:requestExit", () => {
    state.study.exitConfirming = true;
    render();
  });

  emitter.on("study:cancelExit", () => {
    state.study.exitConfirming = false;
    render();
  });

  emitter.on("study:exit", () => {
    clearRuntimeTimers();
    beginRecovery(state.study);
    startRecoveryStep();
    render();
  });

  emitter.on("recovery:advance", () => {
    state.study.recovery.step += 1;
    startRecoveryStep();
    render();
  });

  emitter.on("recovery:finish", () => {
    clearRuntimeTimers();
    completeStudy(state.study);
    updateAudio(0, true);
    render();
  });

  emitter.on("study:restart", () => {
    clearRuntimeTimers();
    state.study = createInitialStudyState();
    unmountStimulus();
    unmountTrace();
    render();
  });

  function verifyCurrentRound() {
    const study = state.study;
    const step = currentStep(study);
    if (!step || step.type !== "round" || study.round.phase === "verified") return;
    clearTrialTimers();

    const result = recordRoundResponse(study, step);
    study.answerLocked = true;
    study.round.phase = "verified";
    study.round.exact = result.exact;
    study.feedback = roundFeedback(step, result);
    study.feedbackTone = result.exact ? "accepted" : "model";

    if (result.exact) {
      playAcceptance(1, result.selected.length);
    } else {
      playMismatch();
    }
    pulseStimulus(result.exact ? 1 : 0.65, result.selected);
    render();
    feedbackTimer = setTimeout(advanceAndPrepare, ROUND_FEEDBACK_MS);
  }

  function roundFeedback(step, result) {
    if (step.inhibition && result.familiarPositionTapped) {
      return result.exact
        ? "PREDICTED RESPONSE INITIATED / CORRECTION DETECTED"
        : step.mismatchFeedback;
    }
    if (step.showPrediction && result.predictionMatched) {
      return step.feedback;
    }
    return result.exact ? step.feedback : step.mismatchFeedback;
  }

  function prepareStep() {
    clearTrialTimers();
    resetStepState(state.study);
    const step = currentStep(state.study);
    if (!step) return;

    if (step.type === "round") {
      state.study.round.phase = "selecting";
      state.study.round.verifyReady = step.autoVerify || step.verifyDelayMs === 0;
      const predicted =
        step.predictionOverride ||
        (step.showPrediction ? predictPositions(state.study, step.expected.length) : []);
      state.study.round.predictedPositions = predicted;

      playRoundLoad();

      if (!state.study.round.verifyReady) {
        verifyTimer = setTimeout(() => {
          if (currentStep(state.study)?.id !== step.id || state.study.paused) return;
          state.study.round.verifyReady = true;
          playVerifyPulse();
          render();
        }, step.verifyDelayMs);
      }

      if (step.showPrediction && predicted.length) {
        const delay = Math.min(720, Math.max(260, step.verifyDelayMs * 0.32));
        predictionTimer = setTimeout(() => {
          if (currentStep(state.study)?.id !== step.id || state.study.paused) return;
          state.study.round.predictionShown = true;
          state.study.model.predictionShown = true;
          state.study.model.predictedPositions = [...predicted];
          render();
        }, delay);
      }
    }
  }

  function advanceAndPrepare() {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
    advanceStudy(state.study);
    if (state.study.screen === "recovery") {
      startRecoveryStep();
    } else {
      prepareStep();
    }
    render();
  }

  function canInteract(step, type) {
    return (
      state.study.screen === "protocol" &&
      !state.study.paused &&
      !state.study.answerLocked &&
      step?.type === type
    );
  }

  function startRecoveryStep() {
    clearTimeout(recoveryTimer);
    const step = studyCopy.recovery[state.study.recovery.step];
    if (!step) {
      completeStudy(state.study);
      return;
    }
    updateAudio(0, true);
    if (step.auto) {
      recoveryTimer = setTimeout(() => {
        state.study.recovery.step += 1;
        startRecoveryStep();
        render();
      }, step.auto);
    }
  }

  function syncRuntime() {
    const study = state.study;
    const step = currentStep(study);
    const root = document.getElementById("stimulus-root");

    if (study.screen === "protocol" && root) {
      mountStimulus(root, {
        depth: totalProgress(study),
        visualMode: study.settings.visualMode,
        paused: study.paused,
        act: step?.act,
        mode: step?.mode || step?.visualMode || "captcha",
        selectedPositions: study.round.selectedPositions,
        predictedPositions: study.round.predictionShown
          ? study.round.predictedPositions
          : [],
        roundPhase: study.round.phase,
      });
      updateAudio(totalProgress(study), study.paused);
    } else {
      unmountStimulus();
    }

    if (study.screen === "protocol" && step?.type === "trace" && !study.answerLocked) {
      mountTrace(
        document.getElementById("trace-canvas"),
        step,
        (metrics) => emitter.emit("task:traceComplete", metrics),
      );
    } else {
      unmountTrace();
    }
  }

  function scheduleRuntimeSync() {
    if (syncFrame) cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(() => {
      syncFrame = requestAnimationFrame(() => {
        syncFrame = null;
        syncRuntime();
      });
    });
  }

  function installGlobalInput() {
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.key === "Escape") {
        if (state.study.settingsOpen) emitter.emit("settings:close");
        else if (state.study.exitConfirming) emitter.emit("study:cancelExit");
        return;
      }
      const step = currentStep(state.study);
      if (!canInteract(step, step?.type)) return;

      if (step.type === "round" && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        emitter.emit("round:toggleTile", Number(event.key) - 1);
      } else if (step.type === "round" && event.key === "Enter") {
        event.preventDefault();
        emitter.emit("round:verify");
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state.study.screen === "protocol") {
        state.study.paused = true;
        clearTrialTimers();
        updateAudio(totalProgress(state.study), true);
        render();
      }
    });
  }

  function clearTrialTimers() {
    clearTimeout(verifyTimer);
    clearTimeout(predictionTimer);
    verifyTimer = null;
    predictionTimer = null;
  }

  function clearRuntimeTimers() {
    clearTrialTimers();
    clearTimeout(feedbackTimer);
    clearTimeout(recoveryTimer);
    if (syncFrame) cancelAnimationFrame(syncFrame);
    feedbackTimer = null;
    recoveryTimer = null;
    syncFrame = null;
  }
}

function samePositions(left, right) {
  const a = [...left].sort((x, y) => x - y);
  const b = [...right].sort((x, y) => x - y);
  return a.length === b.length && a.every((position, index) => position === b[index]);
}
