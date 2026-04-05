if (!shell.args || shell.args.length === 0) {
    write("nano: missing operand\n");
    return 1;
}

const filename = shell.args[0];

let path;
if (filename.startsWith("/")) {
    path = filename.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + filename;
    path = path.replace(/\/+/g, "/");
}

const parts = path.split("/");
parts.pop(); 

const parentFolder = parts.join("/") || "/";

if (parentFolder !== "/" && !fs.folders.includes(parentFolder)) {
    write(`nano: cannot open '${filename}': No such file or directory\n`);
    return 1;
}

function getEffectiveWritePermission(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "/";
    let writePerm = 0;
    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath]?.writepermission !== undefined) {
            writePerm = parseInt(fs.meta[currentPath].writepermission);
        }
    }
    return writePerm;
}

const parentWritePerm = getEffectiveWritePermission(parentFolder);
if (parentWritePerm > shell.userPermission && shell.userPermission !== 4) {
    write(`nano: cannot open '${filename}': Permission denied\n`);
    return 1;
}

let buffer = (fs.files[path] || "").split("\n");
if (buffer.length === 0) buffer = [""];

let cursorY = 0,
    cursorX = 0,
    isOpen = true;

window.shell.inputMode = "nano";
screen.innerHTML = "";

function render() {
    clear();
    write("    Nano                    " + path + "                   \n", "black", "white");
    buffer.forEach((line, i) => {
        for (let j = 0; j <= line.length; j++) {
            if (i === cursorY && j === cursorX) {
                write(line[j] || " ", "black", "white"); 

            } else if (j < line.length) {
                write(line[j], "white");
            }
        }
        newline();
    });
    write("\n\n\n\n\n\n\n");
    write("        ");
    write(" [ Welcome to Nano ] \n", "black", "white");
    write("^S", "black", "white");
    write(" Save");
    newline();
    write("^Q", "black", "white");
    write(" Quit");
    newline();
};

async function exitNano() {
    document.removeEventListener("keydown", nanoKeyHandler);
    window.shell.inputMode = "command";

    fs.files[path] = buffer.join("\n");
    if (typeof saveFS1 === "function") await saveFS1();

    clear();

    prompt();

    isOpen = false;
}

async function nanoKeyHandler(e) {
    if (window.shell.inputMode !== "nano") return;
    e.preventDefault();

    if (e.ctrlKey && e.key.toLowerCase() === "s") {
        fs.files[path] = buffer.join("\n");
        if (typeof saveFS1 === "function") await saveFS1();
        write(`\nSaved "${path}"\n`, "green");
        render();
        return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === "q") {
        await exitNano();
        return;
    }

    if (e.key === "ArrowUp") {
        cursorY = Math.max(0, cursorY - 1);
        cursorX = Math.min(cursorX, buffer[cursorY].length);
        render();
        return;
    }
    if (e.key === "ArrowDown") {
        cursorY = Math.min(buffer.length - 1, cursorY + 1);
        cursorX = Math.min(cursorX, buffer[cursorY].length);
        render();
        return;
    }
    if (e.key === "ArrowLeft") {
        if (cursorX > 0) cursorX--;
        else if (cursorY > 0) {
            cursorY--;
            cursorX = buffer[cursorY].length;
        }
        render();
        return;
    }
    if (e.key === "ArrowRight") {
        if (cursorX < buffer[cursorY].length) cursorX++;
        else if (cursorY < buffer.length - 1) {
            cursorY++;
            cursorX = 0;
        }
        render();
        return;
    }

    if (e.key === "Enter") {
        const line = buffer[cursorY];
        buffer[cursorY] = line.slice(0, cursorX);
        buffer.splice(cursorY + 1, 0, line.slice(cursorX));
        cursorY++;
        cursorX = 0;
        render();
        return;
    }

    if (e.key === "Backspace") {
        const line = buffer[cursorY];
        if (cursorX > 0) {
            buffer[cursorY] = line.slice(0, cursorX - 1) + line.slice(cursorX);
            cursorX--;
        } else if (cursorY > 0) {
            cursorX = buffer[cursorY - 1].length;
            buffer[cursorY - 1] += buffer[cursorY];
            buffer.splice(cursorY, 1);
            cursorY--;
        }
        render();
        return;
    }

    if (e.key.length === 1) {
        const line = buffer[cursorY];
        buffer[cursorY] = line.slice(0, cursorX) + e.key + line.slice(cursorX);
        cursorX++;
        render();
    }
}

document.addEventListener("keydown", nanoKeyHandler);
render();