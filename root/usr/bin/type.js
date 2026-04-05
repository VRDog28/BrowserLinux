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
if (filename.startsWith("/")) {
    path = filename.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + filename;
    path = path.replace(/\/+/g, "/");
}

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