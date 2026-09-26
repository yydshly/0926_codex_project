(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ImageObserver = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // This observer receives pixels only. It reports whole-frame changes and
  // deliberately has no object, location, tracking, or device-control output.
  var VERSION = 'frame-change/1';
  var PIXEL_DIFFERENCE = 18;
  var CHANGED_PERCENT = 0.1;
  var BRIGHTNESS_POINTS = 8;
  var EVENT_COOLDOWN_SECONDS = 1.5;

  function round(value) {
    return Math.round(value * 1000000) / 1000000;
  }

  function validate(imageData, metadata, previous) {
    if (!imageData || !Number.isSafeInteger(imageData.width) || imageData.width < 1 ||
        !Number.isSafeInteger(imageData.height) || imageData.height < 1) {
      throw new TypeError('imageData must have positive integer width and height.');
    }
    var length = imageData.width * imageData.height * 4;
    if (!Number.isSafeInteger(length) ||
        Object.prototype.toString.call(imageData.data) !== '[object Uint8ClampedArray]' ||
        imageData.data.length !== length) {
      throw new TypeError('imageData.data must be an RGBA Uint8ClampedArray matching its dimensions.');
    }
    if (!metadata || !Number.isSafeInteger(metadata.sequence) || metadata.sequence < 0 ||
        !Number.isFinite(metadata.sampledAt) || metadata.sampledAt < 0) {
      throw new TypeError('Metadata requires a nonnegative integer sequence and finite sampledAt in seconds.');
    }
    if (previous && (metadata.sequence <= previous.sequence || metadata.sampledAt < previous.sampledAt)) {
      throw new RangeError('sequence must increase and sampledAt must not move backwards.');
    }
  }

  function createObserver() {
    var previous = null;
    var lastEventAt = -Infinity;

    function reset() {
      previous = null;
      lastEventAt = -Infinity;
    }

    function analyze(imageData, metadata) {
      validate(imageData, metadata, previous);
      var width = imageData.width;
      var height = imageData.height;
      var pixels = width * height;
      var current = new Float32Array(pixels);
      var baseline = !previous || previous.width !== width || previous.height !== height;
      var total = 0;
      var totalDifference = 0;
      var changedPixels = 0;

      for (var i = 0; i < pixels; i += 1) {
        var offset = i * 4;
        // Canvas camera frames are opaque; alpha is not a separate observation.
        current[i] = 0.2126 * imageData.data[offset] +
          0.7152 * imageData.data[offset + 1] + 0.0722 * imageData.data[offset + 2];
        total += current[i];
        if (!baseline) {
          var difference = Math.abs(current[i] - previous.luminance[i]);
          totalDifference += difference;
          if (difference >= PIXEL_DIFFERENCE) changedPixels += 1;
        }
      }

      var brightness = total / pixels / 255 * 100;
      var changedPercent = baseline ? 0 : changedPixels / pixels * 100;
      var meanDifference = baseline ? 0 : totalDifference / pixels;
      var state = 'baseline';
      var event = null;
      if (!baseline) {
        state = Math.abs(brightness - previous.brightness) >= BRIGHTNESS_POINTS
          ? 'brightness' : changedPercent >= CHANGED_PERCENT ? 'changed' : 'quiet';
        if ((state === 'brightness' || state === 'changed') &&
            state !== previous.state && metadata.sampledAt - lastEventAt >= EVENT_COOLDOWN_SECONDS) {
          event = state === 'brightness' ? 'brightness-change' : 'frame-change';
          lastEventAt = metadata.sampledAt;
        }
      }

      previous = {
        width: width,
        height: height,
        luminance: current,
        brightness: brightness,
        state: state,
        sequence: metadata.sequence,
        sampledAt: metadata.sampledAt
      };

      return {
        version: VERSION,
        sequence: metadata.sequence,
        sampledAt: metadata.sampledAt,
        brightness: round(brightness),
        changedPercent: round(changedPercent),
        meanDifference: round(meanDifference),
        state: state,
        event: event
      };
    }

    return Object.freeze({ analyze: analyze, reset: reset });
  }

  return Object.freeze({ createObserver: createObserver });
}));
