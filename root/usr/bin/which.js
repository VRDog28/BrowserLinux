const cmdInput = shell.args[0];

if (!cmdInput) {
    return;
}

let pathArray = window.shell.path || ["/bin", "/usr/bin"];

const candidates = [];

if (cmdInput.includes(".")) {

    candidates.push(cmdInput);
} else {

    candidates.push(cmdInput);
    candidates.push(cmdInput + ".js");
}

function exists(basePath, cmd) {
    const filePath = basePath === "/" ? "/" + cmd : basePath + "/" + cmd;

    if (fs.files.hasOwnProperty(filePath)) return filePath;

    return null;
}

let found = null;

for (let p of pathArray) {
    let normalized = p.replace(/\/+/g, "/");

    if (normalized !== "/" && normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
    }

    for (const cmd of candidates) {
        const result = exists(normalized, cmd);
        if (result) {
            found = result;
            break;
        }
    }

    if (found) break;
}

if (found) {
    write(found + "\n", "white");
}