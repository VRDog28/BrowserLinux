let options = [];
let values = {};
let argsclean = [];
let origargs = shell.args;

function detectargs() {
    let newArgs = [];

    for (let i = 0; i < shell.args.length; i++) {
        let item = shell.args[i];

        if (item.startsWith("-") && item.length > 1) {
            let key = item.slice(1);
            let next = shell.args[i + 1];

            options.push(...key.split(""));

            if (next && !next.startsWith("-")) {
                values[key] = next;
                newArgs.push(next);

                i++;
            } else {
                values[key] = true;
            }
        } else {
            newArgs.push(item);
        }
    }
    argsclean = newArgs.filter(item => {
        return !Object.values(values).includes(item);
    });

    shell.args = newArgs;
}
detectargs();

const filename = argsclean[0];
let mode = "lines";
let count = 10;

if (!filename || argsclean.length < 1) {
    write("Interactive mode is not available\n");
    return 1;
}

if ("n" in values) {
    mode = "lines";
    count = parseInt(values.n);
} else if ("c" in values) {
    mode = "chars";
    count = parseInt(values.c);
}

if (isNaN(count)) count = 10;

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
    write(`head: cannot open '${filename}' for reading: No such file or directory\n`);
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
    write(`head: cannot open '${filename}' for reading: Permission denied\n`);
    return 1;
}

if (fs.files.hasOwnProperty(path)) {
    const content = fs.files[path];

    if (mode === "chars") {
        write(content.slice(0, count), "white");
    } else {
        const lines = content.split("\n");
        const selected = lines.slice(0, count);
        write(selected.join("\n") + "\n", "white");
    }
} else {
    write(`head: cannot open '${filename}' for reading: No such file or directory\n`);
    return 1;
}