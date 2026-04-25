async function runFile(path) {
    const code = fs.files[path];
    if (!code) {
        log("systemd", "FILE NOT FOUND", true);
        write("systemd: File not found: " + path + "\n");
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
        log("systemd", "Error: " + e.message, true);
        write("systemd: " + e.message + "\n");
        window.shell.lastStatus = 1;
        return true
    }
}
async function log(header, text, save = false) {
    write("Logging ", "gray"); write("Log Service\n", "white");
    await wait(50);
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
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Logged ", "gray"), write("Log Service\n", "white");
}
function log2(header, text, save = false) {
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
function write(text, color, bg, sw) {
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
    if (!sw) scrollToBottom();
}
async function applyFontFromFile() {
    if (!window.shell.font) return true;
    const path = window.shell.font.replace(/\/+/g, "/");
    if (!fs.files.hasOwnProperty(path)) {
        write("systemd: Font file not found!\n");
        return true
    }
    write("Applying ", "gray"); write("Font...\n", "white");
    const fontContent = fs.files[path].trim();
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `body, #screen { font-family: ${fontContent} !important; }`;
    document.head.appendChild(styleEl);
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Applied ", "gray"), write("Font.\n", "white");
    return false
}
async function isSetupComplete() {
    write("Checking ", "gray"); write("Setup Data...\n", "white");
    const confPath = "/etc/uas/setup.conf";

    if (!fs.files[confPath]) return false;

    const content = fs.files[confPath].trim();
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Checked ", "gray"), write("Setup Data.\n", "white");
    return content.includes("setup=1");
}
async function boot() {
    await log("Boot", "Starting boot process");
    write("Mounting ", "gray"); write("Fs1 Filesystem...\n", "white");
    await wait(50);
    await log("systemd", "Mounting Fs1 Filesystem");
    fs = window.fs;
    fs1FileHandle = window.fs1FileHandle;
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Mounted ", "gray"), write("Fs1 Filesystem.\n", "white");
    write("Clearing ", "gray"); write("/tmp...\n", "white");
    await wait(50);
    await log("systemd", "Clearing /tmp");
    let code
    for (const path in fs.files)if (path.startsWith("/tmp/") && path != "/tmp/") delete fs.files[path];
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Cleared ", "gray"), write("/tmp.\n", "white");
    await log("Boot", "Running config.js");
    write("Starting ", "gray"); write("Configuration Service...\n", "white");
    await wait(50);
    code = await runFile("/etc/config.js");
    if (code) { kernelPanic("config failed to load"); return; }
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Configuration Service.\n", "white");
    write("Starting ", "gray"); write("Sound Service...\n", "white");
    await wait(50);
    await log("systemd", "Starting Sound Service");
    code = await runFile("/krnl/sound/sap.js");
    if (code) { kernelPanic("sound failed to load"); return; }
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Sound Service.\n", "white");
    write("Starting ", "gray"); write("Theme Service...\n", "white");
    await wait(50);
    await log("systemd", "Starting Theme Service");
    document.body.style.backgroundColor = window.shell.theme?.[2] || "black";
    write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Theme Service.\n", "white");
    await log("Boot", "Running /boot/boot.js", true);
    const setupDone = await isSetupComplete();
    if (!setupDone) {
        write("Preparing ", "gray"); write("Aliases...\n", "white");
        await wait(50);
        await log("systemd", "Preparing Aliases");
        window.shell.aliases = {};
        write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Prepared ", "gray"), write("Aliases.\n", "white");
        write("Starting ", "gray"); write("Bash Interpreter...\n", "white");
        await wait(50);
        await log("systemd", "Starting Bash Interpreter");
        code = await runFile("/bin/bash.js");
        if (code) { kernelPanic("bash interpreter failed to load"); return; }
        write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Bash Interpreter.\n", "white");
        write("Starting ", "gray"); write("User Account Setup.\n", "white");
        await wait(50);
        await log("systemd", "Starting User Account Setup");
        write("Starting ", "gray"); write("Log Service...\n", "white");
        await wait(50);
        await log("systemd", "Starting Log Service");
        window.log = log2;
        write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Log Service.\n", "white");
        if (window.writebackup) {
            write = window.writebackup;
            window.write = window.writebackup;
        }
        code = await runFile("/etc/uas/uas.js");
        if (code) { kernelPanic("uas corrupted or failed to load"); return; }
    } else {
        write("Starting ", "gray"); write("Font Service...\n", "white");
        await wait(50);
        await log("systemd", "Starting Font Service");
        write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Font Service.\n", "white");
        write("Starting ", "gray"); write("Boot Process...\n", "white");
        await wait(50);
        await log("systemd", "Starting Boot Process");
        write("Starting ", "gray"); write("Write Service...\n", "white");
        await wait(50);
        await log("systemd", "Starting Write Service");
        window.write = write;
        write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Write Service.\n", "white");
        write("Starting ", "gray"); write("Log Service...\n", "white");
        await wait(50);
        await log("systemd", "Starting Log Service");
        window.log = log2;
        write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Log Service.\n", "white");
        code = await applyFontFromFile();
        if (code) { kernelPanic("font not found"); return; }
        if (window.writebackup) {
            write = window.writebackup;
            window.write = window.writebackup;
        }
        code = await runFile("/boot/boot.js");
        if (code) { kernelPanic("boot corrupted"); return; }
    }
}
if (window.writebackup) {
    window.writebackup = write;
    write = (t,c,b,s) => {};
}
write("Starting ", "gray"); write("Boot Process...\n", "white");
await wait(50);
write("Starting ", "gray"); write("Log Service...\n", "white");
await wait(50);
window.log = log;
write("[ ", "gray"); write("OK", "green"); write(" ] ", "gray"); write("Started ", "gray"), write("Log Service.\n", "white");
boot();