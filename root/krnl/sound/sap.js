const ctx = new (window.AudioContext || window.webkitAudioContext)();
let freq = 440
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

  return freq * Math.pow(2, (midi - 69) / 12);
}
async function playSong(cmdLine, sh4u=false) {
    let path;

let base = cmdLine.startsWith("/") ? cmdLine : (shell.cwd === "/" ? "" : shell.cwd) + "/" + cmdLine;
path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");

    const file = window.fs.files[path];
    if (!file) return false;

    const lines = file.split("\n")

    let mode
    const isNumber = (s) => /^-?\d+$/.test(s.trim());
    let index = 0
    window.sap.playing = true;
    let prev = window.shell.inputMode;
    window.shell.inputMode = "sap";
    if (sh4u) document.addEventListener("keydown", handleKeydown);
    if (sh4u) screen.innerHTML = "";
    freq = lines[0];
    lines.shift();
    for (const line of lines) {
        mode = "note";
        if (isNumber(line)) mode = "wait";
        if (mode == "wait") {
          if (sh4u) write(index + " | " + line + "ms\n", "white", window.shell.theme[2], true);
          await wait(Number(line));
          index++;
          continue;
        }
        window.sap.play(line.split(" ")[0], Number(line.split(" ")[1]));
        if (sh4u) {
            screen.innerHTML = "";

            const parts = line.split(" ");
            const note = parts[0];
            const length = Number(parts[1]);

            write(index + " | " + note + " | Length: " + length + "ms\n", "white", "purple", true);

            for (let i = index + 1; i < index + 26 && i < lines.length; i++) {
                const next = lines[i];

                if (isNumber(next)) {
                    write(i + " | " + next + "ms\n", "gray", window.shell.theme[2], true);
                } else {
                    const p = next.split(" ");
                    const n = p[0];
                    const l = Number(p[1]);

                    write(i + " | " + n + " | Length: " + l + "ms\n", "gray", window.shell.theme[2], true);
                }
            }
        }
        if (window.sap.stop) {
          break;
        }
        index++;
    }
    window.shell.inputMode = prev;
    window.sap.playing = false;
    if (sh4u) screen.innerHTML = "";
    if (sh4u) prompt();
    window.sap.stop = false;
    return true;
}

window.sap = {
  play(note, duration = 300) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = noteToFreq(note);

    gain.gain.value = 1;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }
};

function handleKeydown(e) {
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
        window.sap.stop = true;
        document.removeEventListener("keydown", handleKeydown);
    }
}

window.sap.playsap = playSong
window.sap.playing = false;
window.sap.stop = false;