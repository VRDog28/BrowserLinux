if (!shell.args || shell.args.length === 0) {
    write("rm: missing operand\n");
    return 1;
}

let options = [];
let values = {};

function detectargs() {
    let newArgs = [];

    for (let i = 0; i < shell.args.length; i++) {
        let item = shell.args[i];

        if (item.startsWith("-") && item.length > 1) {
            let key = item.slice(1);
            let next = shell.args[i + 1];

            if (next && !next.startsWith("-")) {
                values[key] = next;
                newArgs.push(next);

                i++;
            } else {
                values[key] = true;
            }
            options.push(...key.split(""));
        } else {
            newArgs.push(item);
        }
    }
    shell.args = newArgs;
}
detectargs();
const target = shell.args[0];

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

function canDelete(path) {
    return shell.userPermission >= getEffectiveWritePermission(path) || shell.userPermission === 4;
}

let path;
if (target.startsWith("/")) {
    path = target.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target;
    path = path.replace(/\/+/g, "/");
}

function containsProtectedItems(folderPath) {
    for (const filePath of Object.keys(fs.files)) {
        if (filePath.startsWith(folderPath + "/") && !canDelete(filePath)) {
            return true;
        }
    }
    for (const subFolder of fs.folders) {
        if (subFolder.startsWith(folderPath + "/") && !canDelete(subFolder)) {
            return true;
        }
    }
    return false;
}

function deleteFolderRecursively(folderPath) {
    if (containsProtectedItems(folderPath)) {
        write(`rm: cannot remove '${folderPath}': Permission denied\n`);
    }

    for (const filePath of Object.keys(fs.files)) {
        if (filePath === folderPath || filePath.startsWith(folderPath + "/")) {
            if (canDelete(filePath)) {
                delete fs.files[filePath];
                if (fs.meta[filePath]) delete fs.meta[filePath];
            } else {
                write(`rm: cannot remove '${filePath}': Permission denied\n`);
            }
        }
    }

    for (const subFolder of [...fs.folders]) {
        if (subFolder === folderPath || subFolder.startsWith(folderPath + "/")) {
            if (canDelete(subFolder)) {
                fs.folders = fs.folders.filter(f => f !== subFolder);
                if (fs.meta[subFolder]) delete fs.meta[subFolder];
            } else {
                write(`rm: cannot remove '${subFolder}': Permission denied\n`);
            }
        }
    }

    if (canDelete(folderPath) && fs.meta[folderPath]) {
        delete fs.meta[folderPath];
    }
}

if (path === "/") {
    if (options.includes("r")) {
        if (!options.join("").includes("-no-preserve-root")) { write("rm: it is dangerous to operate recursively on '/'"); return; }
        log("RM", "ATTEMPTING A FULL DISK DELETION", true);

        for (const folder of [...fs.folders]) {
            if (folder !== "/") deleteFolderRecursively(folder);
        }

        for (const filePath of Object.keys(fs.files)) {
            if (canDelete(filePath)) {
                delete fs.files[filePath];
                if (fs.meta[filePath]) delete fs.meta[filePath];
            } else {
                write(`rm: cannot remove '${filePath}': Permission denied\n`);
            }
        }
    } else {
        write(`rm: cannot remove '${target}': Is a directory`);
    }
}

else if (fs.folders.includes(path)) {
    if (options.includes("r")) {
        deleteFolderRecursively(path);
    } else {
        write(`rm: cannot remove '${target}': Is a directory`);
    }
} else if (fs.files.hasOwnProperty(path)) {
    if (!canDelete(path)) {
        write(`rm: cannot remove '${path}': Permission denied\n`);
        return 1;
    } else {
        delete fs.files[path];
        if (fs.meta[path]) delete fs.meta[path];
    }
} else {
    if (!options.includes("f")) write(`rm: cannot remove '${target}': No such file or directory\n`);
    return 1;
}

if (typeof saveFS1 === "function") await saveFS1();