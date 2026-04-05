if (!shell.args || shell.args.length < 3) {
    write("chmod: missing operand\n");
    return 1;
}

const readPerm = parseInt(shell.args[0]);
const writePerm = parseInt(shell.args[1]);
const target = shell.args[2];

if (
    isNaN(readPerm) || readPerm < 0 || readPerm > 4 ||
    isNaN(writePerm) || writePerm < 0 || writePerm > 4
) {
    write("chmod: invalid mode\n");
    return 1;
}

let path;
if (target.startsWith("/")) {
    path = target.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target;
    path = path.replace(/\/+/g, "/");
}

const exists = fs.folders.includes(path) || fs.files.hasOwnProperty(path);
if (!exists) {
    write(`chmod: cannot access '${target}': No such file or directory\n`);
    return 1;
}

function getEffectivePermission(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "/";
    let perm = 0;

    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath]) {
            const meta = fs.meta[currentPath];
            if (meta.readpermission !== undefined) perm = Math.max(perm, parseInt(meta.readpermission));
            if (meta.writepermission !== undefined) perm = Math.max(perm, parseInt(meta.writepermission));
        }
    }

    return perm;
}

const currentPerm = getEffectivePermission(path);
if (shell.userPermission < currentPerm && shell.userPermission !== 4) {
    write(`chmod: changing permissions of '${path}': Operation not permitted\n`);
    return 1;
}

if (!fs.meta[path]) fs.meta[path] = {};
fs.meta[path].readpermission = readPerm.toString();
fs.meta[path].writepermission = writePerm.toString();

fs.meta[path].permission = Math.max(readPerm, writePerm).toString();

if (typeof saveFS1 === "function") {
    await saveFS1();
}