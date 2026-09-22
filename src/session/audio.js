export const BPM = 66;
let synth = null;
let carrier = null;
let muted = false;
let chamber = false;
let epoch = 0;
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
  muted = value;
  if (muted) synth?.releaseAll();
  carrier?.gain.gain.rampTo(muted || !chamber ? 0 : 1, 0.2);
}
export function sound(kind) {
  if (!synth || muted) return;
  const notes = { accept: ['G4', 'B4', 'D5'], select: ['D5'], retry: ['G3'], pulse: ['G5'], install: ['G3', 'B3', 'D4', 'G4', 'B4'] };
  const length = { accept: '8n', select: '32n', retry: '32n', pulse: '16n', install: '2n' };
  try { synth.triggerAttackRelease(notes[kind], length[kind]); } catch { /* Audio is optional. */ }
}
function buildCarrier() {
  const T = Tone();
  const gain = new T.Gain(0).toDestination();
  const left = new T.Oscillator(200, 'sine').connect(new T.Panner(-1).connect(gain));
  const right = new T.Oscillator(206, 'sine').connect(new T.Panner(1).connect(gain));
  left.volume.value = -27; right.volume.value = -27;
  left.start(); right.start();
  const pulse = new T.MembraneSynth({ pitchDecay: 0.08, octaves: 4, envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.6 }, volume: -16 }).connect(gain);
  const transport = T.getTransport ? T.getTransport() : T.Transport;
  transport.bpm.value = BPM;
  transport.scheduleRepeat(time => pulse.triggerAttackRelease('C1', '8n', time), '4n');
  return { gain, transport };
}
export function setChamber(on) {
  if (on === chamber) return;
  chamber = on;
  if (!synth) return;
  try {
    if (on) {
      if (!carrier) carrier = buildCarrier();
      carrier.transport.start();
      epoch = performance.now();
      carrier.gain.gain.rampTo(muted ? 0 : 1, 4);
    } else if (carrier) {
      carrier.gain.gain.rampTo(0, 3);
      setTimeout(() => { if (!chamber) carrier.transport.stop(); }, 3200);
    }
  } catch { /* Audio is optional. */ }
}
export const beatPhase = now => (((now - epoch) / 1000) * BPM / 60) % 1;
