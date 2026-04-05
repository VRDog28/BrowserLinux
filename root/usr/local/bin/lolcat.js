if (!window.shell.pipe || !window.shell.pipe.length) {
    write("<input> | lolcat\n");
    return;
}

const text = window.shell.pipe;
const lines = text.split("\n");

const startColor = {
    r: 0,
    g: 255,
    b: 0
};
const endColor = {
    r: 0,
    g: 255,
    b: 255
};

function lerp(start, end, t) {
    return Math.round(start + (end - start) * t);
}

for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineLength = line.length;

    for (let i = 0; i < lineLength; i++) {

        let t = i / Math.max(lineLength - 1, 1);
        t = Math.pow(t, 0.5); 

        const r = lerp(startColor.r, endColor.r, t);
        const g = lerp(startColor.g, endColor.g, t);
        const b = lerp(startColor.b, endColor.b, t);

        write(line[i], `rgb(${r},${g},${b})`);
    }

    write("\n");
}