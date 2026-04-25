if (!shell.args || shell.args.length === 0) {
    write("stat: missing operand\n");
    return 1;
}
const target = shell.args[0];
let path;
let base = target.startsWith("/") ? target : (shell.cwd === "/" ? "" : shell.cwd) + "/" + target;
path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");
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