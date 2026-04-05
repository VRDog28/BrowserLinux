if (!shell.args || shell.args.length === 0) {
    write("stat: missing operand\n");
    return 1;
}
const target = shell.args[0];
let path;
if (target.startsWith("/")) {
    path = target.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target;
    path = path.replace(/\/+/g, "/");
}
if (!fs.meta.hasOwnProperty(path)) {
    write(`stat: cannot statx '${path}'\n`);
    return 1;
} else {
    const meta = fs.meta[path];
    for (const key in meta) {
        if (key.startsWith(".") && shell.userPermission < 4) continue;
        write(key + ": " + meta[key] + "\n");
    }
}