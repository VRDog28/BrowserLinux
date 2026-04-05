let input = shell.args[0];

if (!input) {
    write("sleep: missing operand\n");
    return 1;
}

let ms = 0;

const match = input.match(/^(\d*\.?\d+)(ms|s|m)?$/);

if (!match) {
    write("sleep: invalid time interval '" + input + "'\n");
    return 1;
}

let value = parseFloat(match[1]);
let unit = match[2];


if (!unit || unit === "s") {
    ms = value * 1000;
} else if (unit === "m") {
    ms = value * 60 * 1000;
} else if (unit === "ms") {
    ms = value;
}
shell.inputMode = "sleep";
await wait(ms);
shell.inputMode = "command";