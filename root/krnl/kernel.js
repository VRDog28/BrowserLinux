const screen = document.getElementById("screen");
const startTime = Date.now();
let active = ["/krnl/kernel.js"];
let saveTimeout = null;
let saveLock = false;
let savePending = false;
function scrollToBottom() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.scrollTo(0, document.documentElement.scrollHeight);
        });
    });
}
async function kernelPanic(reason) {
    clear();
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `body, #screen { font-family: ClassicConsole, monospace !important; }`;
    document.head.appendChild(styleEl);
    const time = new Date().toISOString();
    write(`Kernel panic -- ${reason}\n`)
    write("CPU: Unknown\n");
    write("Memory: 500MB\n");
    write("Press CTRL and R to restart\n");
    write(`Detected OS version: ${window.version || "Unknown"}\n`);
    write(`Time: ${time}\n`);
    return;
}
function log(header, text, save = false) {
    const logPath = "/var/syslog.log"
    if (!fs.folders.includes("/var")) {
        fs.folders.push("/var");
    }
    if (!fs.files.hasOwnProperty(logPath)) {
        fs.files[logPath] = "";
    }
    const lines = text.split("\n");
    const entry = lines.map(line => `${header}: ${line}`).join("\n") + "\n";
    fs.files[logPath] += entry;
}
function clear() {
    screen.innerHTML = "";
}
function newline() {
    screen.appendChild(document.createElement("br"));
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

let fs = window.fs || {
    folders: [],
    files: {},
    meta: {}
};
let fs1FileHandle = window.fs1FileHandle || null;

function parseFS1(text) {
    const lines = text.split("\n").map(l => l.trim());
    let i = 0;
    const parsedFS = {
        folders: [],
        files: {},
        meta: {}
    };

    while (i < lines.length) {
        const line = lines[i];
        if (line === "--folders") {
            i++;
            while (i < lines.length && !lines[i].startsWith("--")) parsedFS.folders.push(lines[i++]);
        } else if (line === "--files") {
            i++;
            while (i < lines.length && !lines[i].startsWith("--")) {
                const path = lines[i++],
                    count = parseInt(lines[i++]),
                    content = [];
                for (let j = 0; j < count; j++) content.push(lines[i++]);
                parsedFS.files[path] = content.join("\n");
            }
        } else if (line == "--meta") {
            i++;
            while (i < lines.length && !lines[i].startsWith("--")) {
                const path = lines[i++],
                    count = parseInt(lines[i++]),
                    meta = {};
                for (let j = 0; j < count; j++) {
                    const [k, v] = lines[i++].split("=");
                    meta[k.toLowerCase()] = v;
                }
                parsedFS.meta[path] = meta;
            }
        } else i++;
    }
    return parsedFS;
}

async function saveFS1() {
    if (!fs1FileHandle) return;

    if (saveLock) {
        savePending = true;
        return;
    }

    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
        saveTimeout = null;
        saveLock = true;
        savePending = false;

        fs = window.fs;
        const lines = ["fs1", "--folders", ...fs.folders, "--files"];
        for (const path in fs.files) {
            const content = fs.files[path].split("\n");
            lines.push(path);
            lines.push(content.length.toString());
            lines.push(...content);
        }
        lines.push("--meta");
        for (const path in fs.meta) {
            const meta = fs.meta[path];
            const keys = Object.keys(meta);
            lines.push(path);
            lines.push(keys.length.toString());
            for (const k of keys) lines.push(`${k}=${meta[k]}`);
        }
        lines.push("--end");

        try {
            const writable = await fs1FileHandle.createWritable();
            await writable.write(lines.join("\n"));
            await writable.close();
        } catch (e) {
            write("KERNEL: Failed to save: " + e.message + "\n");
        }

        saveLock = false;

        if (savePending) {
            savePending = false;
            await saveFS1();
        }
    }, 300);
}

async function runFile(path) {
    const code = fs.files[path];
    if (!code) {
        log("kernel", "FILE NOT FOUND", true);
        write("kernel: File not found: " + path + "\n");
        return true;
    }

    try {
        active.push(path);
        window.shell.lastStatus = await new Function(`return (async ()=>{ ${code} })();`)();
        if (window.shell.lastStatus == undefined) window.shell.lastStatus = 0;
        const index = active.indexOf(path);

        if (index !== -1) {
            active.splice(index, 1);
        }
        return false
    } catch (e) {
        log("kernel", "Error: " + e.message, true);
        write("kernel: " + e.message + "\n");
        window.shell.lastStatus = 1;
        return true
    }
}


