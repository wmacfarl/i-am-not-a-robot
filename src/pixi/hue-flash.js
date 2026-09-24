const COLORS = [[232, 121, 249], [167, 139, 250], [129, 140, 248], [96, 165, 250]];

const fragment = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 uColor;
float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
vec3 withLum(vec3 c, float l) {
  c += l - lum(c);
  float low = min(min(c.r, c.g), c.b);
  float high = max(max(c.r, c.g), c.b);
  if (low < 0.0) c = l + (c - l) * l / (l - low);
  if (high > 1.0) c = l + (c - l) * (1.0 - l) / (high - l);
  return c;
}
void main() {
  vec4 base = texture2D(uSampler, vTextureCoord);
  if (base.a == 0.0) { gl_FragColor = base; return; }
  vec3 color = base.rgb / base.a;
  gl_FragColor = vec4(mix(color, withLum(uColor, lum(color)), 0.55) * base.a, base.a);
}`;

export function createHueFlash(resolution) {
  const filter = new window.PIXI.Filter(undefined, fragment, { uColor: new Float32Array(3) });
  filter.resolution = resolution;
  return { filter, startedAt: null };
}

export function applyHueFlash(container, flash, on, now) {
  if (!on) {
    flash.startedAt = null;
    if (container.filters) container.filters = null;
    return;
  }
  if (flash.startedAt === null) flash.startedAt = now;
  const color = COLORS[Math.floor((now - flash.startedAt) / 455 * 4) % 4];
  for (let i = 0; i < 3; i++) flash.filter.uniforms.uColor[i] = color[i] / 255;
  if (!container.filters) container.filters = [flash.filter];
}
