if (!shell.args || shell.args.length === 0) {
    write("js: missing operand\n");
    return;
}
if (shell.userPermission < 4) {
    write("ls: insufficient permissions");
    return;
}
const target = shell.args[0];
let path;
if (target.startsWith("/")) {
    path = target.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target;
    path = path.replace(/\/+/g, "/");
}
runFile(path);