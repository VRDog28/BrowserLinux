if (shell.userPermission < 4) {
    write("fsck must be run as root\n");
    return 1;
}
log("FSCK", "Attempting to start a full disk scan");

function normalizePath(p) {
    return p.replace(/\/+/g, "/").replace(/\/+/g, "/");
}

for (const filePath of Object.keys(fs.files)) {
    const parts = filePath.split("/").slice(0, -1);
    const parent = parts.length === 0 ? "/" : parts.join("/");
    if (!fs.folders.includes(parent) && parent !== "/") {
        log("FSCK", "Ghost file detected");
        write(`fsck: removed ghost file: ${filePath}\n`);
        delete fs.files[filePath];
        if (fs.meta[filePath]) delete fs.meta[filePath];
    }
}

for (const folder of [...fs.folders]) {

    if (folder === "/") continue;

    const rootLevel = folder.split("/").filter(Boolean).length === 1;
    if (rootLevel) continue;

    const parts = folder.split("/").filter(Boolean);
    const parent = "/" + parts.slice(0, -1).join("/");

    if (!fs.folders.includes(parent)) {
        log("FSCK", "Ghost folder detected");
        write(`fsck: removed ghost folder: ${folder}\n`);
        fs.folders = fs.folders.filter(f => f !== folder);
        if (fs.meta[folder]) delete fs.meta[folder];
    }
}

for (const folder of [...fs.folders]) {
    if (!folder.startsWith("/")) {
        log("FSCK", "Removed invalid folder");
        write(`fsck: removed invalid folder path: ${folder}\n`);
        fs.folders = fs.folders.filter(f => f !== folder);
        if (fs.meta[folder]) delete fs.meta[folder];
    }
}

for (const path in fs.meta) {
    if (!path.startsWith("/") || (!fs.folders.includes(path) && !fs.files[path])) {
        log("FSCK", "Removed invalid meta");
        write(`fsck: removed invalid meta for: ${path}\n`);
        delete fs.meta[path];
    }
}
log("FSCK", "Finished", true);
write("fsck: finished\n");

if (typeof saveFS1 === "function") await saveFS1();