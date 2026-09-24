import test from 'node:test';
import assert from 'node:assert/strict';
const ramps = [];
const fake = path => new Proxy(function () {}, {
  get: (_, key) => key === 'then' ? undefined : key === 'rampTo' ? value => { ramps.push({ path, value }); } : fake(`${path}.${String(key)}`),
  set: () => true,
  apply: () => fake(`${path}()`),
  construct: () => fake(`${path}()`),
});
globalThis.window = { Tone: fake('Tone') };
const { startAudio, muteAudio, setChamber } = await import('../src/session/audio.js');

test('re-rendering with the same mute state leaves the carrier gain to the burst and fades', async () => {
  const carrierGain = () => ramps.filter(ramp => ramp.path === 'Tone.Gain().toDestination().gain');
  assert.equal(await startAudio(), true);
  setChamber(true);
  const before = carrierGain().length;
  assert.ok(before > 0);
  for (let i = 0; i < 5; i++) muteAudio(false);
  assert.equal(carrierGain().length, before);
  muteAudio(true); assert.equal(carrierGain().at(-1).value, 0);
  muteAudio(false); assert.equal(carrierGain().at(-1).value, 1);
});
