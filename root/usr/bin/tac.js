const filename = shell.args[0];

if (!filename) {
    write("Interactive mode is not available\n");
    return 1;
}

let path;
let base = filename.startsWith("/") ? filename : (shell.cwd === "/" ? "" : shell.cwd) + "/" + filename;
path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");

function getParentFolder(path) {
    const parts = path.split("/");
    parts.pop(); 

    return parts.join("/") || "/";
}

const parentFolder = getParentFolder(path);
if (!fs.folders.includes(parentFolder) && parentFolder != "/") {
    write(`tac: ${filename}: No such file or directory\n`);
    return 1;
}

function hasReadPermission(path) {
    if (shell.userPermission === 4) return true; 

    const parts = path.split("/").filter(Boolean);
    let currentPath = "/";
    let readPerm = 0;

    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        const meta = fs.meta[currentPath];
        if (!meta) continue;

        if (meta.readpermission !== undefined) readPerm = parseInt(meta.readpermission);
    }

    return shell.userPermission >= readPerm;
}

if (!hasReadPermission(path)) {
    write(`tac: ${filename}: Permission denied\n`);
    return 1;
}

if (fs.files.hasOwnProperty(path)) {
    const content = fs.files[path];

    const lines = content.split("\n");
    const reversed = lines.reverse().join("\n");

    write(reversed + "\n", "white");
} else {
    write(`tac: ${filename}: No such file or directory\n`);
    return 1;
}