const screen = document.getElementById("screen");
let sda = null;
let bios = false;
let fs1Text = null;
function write(text, color, bg) {
    const defaultColor = "white";
    const defaultBg = "black";
    color = color || defaultColor;
    bg = bg || defaultBg;

    screen.style.overflowY = "auto";
    for (let char of text) {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.color = color;
        span.style.backgroundColor = bg;
        screen.appendChild(span);
    }
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function parseFS1(text) {
    const lines = text.split("\n").map(l => l.trimEnd());
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
            while (i < lines.length && !lines[i].startsWith("--")) {
                parsedFS.folders.push(lines[i++]);
            }
        } else if (line === "--files") {
            i++;
            while (i < lines.length && !lines[i].startsWith("--")) {
                const path = lines[i++];
                const count = parseInt(lines[i++]);
                const content = [];
                for (let j = 0; j < count; j++) content.push(lines[i++]);
                parsedFS.files[path] = content.join("\n");
            }
        } else if (line === "--meta") {
            i++;
            while (i < lines.length && !lines[i].startsWith("--")) {
                const path = lines[i++];
                const count = parseInt(lines[i++]);
                const meta = {};
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
async function loadFont() {
    const fontUrl = "./clacon2.woff2";
    const font = new FontFace("ClassicConsole", `url(${fontUrl})`);
    await font.load();
    document.fonts.add(font);
    document.body.style.fontFamily = '"ClassicConsole", monospace';
}

async function pickFS1() {
    const [handle] = await window.showOpenFilePicker({
        types: [{
            description: "FS1 Files",
            accept: {
                "text/plain": [".fs1"]
            }
        }]
    });
    const file = await handle.getFile();
    return await file.text();
}
async function loadFS1FromURL() {
    const url = "https://raw.githubusercontent.com/VRDog28/BrowserLinux/refs/heads/main/main.fs1";
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("Failed to fetch FS1");
    }
    return await res.text();
}
async function checkSHA256(path, expectedHash) {
    const content = window.fs.files[path];
    if (!content) return false;
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    console.log(`SHA-256 for ${path}: ${hashHex}`);

    return hashHex.toLowerCase() === expectedHash.toLowerCase();
}
async function runFile(path) {
    const code = window.fs.files[path];
    if (!code) {
        write("Firmware: File not found: " + path + "\n");
        return;
    }

    try {
        await new Function(`return (async ()=>{ ${code} })();`)();
    } catch (e) {
        write("Error running " + path + ": " + e.message + "\n");
    }
}
async function minimalSave() {
    if (!fs1FileHandle) return;
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
            write("firmware: Failed to save: " + e.message + "\n");
        }
}
async function verifyKernel(silent = false) {
    const krnlhash = ["670bb6236b7557e8b56834bf4feade3d8664bdeb69f8f2074bfb4f1838c1ba16", "751cdb9aaa565b9b8c371a314c1266a0eab9ed5b4beca0352d8066b58f4eb0fc"];
    let match = false
    for (hash of krnlhash) {
        match = await checkSHA256("/krnl/kernel.js", hash);
        if (match) break;
    }

    if (!match && !silent) {
        screen.innerHTML = "";
        write(
            "Your kernel has been modified and is unsafe to run. Contact your Firmware Manufacturer for support!\n",
            "red"
        );
        return false;
    } else if (!match) {
        return false;
    }
    return true;
}
async function startBIOS() {
    screen.innerHTML = "";
    let enterBIOS = false;

    const biosListener = (e) => {
        if (e.key.toLowerCase() === "b") {
            enterBIOS = true;
        }
    };

    document.addEventListener("keydown", biosListener);
    write(`
  _           _          ______ _                                      
 | |         | |        |  ____(_)                                     
 | |     __ _| | _____  | |__   _ _ __ _ __ _____      ____ _ _ __ ___ 
 | |    / _\` | |/ / _ \\ |  __| | | '__| '_ \` _ \\ \\ /\\ / / _\` | '__/ _ \\
 | |___| (_| |   <  __/ | |    | | |  | | | | | \\ V  V / (_| | | |  __/
 |______\\__,_|_|\\_\\___| |_|    |_|_|  |_| |_| |_|\\_/\\_/ \\__,_|_|  \\___|
`);
    write("\n");
    await wait(250);
    write("Lake Bios (c) 2026 Browser Linux\n");
    await wait(1000);
    write("BIOS DATE: 21/4/2026\n");
    write("CPU: Unknown\n");
    await wait(100);
    write("Memory: 500MB\n");
    await wait(100);
    write("Press B to enter BIOS\n");
    await wait(100);
    write("Press CTRL and R to restart\n");
    await wait(500);
    write(`Detected OS version: ${window.version || "Unknown"}\n`)
    write("Storage device configured\n")
    await wait(2500);

    document.removeEventListener("keydown", biosListener);


    if (enterBIOS) {
        BIOS();
        return;
    }
    await loadFont();
    if (!window.skipKernelCheck) {
        const ok = await verifyKernel();
        if (!ok) return;
    }
    runFile("/krnl/kernel.js");
}

async function recoveryMode(list = []) {
    let mode = "user";
    if (list.length != 0) mode = "fix";
    screen.innerHTML = "";
    write("Preparing device for recovery\n");
    if (!window.fs || !window.fs.files || !window.fs.folders || !window.fs.meta || fs1Text == null) {
        write("Could not recover device\n");
        await wait(3000);
        return;
    }
    if (!window.fs.files["/dev/sda"] || window.fs.files["/dev/sda"].length < "10") {
        write("Could not recover device\n");
        await wait(3000);
        return;
    }
    const sdafs = parseFS1(window.fs.files["/dev/sda"]);
    if (mode == "user") {
        const krnlcheck = await verifyKernel(true);
        if (!krnlcheck) list.push("/krnl/kernel.js");
        const cfg = !window.fs.files["/etc/profiles/default.conf"] || window.fs.files["/etc/profiles/default.conf"].trim().length == 0;
        if (cfg) list.push("/etc/profiles/default.conf");
        const sap = !window.fs.files["/krnl/sound/sap.js"] || window.fs.files["/krnl/sound/sap.js"].trim().length == 0;
        if (sap) list.push("/krnl/sound/sap.js");
        const dump = !window.fs.files["/etc/dump.js"] || window.fs.files["/etc/dump.js"].trim().length == 0;
        if (dump) list.push("/etc/dump.js");
        const font = !window.fs.files["/usr/share/fonts/Monospace.font"] || window.fs.files["/usr/share/fonts/Monospace.font"].trim().length == 0;
        if (font) list.push("/usr/share/fonts/Monospace.font");
        const boot = !window.fs.files["/boot/boot.js"] || window.fs.files["/boot/boot.js"].trim().length == 0;
        if (boot) list.push("/boot/boot.js");
        const terminal = !window.fs.files["/bin/terminal.js"] || window.fs.files["/bin/terminal.js"].trim().length == 0;
        if (terminal) list.push("/bin/terminal.js");
        const bash = !window.fs.files["/bin/bash.js"] || window.fs.files["/bin/bash.js"].trim().length == 0;
        if (bash) list.push("/bin/bash.js");
        const config = !window.fs.files["/etc/config.js"] || window.fs.files["/etc/config.js"].trim().length == 0;
        if (config) list.push("/etc/config.js");

    }
    await wait(3000);
    write("Detected issues:\n");
    if (list.length == 0) write("none\n");
    for (issue of list) {
        write(issue + "\n");
    }
    await wait(1000);
    write("Recovering device\n");
    let rebuild = sdafs.folders;
    for (folder of rebuild) {
        if (!window.fs.folders.includes(folder)) {
            window.fs.folders.push(folder)
        }
    }
    if (list.length != 0) {
        for (file of list) {
            if (!sdafs.files[file]) continue;
            window.fs.files[file] = sdafs.files[file];
        }
    }
    await wait(3000);
    write("done\n");
    await minimalSave();
    await wait(3000);
    location.reload();
    return;
}

async function BIOS() {
    let selected = 0;

    const options = [
        "Disable kernel checksum",
        "Reload BIOS",
        "Exit",
        "Recovery Mode"
    ];

    bios = true;
    screen.innerHTML = "";

    const biosUI = document.createElement("div");
    biosUI.style.position = "fixed";
    biosUI.style.inset = "0";
    biosUI.style.width = "100vw";
    biosUI.style.height = "100vh";
    biosUI.style.background = "rgb(0, 0, 0)";
    biosUI.style.fontFamily = '"ClassicConsole", monospace';
    biosUI.style.zIndex = "999999999";

    document.body.appendChild(biosUI);

    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.background = "rgb(0, 0, 0)"
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";

    biosUI.appendChild(container);

    function render() {
        container.innerHTML = "";

        const box = document.createElement("div");
        box.style.width = "900px";
        box.style.maxWidth = "95vw";
        box.style.border = "2px solid rgb(192, 192, 192)";
        box.style.background = "rgb(170,170,170)";
        box.style.position = "relative";

        const header = document.createElement("div");
        header.textContent = "Lake BIOS Setup Utility";
        header.style.background = "rgb(3,3,238)";
        header.style.color = "white";
        header.style.textAlign = "center";
        header.style.padding = "6px";

        const sub = document.createElement("div");
        sub.textContent = "System Boot Manager";
        sub.style.background = "rgb(3,3,238)";
        sub.style.color = "white";
        sub.style.textAlign = "center";
        sub.style.padding = "4px";

        box.appendChild(header);
        box.appendChild(sub);

        options.forEach((opt, i) => {
            const row = document.createElement("div");

            row.textContent = (i === selected ? "> " : "  ") + opt;

            row.style.padding = "6px";
            row.style.background = i === selected
                ? "rgb(210,210,210)"
                : "rgb(170,170,170)";
            row.style.color = i === selected ? "black" : "white";

            box.appendChild(row);
        });

        const footer = document.createElement("div");
        footer.textContent = "↑ ↓ Navigate   ENTER Select";
        footer.style.position = "absolute";
        footer.style.bottom = "5px";
        footer.style.left = "50%";
        footer.style.transform = "translateX(-50%)";
        footer.style.color = "black";

        box.appendChild(footer);

        container.appendChild(box);
    }

    async function exitBIOS() {
        document.removeEventListener("keydown", handler);

        biosUI.remove();

        document.documentElement.style.overflow = "";
        document.body.style.margin = "";
        document.body.style.padding = "";
        document.body.style.background = "";

        bios = false;

        boot();
    }

    async function handleSelect(i) {
        switch (i) {
            case 0:
                window.skipKernelCheck = true;
                await exitBIOS();
                return;

            case 1:
                location.reload();
                return;

            case 2:
                await exitBIOS();
                return;

            case 3:
                document.removeEventListener("keydown", handler);

                biosUI.remove();

                document.documentElement.style.overflow = "";
                document.body.style.margin = "";
                document.body.style.padding = "";
                document.body.style.background = "";

                bios = false;
                await recoveryMode();
                return;
        }
    }

    const handler = (e) => {
        if (e.repeat) return;

        if (e.key === "ArrowUp") {
            selected = (selected - 1 + options.length) % options.length;
            render();
        }

        if (e.key === "ArrowDown") {
            selected = (selected + 1) % options.length;
            render();
        }

        if (e.key === "Enter") {
            handleSelect(selected);
        }
    };

    document.addEventListener("keydown", handler);

    render();
}
async function boot() {
    await loadFont();
    screen.innerHTML = "";

    write("press enter to boot\n", "white");

    const handler = async (e) => {
        if (e.repeat) return;


        if (e.key === "Enter") {
            document.removeEventListener("keydown", handler);

            if (!fs1Text) {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: "FS1 Files",
                        accept: {
                            "text/plain": [".fs1"]
                        }
                    }]
                });

                fs1FileHandle = handle;
                window.fs1FileHandle = handle;

                const file = await handle.getFile();
                fs1Text = await file.text();
            }
        }
        if (e.key.toLowerCase() === "d") {
            document.removeEventListener("keydown", handler);

            try {
                fs1Text = await loadFS1FromURL();
            } catch (err) {
                write("Failed to load FS1 from internet\n", "red");
                return;
            }
        }

        if (!fs1Text) return;



        sda = fs1Text;
        window.fs = parseFS1(fs1Text);
        window.sda = sda;
        let version;

        const kernelV1Hash = "751cdb9aaa565b9b8c371a314c1266a0eab9ed5b4beca0352d8066b58f4eb0fc";

        const kernelMatch = await checkSHA256("/krnl/kernel.js", kernelV1Hash);

        if ("/etc/.version" in window.fs.files) {
            version = window.fs.files["/etc/.version"].trim();
        } else if (kernelMatch) {
            version = "1.0.0";
        } else {
            version = "Unknown";
        }

        window.version = version;

        if (window.fs.files["/dev/sda"] == "*") {
            window.fs.files["/dev/sda"] = window.sda;
        } else if (window.fs.files["/dev/sda"] != "*") {
            window.sda = window.fs.files["/dev/sda"];
            sda = window.fs.files["/dev/sda"];
        }

        if (
            window.fs.files["/firm/firmware.js"] &&
            window.fs.meta["/firm"]
        ) {
            if (window.fs.meta["/firm"].hasOwnProperty(".firmware-unlock")) {
                await runFile("/firm/firmware.js");
                return;
            }
        }

        await startBIOS();
    };

    document.addEventListener("keydown", handler);
}
window.recoveryMode = recoveryMode;
window.parseFS1 = parseFS1;
window.write = write;
boot();