async function requestSuperuserPassword(callback) {
    window.shell.inputMode = "password";

    const textColor = window.shell.theme?.[0] || "white";
    const bgColor = window.shell.theme?.[1] || "black";
    const fontSize = window.shell.theme?.[3] || "14px";
    const fontFamily = getComputedStyle(document.body).fontFamily;
    const promptSpan = document.createElement("span");
    promptSpan.textContent = `[sudo] password for ${window.shell.userName}: `;
    promptSpan.style.color = textColor;
    promptSpan.style.backgroundColor = bgColor;
    promptSpan.style.fontSize = fontSize;
    promptSpan.style.fontFamily = fontFamily;

    screen.appendChild(promptSpan);

    let buffer = "";

    const handler = async e => {
        if (e.key === "Backspace") {
            if (buffer.length > 0) {
                buffer = buffer.slice(0, -1);
            }
            e.preventDefault();
            return;
        }

        if (e.key === "Enter") {
            newline();
            document.removeEventListener("keydown", handler);
            callback(buffer);
            window.shell.inputMode = "command";
            return;
        }

        if (e.key.length === 1) {
            buffer += e.key;
        }
    };

    document.addEventListener("keydown", handler);
}


async function powerwashAndRestore(raw) {
    const fsObj = window.fs;
    fsObj.folders.length = 0;
    fsObj.files = {};
    fsObj.meta = {};
    const newFS = parseFS1(raw);
    fsObj.folders.push(...newFS.folders);
    fsObj.files = newFS.files;
    fsObj.meta = newFS.meta;
    await saveFS1();
}
clear();
if (window.fs.files["/etc/default/lake"]) {
    if (window.fs.files["/etc/default/lake"].trim().split("=")[1] == "false") {
        write("Browser Linux (c) 2026");
        window.writebackup = write;
        write = (t,c,b,s) => {};
    }
}
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(50);
window.write = write;
write("[    0.25326] write validated [0x00000000]\n", "gray");
await wait(50);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
window.clear = clear;
write("[    0.25326] clear validated [0x00000000]\n", "gray");
await wait(25);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(50);
window.newline = newline;
write("[    0.25326] newline validated [0x00000000]\n", "gray");
await wait(100);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(100);
window.fs = fs;
write("[    0.25326] fs validated [0x00000000]\n", "gray");
await wait(25);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
window.runFile = runFile;
write("[    0.25326] runFile validated [0x00000000]\n", "gray");
await wait(50);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
window.wait = wait;
write("[    0.25326] wait validated [0x00000000]\n", "gray");
await wait(25);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
window.saveFS1 = saveFS1;
write("[    0.25326] saveFS1 validated [0x00000000]\n", "gray");
await wait(100);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
window.log = log;
write("[    0.25326] log validated [0x00000000]\n", "gray");
await wait(50);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(50);
window.requestSuperuserPassword = requestSuperuserPassword;
write("[    0.25326] password validated [0x00000000]\n", "gray");
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(25);
window.kernelPanic = kernelPanic;
write("[    0.25326] kernelPanic validated [0x00000000]\n", "gray");
await wait(100);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(50);
window.scrollToBottom = scrollToBottom;
write("[    0.25326] scroll validated [0x00000000]\n", "gray");
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(50);
window.active = active;
write("[    0.25326] active validated [0x00000000]\n", "gray");
await wait(25);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
window.shell = {};
write("[    0.25326] shell validated [0x00000000]\n", "gray");
await wait(25);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(100);

setInterval(() => {
    const elapsed = Date.now() - startTime;
    window.uptime = formatTime(elapsed);
}, 1000);
write("[    0.25326] hash validated [0x00000000]\n", "gray");
await wait(50);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("*************************************\n", "gray");
write("* 0.25326              0x00000000   *\n", "gray");
write("*************************************\n", "gray");
newline();
newline();
await wait(25);
write("[*] Buffer output=none\n", "gray");
write("[*] systemd=queue\n", "gray");
write("[*] Active dump\n", "gray");
runFile("/etc/systemd/system/init.js");
write("[*] systemd=active\n", "gray");
write("[    0.25326] hash validated [0x00000000]\n", "gray");