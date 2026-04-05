const osName = window.shell.osName;
const browserName = window.shell.browserName;
const userName = window.shell.userName;
const hostName = window.shell.hostName;
const cwdDisplay = shell.cwd || "\\";

const terminalWidth = 60;

function pad(str, length) {
    return str + " ".repeat(Math.max(0, length - str.length));
}

function gradientLine(text, startColor, endColor) {
    const result = [];
    const len = text.length;

    for (let i = 0; i < len; i++) {
        const char = text[i];

        if (char === " ") {
            result.push({
                char,
                color: null
            });
            continue;
        }

        const ratio = i / len;

        const r = Math.floor(startColor.r + (endColor.r - startColor.r) * ratio);
        const g = Math.floor(startColor.g + (endColor.g - startColor.g) * ratio);
        const b = Math.floor(startColor.b + (endColor.b - startColor.b) * ratio);

        result.push({
            char,
            color: `rgb(${r}, ${g}, ${b})`
        });
    }

    return result;
}

const rawLogo = [
    "     **********     ",
    "  ****************  ",
    " ********++++++++++ ",
    "++****=.-++-.:------",
    "+++**:-******-.-----",
    "+++++.********.-----",
    "++**+:-******-.-----",
    "******=.-++-.-------",
    " ********++*+------ ",
    "  *********=------  ",
    "     *****+:--:     "
];

const startColor = {
    r: 255,
    g: 80,
    b: 80
};
const endColor = {
    r: 80,
    g: 200,
    b: 255
};

const logo = rawLogo.map(line => gradientLine(line, startColor, endColor));

const infoLines = [
    `User: ${userName}@${hostName}`,
    `OS: ${osName}`,
    `Browser: ${browserName}`,
    `CWD: ${cwdDisplay}`,
    `Date: ${new Date().toLocaleString()}`
];

function writeGradientLine(gradientChars, textRight = "") {

    for (let i = 0; i < gradientChars.length; i++) {
        const {
            char,
            color
        } = gradientChars[i];
        write(char, color || "white");
    }

    const padSize = terminalWidth - gradientChars.length;
    write(" ".repeat(Math.max(0, padSize)));

    write(" " + textRight + "\n", "cyan");
}

for (let i = 0; i < Math.max(logo.length, infoLines.length); i++) {
    writeGradientLine(logo[i] || [], infoLines[i] || "");
}

newline();