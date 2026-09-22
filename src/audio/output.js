let context = null;
let master = null;
let ambientGain = null;
let ambientLeft = null;
let ambientRight = null;
let muted = false;

const POSITION_NOTES = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33];

export async function initializeAudio() {
  if (context) {
    if (context.state === "suspended") await context.resume();
    return true;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return false;

  try {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.72;
    master.connect(context.destination);

    ambientGain = context.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(master);

    const leftPan = context.createStereoPanner();
    const rightPan = context.createStereoPanner();
    leftPan.pan.value = -0.82;
    rightPan.pan.value = 0.82;
    leftPan.connect(ambientGain);
    rightPan.connect(ambientGain);

    ambientLeft = context.createOscillator();
    ambientRight = context.createOscillator();
    ambientLeft.type = "sine";
    ambientRight.type = "sine";
    ambientLeft.frequency.value = 174;
    ambientRight.frequency.value = 184;
    ambientLeft.connect(leftPan);
    ambientRight.connect(rightPan);
    ambientLeft.start();
    ambientRight.start();

    if (context.state === "suspended") await context.resume();
    return true;
  } catch {
    context = null;
    return false;
  }
}

export function setAudioMuted(nextMuted) {
  muted = Boolean(nextMuted);
  if (!context || !master) return;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(muted ? 0 : 0.72, context.currentTime, 0.04);
}

export function updateAudio(depth, paused = false) {
  if (!context || !ambientGain) return;
  const t = context.currentTime;
  const safeDepth = clamp01(depth);
  const targetGain = paused || safeDepth < 0.22 ? 0 : 0.006 + safeDepth * 0.018;
  ambientGain.gain.cancelScheduledValues(t);
  ambientGain.gain.setTargetAtTime(targetGain, t, paused ? 0.06 : 1.1);
  ambientLeft.frequency.setTargetAtTime(174 + safeDepth * 16, t, 1.6);
  ambientRight.frequency.setTargetAtTime(184 - safeDepth * 4, t, 1.6);
}

export function playRoundLoad() {
  if (!canPlay()) return;
  const now = context.currentTime;
  playVoice({ frequency: 196, start: now, duration: 0.055, gain: 0.028, type: "triangle" });
  playVoice({ frequency: 293.66, start: now + 0.045, duration: 0.04, gain: 0.018, type: "sine" });
}

export function playTileSelect(position, selected = true) {
  if (!canPlay()) return;
  const frequency = POSITION_NOTES[Math.max(0, Math.min(8, Number(position) || 0))];
  playVoice({
    frequency: selected ? frequency : frequency * 0.75,
    start: context.currentTime,
    duration: selected ? 0.11 : 0.065,
    gain: selected ? 0.034 : 0.02,
    type: selected ? "sine" : "triangle",
  });
}

export function playVerifyPulse() {
  if (!canPlay()) return;
  const now = context.currentTime;
  playVoice({ frequency: 523.25, start: now, duration: 0.09, gain: 0.036, type: "sine" });
  playVoice({ frequency: 784.88, start: now + 0.035, duration: 0.06, gain: 0.026, type: "sine" });
}

export function playAcceptance(intensity = 1, selectionCount = 3) {
  if (!canPlay()) return;
  const now = context.currentTime;
  const scale = Math.max(0.7, Math.min(1.35, intensity));
  const voices = selectionCount <= 1 ? [392, 587.33] : [392, 493.88, 587.33];
  voices.forEach((frequency, index) => {
    playVoice({
      frequency,
      start: now + index * 0.038,
      duration: 0.28 + index * 0.045,
      gain: (0.04 + index * 0.006) * scale,
      type: "sine",
    });
  });
}

export function playMismatch() {
  if (!canPlay()) return;
  const now = context.currentTime;
  playVoice({ frequency: 174.61, start: now, duration: 0.13, gain: 0.032, type: "triangle" });
  playVoice({ frequency: 220, start: now + 0.08, duration: 0.1, gain: 0.019, type: "sine" });
}

export function playClassification() {
  if (!canPlay()) return;
  const now = context.currentTime;
  playVoice({ frequency: 110, start: now, duration: 0.65, gain: 0.055, type: "triangle" });
  playVoice({ frequency: 220, start: now + 0.08, duration: 0.58, gain: 0.04, type: "sine" });
  playVoice({ frequency: 440, start: now + 0.16, duration: 0.5, gain: 0.045, type: "sine" });
}

function playVoice({ frequency, start, duration, gain, type }) {
  const oscillator = context.createOscillator();
  const voiceGain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  voiceGain.gain.setValueAtTime(0.0001, start);
  voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.016);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(voiceGain);
  voiceGain.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function canPlay() {
  return Boolean(context && master && !muted && context.state === "running");
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
