if (!shell.args || shell.args.length < 2) {
    write("cp: missing file operand\n");
    return 1;
}

const source = shell.args[0];
const dest = shell.args[1];

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

function canRead(path) {
    return shell.userPermission >= getEffectiveReadPermission(path) || shell.userPermission === 4;
}

function canWrite(path) {
    return shell.userPermission >= getEffectiveWritePermission(path) || shell.userPermission === 4;
}

function normalizePath(p) {
    if (p.startsWith("/")) return p.replace(/\/+/g, "/");
    let result = (shell.cwd === "/" ? "/" : shell.cwd + "/") + p;
    return result.replace(/\/+/g, "/");
}

const path = normalizePath(source);
const path2 = normalizePath(dest);

if (!fs.files.hasOwnProperty(path) && !fs.folders.includes(path)) {
    write("cp: cannot stat '" + source + "': No such file or directory\n");
    return 1;
}

if (!fs.folders.includes(path2) && path2 !== "/") {
    write("cp: cannot stat '" + dest + "': No such directory\n");
    return 1;
}

if (!canRead(path) || !canWrite(path)) {
    write("cp: permission denied\n");
    return 1;
}

if (!canWrite(path2)) {
    write("cp: permission denied\n");
    return 1;
}

function getUniquePath(basePath, name) {
    let newPath = basePath === "/" ? "/" + name : basePath + "/" + name;
    let counter = 1;

    while (fs.files[newPath] || fs.folders.includes(newPath)) {
        newPath = basePath === "/" ? "/" + name + "_" + counter : basePath + "/" + name + "_" + counter;
        counter++;
    }

    return newPath;
}

if (fs.files.hasOwnProperty(path)) {
    const fileName = path.split("/").pop();
    const newPath = getUniquePath(path2, fileName);

    fs.files[newPath] = fs.files[path];

    if (fs.meta[path]) {
        fs.meta[newPath] = {
            ...fs.meta[path]
        };
    }

    saveFS1();
}

else if (fs.folders.includes(path)) {
    if (path2 === path || path2.startsWith(path + "/")) {
        write("cp: omitting directory '" + path + "'\n");
        return 1;
    }

    const folderName = path.split("/").pop();
    const newBase = getUniquePath(path2, folderName);

    fs.folders.push(newBase);

    if (fs.meta[path]) {
        fs.meta[newBase] = {
            ...fs.meta[path]
        };
    }

    for (const filePath of Object.keys(fs.files)) {
        if (filePath === path || filePath.startsWith(path + "/")) {
            const relative = filePath.slice(path.length);
            const newPath = newBase + relative;

            fs.files[newPath] = fs.files[filePath];

            if (fs.meta[filePath]) {
                fs.meta[newPath] = {
                    ...fs.meta[filePath]
                };
            }
        }
    }

    for (const folderPath of fs.folders) {
        if (folderPath === path) continue;

        if (folderPath.startsWith(path + "/")) {
            const relative = folderPath.slice(path.length);
            const newFolderPath = newBase + relative;

            fs.folders.push(newFolderPath);

            if (fs.meta[folderPath]) {
                fs.meta[newFolderPath] = {
                    ...fs.meta[folderPath]
                };
            }
        }
    }

    saveFS1();
}