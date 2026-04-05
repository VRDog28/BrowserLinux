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

let path;
if (target.startsWith("/")) {
    path = target.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target;
    path = path.replace(/\/+/g, "/");
}
let path2;
if (folder.startsWith("/")) {
    path2 = folder.replace(/\/+/g, "/");
} else {
    path2 = (shell.cwd === "/" ? "/" : shell.cwd + "/") + folder;
    path2 = path2.replace(/\/+/g, "/");
}

if (fs.folders.includes(path)) {
    if (containsProtectedItems(path)) {
        write(`mv: cannot move '${path}' to '${path2}': Permission denied\n`);
        return 1;
    }
} else if (!fs.files.hasOwnProperty(path)) {
    write(`mv: cannot stat '${path}': No such file or directory\n`);
    return 1;
}

if (!canWrite(path) || !canRead(path)) {
    write(`mv: cannot move '${path}' to '${path2}': Permission denied\n`);
    return 1;
}
if (fs.folders.includes(path2)) {
    if (!canWrite(path2)) {
        write(`mv: cannot move '${path}' to '${path2}': Permission denied\n`);
        return 1;
    }
} else if (path2 != "/") {
    write(`mv: cannot stat '${path2}': No such file or directory\n`);
    return 1;
}

if (fs.files.hasOwnProperty(path)) {
    let file = fs.files[path];
    const fileName = path.split("/").pop();
    delete fs.files[path];
    if (path2 == "/") {
        let newfile = "/" + fileName;
        fs.files[newfile] = file;
        saveFS1();
    } else {
        let newfile = path2 + "/" + fileName;
        fs.files[newfile] = file;
        saveFS1();
    }
} else if (fs.folders.includes(path)) {
    const folderName = path.split("/").pop();
    const newBase = path2 === "/" ? "/" + folderName : path2 + "/" + folderName;
    if (newBase.startsWith(path + "/")) {
        return 1;
    }
    for (const filePath of Object.keys(fs.files)) {
        if (filePath.startsWith(path + "/")) {
            const relative = filePath.slice(path.length);
            const newPath = newBase + relative;

            fs.files[newPath] = fs.files[filePath];
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
            const newPath = newBase + relative;
            newMeta[newPath] = {
                ...fs.meta[metaPath]
            };
        } else {
            newMeta[metaPath] = fs.meta[metaPath];
        }
    }

    fs.meta = newMeta;

    saveFS1();
}