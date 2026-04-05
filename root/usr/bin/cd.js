if (shell.args.length === 0 || shell.args[0] == "~") {
    shell.cwd = "/home";
    return;
}

let target = shell.args[0];
let newPath;

if (target === "..") {
    if (shell.cwd === "/") {
        return;
    }
    const parts = shell.cwd.split("/");
    parts.pop(); 

    newPath = parts.length === 1 ? "/" : parts.join("/");
} else if (target === "/") {
    newPath = "/";
} else if (target.startsWith("/")) {
    newPath = target.replace(/\/+/g, "/"); 

} else {
    newPath = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target; 

    newPath = newPath.replace(/\/+/g, "/");
}

function folderExists(path) {
    return path === "/" || fs.folders.includes(path);
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

if (folderExists(newPath)) {
    if (!hasReadPermission(newPath)) {
        write(`bash: cd: ${target}: Permission denied\n`);
        return 1;
    } else {
        shell.cwd = newPath;
    }
} else {
    write(`bash: cd: ${target}: No such file or directory\n`);
    return 1;
}