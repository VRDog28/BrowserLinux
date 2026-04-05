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

function write(text, color, bg) {
    const defaultColor = "white";
    const defaultBg = "black";

    color = color || (window.shell.theme ? window.shell.theme[0] : defaultColor);
    bg = bg || (window.shell.theme ? window.shell.theme[1] : defaultBg);

    screen.style.overflowY = "auto";
    screen.style.maxHeight = screen.style.maxHeight || "100%"; 

    for (let char of text) {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.color = color;
        span.style.backgroundColor = bg;
        span.style.fontSize = window.shell.theme?.[3] || "14px";
        screen.appendChild(span);
    }
    scrollToBottom();
}

function log(header, text, save = false) {
    const logPath = "/var/syslog.log";

    if (!fs.folders.includes("/var")) {
        fs.folders.push("/var");
    }

    if (!fs.files.hasOwnProperty(logPath)) {
        fs.files[logPath] = "";
    }

    const lines = text.split("\n");
    const entry = lines.map(line => `${header}: ${line}`).join("\n") + "\n";

    fs.files[logPath] += entry;
    if (save) console.log("hi");
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
        write("KERNEL: File not found: " + path + "\n");
        return;
    }

    try {
        active.push(path);
        window.shell.lastStatus = await new Function(`return (async ()=>{ ${code} })();`)();
        if (window.shell.lastStatus == undefined) window.shell.lastStatus = 0;
        const index = active.indexOf(path);

        if (index !== -1) {
            active.splice(index, 1);
        }
    } catch (e) {
        log("kernel", "Error: " + e.message, true);
        write("KERNEL Error: " + e.message + "\n");
        window.shell.lastStatus = 1;
    }
}

async function applyFontFromFile() {
    if (!window.shell.font) return;
    const path = window.shell.font.replace(/\/+/g, "/");
    if (!fs.files.hasOwnProperty(path)) {
        log("kernel", "CRITICAL ERROR", true);
        write("KERNEL Error: Font file not found!\n");
        throw new Error("Font file not found!");
    }

    const fontContent = fs.files[path].trim();
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `body, #screen { font-family: ${fontContent} !important; }`;
    document.head.appendChild(styleEl);
}

function startFSSync() {
    setInterval(async () => {
        if (!fs1FileHandle) return;
        try {
            const file = await fs1FileHandle.getFile();
            const fs1Content = await file.text();
            const newFS = parseFS1(fs1Content);

            fs.folders.length = 0;
            fs.folders.push(...newFS.folders);
            for (const k in fs.files) delete fs.files[k];
            for (const k in newFS.files) fs.files[k] = newFS.files[k];
            for (const k in fs.meta) delete fs.meta[k];
            for (const k in newFS.meta) fs.meta[k] = newFS.meta[k];
        } catch (e) {
            log("kernel", "FS1 SYNC FAILED", true);
            write("[FS1 sync failed: " + e.message + "]\n");
        }
    }, 5000);
}

async function requestSuperuserPassword(callback) {
    window.shell.inputMode = "password";
    write("[sudo] password: ", "yellow");

    let buffer = "";
    const inputSpan = document.createElement("span");
    screen.appendChild(inputSpan);

    const handler = async e => {
        if (e.key === "Backspace") {
            if (buffer.length > 0) {
                buffer = buffer.slice(0, -1);
                inputSpan.lastChild?.remove();
            }
            e.preventDefault();
            return;
        }
        if (e.key === "Enter") {
            newline();
            document.removeEventListener("keydown", handler);
            await callback(buffer);
            window.shell.inputMode = "command";
            return;
        }
        if (e.key.length === 1) {
            buffer += e.key;
            inputSpan.appendChild(document.createTextNode("*"));
        }
    };
    document.addEventListener("keydown", handler);
}

async function isSetupComplete() {
    const confPath = "/etc/uas/setup.conf";

    if (!fs.files[confPath]) return false;

    const content = fs.files[confPath].trim();

    return content.includes("setup=1");
}

async function boot() {
    clear();
    log("Boot", "Starting boot process");

    fs = window.fs;
    fs1FileHandle = window.fs1FileHandle;

    for (const path in fs.files)
        if (path.startsWith("/tmp/") && path != "/tmp/") delete fs.files[path];

    if (fs.files["/etc/config.js"]) {
        log("Boot", "Running config.js");
        await runFile("/etc/config.js");
    }

    await applyFontFromFile();
    await runFile("/krnl/sound/sap.js");
    document.body.style.backgroundColor = window.shell.theme?.[2] || "black";
    log("Boot", "Running /boot/boot.js", true);
    const setupDone = await isSetupComplete();
    if (!setupDone) {
        await runFile("/bin/bash.js");
        await runFile("/etc/uas/uas.js");
    } else {
        await runFile("/boot/boot.js");
    }
}

window.write = write;
window.clear = clear;
window.newline = newline;
window.fs = fs;
window.runFile = runFile;
window.wait = wait;
window.saveFS1 = saveFS1;
window.boot = boot;
window.log = log;
window.requestSuperuserPassword = requestSuperuserPassword;
window.active = active;
window.shell = {};

setInterval(() => {
    const elapsed = Date.now() - startTime;
    window.uptime = formatTime(elapsed);
}, 1000);

boot();