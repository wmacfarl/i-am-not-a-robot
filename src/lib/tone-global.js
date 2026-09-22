(function () {
  if (typeof window === "undefined") return;
  if (window.Tone) return;
  if (typeof Tone !== "undefined") {
    window.Tone = Tone;
    return;
  }
  if (typeof module !== "undefined" && module.exports) {
    window.Tone = module.exports;
    return;
  }
  if (typeof exports !== "undefined" && exports.Tone) {
    window.Tone = exports.Tone;
  }
})();
