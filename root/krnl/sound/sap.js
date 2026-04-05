const ctx = new (window.AudioContext || window.webkitAudioContext)();
function noteToFreq(note) {
  const notes = {
    C:0, "C#":1, D:2, "D#":3, E:4,
    F:5, "F#":6, G:7, "G#":8, A:9,
    "A#":10, B:11
  };

  const match = note.match(/^([A-G]#?)(-?\d)$/);
  if (!match) return 440;

  const [, pitch, octave] = match;
  const midi = notes[pitch] + (parseInt(octave) + 1) * 12;

  return 440 * Math.pow(2, (midi - 69) / 12);
}
window.sap = {
  play(note) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = noteToFreq(note);

    gain.gain.value = 1;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
};