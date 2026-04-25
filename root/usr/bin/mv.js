if (!shell.args || shell.args.length < 2) {
    write("mv: missing file operand\n");
    return 1;
}

const target = shell.args[0];
const folder = shell.args[1];

function getEffectiveWritePermission(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "/";
    let writePerm = 0;

    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath] && fs.meta[currentPath].writepermission !== undefined) {
            writePerm = parseInt(fs.meta[currentPath].writepermission);
        }
    }
    return writePerm;
}

function getEffectiveReadPermission(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "/";
    let readPerm = 0;

    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath] && fs.meta[currentPath].readpermission !== undefined) {
            readPerm = parseInt(fs.meta[currentPath].readpermission);
        }
    }
    return readPerm;
}

function containsProtectedItems(folderPath) {
    for (const filePath of Object.keys(fs.files)) {
        if (filePath.startsWith(folderPath + "/") && !canWrite(filePath)) {
            return true;
        }
    }
    for (const subFolder of fs.folders) {
        if (subFolder.startsWith(folderPath + "/") && !canWrite(subFolder)) {
            return true;
        }
    }
    return false;
}

function canRead(path) {
    return shell.userPermission >= getEffectiveReadPermission(path) || shell.userPermission === 4;
}

function canWrite(path) {
    return shell.userPermission >= getEffectiveWritePermission(path) || shell.userPermission === 4;
}

function resolvePath(p) {
    let base = p.startsWith("/") ? p : (shell.cwd === "/" ? "" : shell.cwd) + "/" + p;
    return "/" + base.split("/").filter(Boolean).reduce((a, part) => {
        if (part === "..") a.pop();
        else if (part !== ".") a.push(part);
        return a;
    }, []).join("/");
}

let path = resolvePath(target);
let path2 = resolvePath(folder);

let isFile = fs.files.hasOwnProperty(path);
let isFolder = fs.folders.includes(path);

if (!isFile && !isFolder) {
    write(`mv: cannot stat '${path}': No such file or directory\n`);
    return 1;
}

let finalDest = path2;

if (fs.folders.includes(path2)) {
    const name = path.split("/").pop();
    finalDest = path2 === "/" ? "/" + name : path2 + "/" + name;
}

if (!canWrite(path) || !canRead(path)) {
    write(`mv: cannot move '${path}' to '${path2}': Permission denied\n`);
    return 1;
}

if (containsProtectedItems(path)) {
    write(`mv: cannot move '${path}' to '${path2}': Permission denied\n`);
    return 1;
}

if (isFile) {
    const file = fs.files[path];
    delete fs.files[path];
    fs.files[finalDest] = file;
    saveFS1();
} else if (isFolder) {
    if (finalDest.startsWith(path + "/")) return 1;

    const newBase = finalDest;

    for (const filePath of Object.keys(fs.files)) {
        if (filePath.startsWith(path + "/")) {
            const relative = filePath.slice(path.length);
            fs.files[newBase + relative] = fs.files[filePath];
            delete fs.files[filePath];
        }
    }

    let updatedFolders = [];

    for (const folderPath of fs.folders) {
        if (folderPath === path) continue;

        if (folderPath.startsWith(path + "/")) {
            const relative = folderPath.slice(path.length);
            updatedFolders.push(newBase + relative);
        } else {
            updatedFolders.push(folderPath);
        }
    }

    updatedFolders.push(newBase);
    fs.folders = updatedFolders;

    const newMeta = {};

    for (const metaPath of Object.keys(fs.meta)) {
        if (metaPath === path || metaPath.startsWith(path + "/")) {
            const relative = metaPath.slice(path.length);
            newMeta[newBase + relative] = {
                ...fs.meta[metaPath]
            };
        } else {
            newMeta[metaPath] = fs.meta[metaPath];
        }
    }

    fs.meta = newMeta;

    saveFS1();
}