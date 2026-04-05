const filename = shell.args[0];

if (!filename) {
    write("Interactive mode is not available\n");
    return 1;
}

let path;
if (filename.startsWith("/")) {
    path = filename.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + filename;
    path = path.replace(/\/+/g, "/");
}

function getParentFolder(path) {
    const parts = path.split("/");
    parts.pop(); 

    return parts.join("/") || "/";
}

const parentFolder = getParentFolder(path);
if (!fs.folders.includes(parentFolder) && parentFolder != "/") {
    write(`cat: ${filename}: No such file or directory\n`);
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
    write(`cat: ${filename}: Permission denied\n`);
    return 1;
}

if (fs.files.hasOwnProperty(path)) {
    if (path == "/dev/sda" && window.sda && shell.userPermission > 3) {
        write(window.sda + "\n");
        return;
    } else if (shell.userPermission < 4 && path == "/dev/sda") {
        write(`cat: ${filename}: Permission denied\n`);
        return 1;
    }
    write(fs.files[path] + "\n", "white");
} else {
    write(`cat: ${filename}: No such file or directory\n`);
    return 1
}