if (!shell.args || shell.args.length === 0) {
    write("type: missing operand\n");
    return 1;
}

function getEffectiveWritePermission(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "/";
    let writePerm = 0;
    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath]?.writepermission !== undefined) {
            writePerm = parseInt(fs.meta[currentPath].writepermission);
        }
    }
    return writePerm;
}

const filename = shell.args[0];

let path;
let base = filename.startsWith("/") ? filename : (shell.cwd === "/" ? "" : shell.cwd) + "/" + filename;
path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");

const parts = path.split("/");
parts.pop(); 

const parentFolder = parts.join("/") || "/";

if (!fs.files.hasOwnProperty(path)) {
    write("type: cannot write to '" + filename + "': No such file");
    return 1;
}
const parentWritePerm = getEffectiveWritePermission(parentFolder);
if (parentWritePerm > shell.userPermission && shell.userPermission !== 4) {
    write(`type: cannot open '${filename}': Permission denied\n`);
    return 1;
}

window.typemode = true;
window.typefile = path;
window.fs.files[path] = "";