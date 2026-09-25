export const BPM = 66;
const TONE = 203;
const beatAt = amount => 6 * (40 / 6) ** amount;
let synth = null;
let carrier = null;
let muted = false;
let chamber = false;
let epoch = 0;
let base = { cross: 0.25, cutoff: 900 };
let intensity = null;
let surge = 0;
let climax = 0;
let windup = 0;
let bursting = false;
let burstTimers = [];
const Tone = () => window.Tone;
export async function startAudio() {
  try {
    if (!Tone()) return false;
    await Tone().start();
    if (!synth) synth = new (Tone().PolySynth)(Tone().Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.5 }, volume: -20 }).toDestination();
    return true;
  } catch { return false; }
}
export function muteAudio(value) {
  if (value === muted) return;
  muted = value;
  if (muted) synth?.releaseAll();
  carrier?.gain.gain.rampTo(muted || !chamber ? 0 : 1, 0.2);
}
export function sound(kind) {
  if (!synth || muted) return;
  const notes = { accept: ['G4', 'B4', 'D5'], select: ['D5'], retry: ['G3'], pulse: ['G5'], install: ['G3', 'B3', 'D4', 'G4', 'B4'], confirm: ['D4', 'A4', 'D5'] };
  const length = { accept: '8n', select: '32n', retry: '32n', pulse: '16n', install: '2n', confirm: '4n' };
  try { synth.triggerAttackRelease(notes[kind], length[kind]); } catch { /* Audio is optional. */ }
}
function buildCarrier() {
  const T = Tone();
  const gain = new T.Gain(0).toDestination();
  const filter = new T.Filter(base.cutoff, 'lowpass').connect(gain);
  const panLeft = new T.Panner(-1).connect(filter);
  const panRight = new T.Panner(1).connect(filter);
  const left = new T.Oscillator(TONE - beatAt(0) / 2, 'sine');
  const right = new T.Oscillator(TONE + beatAt(0) / 2, 'sine');
  left.volume.value = -27; right.volume.value = -27;
  const direct = [new T.Gain(1).connect(panLeft), new T.Gain(1).connect(panRight)];
  const cross = [new T.Gain(0).connect(panRight), new T.Gain(0).connect(panLeft)];
  left.connect(direct[0]); left.connect(cross[0]);
  right.connect(direct[1]); right.connect(cross[1]);
  left.start(); right.start();
  const pulse = new T.MembraneSynth({ pitchDecay: 0.08, octaves: 4, envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.6 }, volume: -16 }).connect(filter);
  const transport = T.getTransport ? T.getTransport() : T.Transport;
  transport.bpm.value = BPM;
  transport.scheduleRepeat(time => pulse.triggerAttackRelease('C1', '8n', time), '4n');
  return { gain, filter, transport, left, right, direct, cross, pulse };
}
function fireBurst(seconds) {
  const { gain, left, right } = carrier;
  const t0 = Tone().now();
  const hit = t0 + 0.3;
  const crest = t0 + Math.max(0.9, seconds - 0.65);
  gain.gain.rampTo(0.5, 0.22).linearRampToValueAtTime(0, t0 + 0.27).setValueAtTime(0, hit).linearRampToValueAtTime(1.6, hit + 0.06).exponentialRampToValueAtTime(2.4, crest);
  const beats = Array.from({ length: 33 }, (_, i) => beatAt(i / 32));
  left.frequency.setValueCurveAtTime(beats.map(beat => TONE - beat / 2), hit, crest - hit);
  right.frequency.setValueCurveAtTime(beats.map(beat => TONE + beat / 2), hit, crest - hit);
}
function applyCross(amount, seconds) {
  const angle = Math.min(1, Math.max(0, amount)) * Math.PI / 4;
  carrier.direct.forEach(node => node.gain.rampTo(Math.cos(angle), seconds));
  carrier.cross.forEach(node => node.gain.rampTo(Math.sin(angle), seconds));
}
function applyBase(seconds) {
  applyCross(climax > 0 ? Math.max(base.cross, climax) : base.cross + 0.35 * surge, seconds);
  carrier.filter.frequency.rampTo(climax > 0 ? base.cutoff + climax * 5200 : base.cutoff * (1 + 0.8 * surge), seconds);
  carrier.pulse.volume.rampTo(-16 + 8 * climax, seconds);
}
function tune(amount, seconds) {
  carrier.left.frequency.rampTo(TONE - beatAt(amount) / 2, seconds);
  carrier.right.frequency.rampTo(TONE + beatAt(amount) / 2, seconds);
}
export function setBeat(amount) {
  if (amount === windup) return;
  windup = amount;
  if (carrier && !bursting) tune(windup, 0.1);
}
export function snap() {
  if (!carrier || muted || !chamber) return;
  const t = Tone().now();
  carrier.gain.gain.rampTo(0, 0.02).setValueAtTime(0, t + 0.4).linearRampToValueAtTime(1, t + 0.9);
}
export function setChamber(on) {
  if (on === chamber) return;
  chamber = on;
  if (!synth) return;
  try {
    if (on) {
      if (!carrier) carrier = buildCarrier();
      applyBase(0.1);
      carrier.transport.start();
      epoch = performance.now();
      carrier.gain.gain.rampTo(muted ? 0 : 1, 4);
    } else if (carrier) {
      carrier.gain.gain.rampTo(0, 3);
      setTimeout(() => { if (!chamber) carrier.transport.stop(); }, 3200);
    }
  } catch { /* Audio is optional. */ }
}
export function setIntensity(meter) {
  if (meter === intensity) return;
  intensity = meter;
  base = { cross: 0.25 + 0.45 * meter, cutoff: 900 + 2600 * meter };
  if (carrier && !bursting) applyBase(0.6);
}
export function setSurge(amount) {
  if (amount === surge) return;
  surge = amount;
  if (carrier && !bursting) applyBase(amount ? 0.15 : 0.5);
}
export function setClimax(progress) {
  const next = Math.min(1, Math.max(0, progress));
  if (Math.abs(next - climax) < 0.02 && (next === 0) === (climax === 0)) return;
  climax = next;
  if (carrier && !bursting) applyBase(0.5);
}
export function setBurst(on, ms = 3600) {
  if (on === bursting || !carrier) return;
  bursting = on;
  burstTimers.forEach(clearTimeout); burstTimers = [];
  const later = (fn, delay) => burstTimers.push(setTimeout(fn, delay));
  const level = () => (muted || !chamber ? 0 : 1);
  try {
    if (on) {
      if (level()) fireBurst(ms / 1000);
      later(() => {
        applyCross(0.85, 0.12);
        carrier.filter.frequency.rampTo(3200, 0.6);
      }, 300);
      later(() => { applyCross(1, 0.8); carrier.filter.frequency.rampTo(5200, 1.2); }, 900);
      later(() => { carrier.filter.frequency.rampTo(7000, 0.4); carrier.pulse.volume.rampTo(-10, 0.3); }, Math.max(1000, ms - 650));
    } else {
      tune(0, 0.02);
      carrier.gain.gain.rampTo(level(), 0.08);
      carrier.pulse.volume.rampTo(-16, 0.5);
      applyBase(0.25);
      sound('confirm');
    }
  } catch { /* Audio is optional. */ }
}
export const beatPhase = now => (((now - epoch) / 1000) * BPM / 60) % 1;
