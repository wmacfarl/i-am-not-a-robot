function easeInOut(x) {
  let s = x;
  for (let i = 0; i < 8; i++) {
    const error = 3 * (1 - s) * (1 - s) * s * 0.42 + 3 * (1 - s) * s * s * 0.58 + s * s * s - x;
    if (Math.abs(error) < 1e-6) break;
    s -= error / (1.26 * (1 - s) * (1 - s) + 0.96 * (1 - s) * s + 1.26 * s * s);
  }
  return 3 * (1 - s) * s * s + s * s * s;
}

export function track(frames, t) {
  let i = 1;
  while (i < frames.length - 1 && t > frames[i][0]) i++;
  const [start, from] = frames[i - 1];
  const [end, to] = frames[i];
  const x = easeInOut(Math.min(1, Math.max(0, (t - start) / (end - start))));
  return Array.isArray(from) ? from.map((value, index) => value + (to[index] - value) * x) : from + (to - from) * x;
}
