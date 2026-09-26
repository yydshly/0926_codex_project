(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CameraEffects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Repeatable synthetic intensity noise. This is not a calibrated camera model.
  function applyNoise(image, amplitude, seed, sequence) {
    if (![0, 8, 24].includes(amplitude)) throw new Error('无效的图像噪声强度。');
    if (!image || !image.data || image.data.length !== image.width * image.height * 4) throw new Error('无效的相机图像。');
    if (!amplitude) return image;
    let state = ((seed >>> 0) ^ Math.imul(sequence + 1, 2654435761)) >>> 0;
    for (let i = 0; i < image.data.length; i += 4) {
      state += 0x6D2B79F5;
      let n = state;
      n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      const offset = Math.round((((n ^ n >>> 14) >>> 0) / 4294967296 * 2 - 1) * amplitude);
      for (let channel = 0; channel < 3; channel++) image.data[i + channel] = Math.max(0, Math.min(255, image.data[i + channel] + offset));
    }
    return image;
  }
  return { applyNoise };
});
