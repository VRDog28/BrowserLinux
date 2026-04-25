if (!shell.args || shell.args.length === 0) {
    write("js: missing operand\n");
    return;
}
if (shell.userPermission < 4) {
    write("js: insufficient permissions");
    return;
}
const target = shell.args[0];
let path;
let base = target.startsWith("/") ? target : (shell.cwd === "/" ? "" : shell.cwd) + "/" + target;
path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");
runFile(path);