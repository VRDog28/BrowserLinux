
const screen = document.getElementById("screen");
let sda = null;

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
        write("BIOS: File not found: " + path + "\n");
        return;
    }

    try {
        await new Function(`return (async ()=>{ ${code} })();`)();
    } catch (e) {
        write("Error running " + path + ": " + e.message + "\n");
    }
}

async function verifyKernel() {
    const krnlhash = "751cdb9aaa565b9b8c371a314c1266a0eab9ed5b4beca0352d8066b58f4eb0fc";

    const match = await checkSHA256("/krnl/kernel.js", krnlhash);

    if (!match) {
        write(
            "Your kernel has been modified and is unsafe to run. Contact your BIOS Manufacturer for support!\n",
            "red"
        );
        return false;
    }
    return true;
}
async function startBIOS() {
    await loadFont();
    write("\n")
    write("Press enter to continue\n", "gray");

    const handler = async (e) => {

        if (e.type === "keydown" && e.key === "Delete") {
            document.removeEventListener("keydown", handler);
            screen.innerHTML = "";
            BIOS();
            return;
        }

        if (e.type === "keydown" && e.key === "Enter") {
            document.removeEventListener("keydown", handler);
            if (!window.skipKernelCheck) {
                const ok = await verifyKernel();
                if (!ok) return;
            }
            screen.innerHTML = "";
            runFile("/krnl/kernel.js");
        }
    };
    document.addEventListener("keydown", handler);
}

async function BIOS() {
    let selected = 0;

    const options = [
        "Disable kernel checksum",
        "Reload BIOS",
        "Exit",
        "Recovery Mode (restore FS1 from .rcvr)"
    ];

    const screenWidth = 60;
    const screenHeight = 21;

    function center(text) {
        const pad = Math.floor((screenWidth - text.length) / 2);
        return " ".repeat(pad) + text + " ".repeat(screenWidth - pad - text.length);
    }

    function render() {
        screen.innerHTML = "";

        const totalContentHeight = 2 + 1 + options.length + 1;
        const topPadding = Math.floor((screenHeight - totalContentHeight) / 2);

        write(center("Lake BIOS Setup Utility") + "\n", "white", "rgb(3, 3, 238)");
        write(center("Boot") + "\n", "white", "rgb(3, 3, 238)");

        write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");
        write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");
        write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");
        write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");
        write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");

        options.forEach((opt, i) => {
            const prefix = (i === selected ? "> " : "  ");
            let text = prefix + opt;

            const pad = Math.floor((screenWidth - text.length) / 2);
            const line =
                " ".repeat(pad) +
                text +
                " ".repeat(screenWidth - pad - text.length);

            if (i === selected) {
                write(line + "\n", "black", "rgb(210,210,210)");
            } else {
                write(line + "\n", "white", "rgb(170,170,170)");
            }
        });

        write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");

        const used =
            topPadding +
            totalContentHeight;

        for (let i = used; i < screenHeight; i++) {
            write(" ".repeat(screenWidth) + "\n", "white", "rgb(170,170,170)");
        }
        write(" ".repeat(screenWidth) + "\n", "white", "rgb(3, 3, 238)");
        write(" ".repeat(screenWidth) + "\n", "white", "rgb(3, 3, 238)");
    }

    async function handleSelect(index) {
        switch (index) {
            case 0:
                window.skipKernelCheck = true;
                screen.innerHTML = "";
                document.removeEventListener("keydown", handler);
                startBIOS();
                return;
            case 1:
                location.reload();
                return;
            case 2:
                screen.innerHTML = "";
                document.removeEventListener("keydown", handler);
                startBIOS();
                return;
            case 3:
                await enterRecoveryMode();
                break;
        }

        render();
    }

    async function enterRecoveryMode() {
        try {
            const [fs1Handle] = await window.showOpenFilePicker({
                types: [{
                    accept: {
                        "text/plain": [".fs1"]
                    }
                }]
            });

            const [rcvrHandle] = await window.showOpenFilePicker({
                types: [{
                    accept: {
                        "text/plain": [".rcvr"]
                    }
                }]
            });

            const rcvrText = await (await rcvrHandle.getFile()).text();

            const writable = await fs1Handle.createWritable();
            await writable.write(rcvrText);
            await writable.close();
        } catch (e) {}
    }

    const handler = async (e) => {
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
            await handleSelect(selected);
        }
    };

    document.addEventListener("keydown", handler);

    render();
}
async function Startup() {
    screen.innerHTML = "";
    write("American Megatrends Inc.\n", "#00ff00");
    await wait(400);
    write("BIOS Date: 07/15/21  Ver: 2.20.1271\n", "gray");
    await wait(300);
    write("CPU: Intel(R) Core(TM) i7-9700K @ 3.60GHz\n", "white");
    await wait(250);
    write("Speed: 3600MHz\n\n", "gray");
    await wait(400);
    write("Initializing USB Controllers .. Done.\n", "gray");
    await wait(300);
    write("Testing System Memory\n", "white");
    await wait(300);
    write("Memory Test: ", "white");
    for (let i = 0; i <= 16384; i += 256) {
        write(i + "K ", "gray");
        await wait(20 + Math.random() * 30);
    }
    write("OK\n", "#00ff00");
    await wait(400);
    write("\nDetecting Storage Devices...\n", "white");
    write("SATA Port 1: FS1 Hard Disk\n", "gray");
    await wait(250);
    write("SATA Port 2: Not Detected\n", "gray");
    await wait(200);
    write("USB Device(s): 1 Keyboard, 1 Mouse\n", "gray");
    await wait(300);
    write("\nBoot Device: Hard Disk\n", "white");
    await wait(500);
    startBIOS();
}

async function boot() {
    await loadFont();
    screen.innerHTML = "";

    write("press enter to boot\n", "white");

    const handler = async (e) => {
        if (e.repeat) return;

        let fs1Text = null;

        if (e.key === "Enter") {
            document.removeEventListener("keydown", handler);

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

        document.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log("Fullscreen failed:", err);
                });
            }
        }, { once: true });

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

        await Startup();
    };

    document.addEventListener("keydown", handler);
}
window.parseFS1 = parseFS1;
boot();