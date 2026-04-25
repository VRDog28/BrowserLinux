let options = [];
let values = {};

function detectargs() {
    let newArgs = [];

    for (let i = 0; i < shell.args.length; i++) {
        let item = shell.args[i];

        if (item.startsWith("-") && item.length > 1) {
            let key = item.slice(1);
            let next = shell.args[i + 1];

            if (next && !next.startsWith("-")) {
                values[key] = next;
                newArgs.push(next);

                i++;
            } else {
                values[key] = true;
            }
            options.push(...key.split(""));
        } else {
            newArgs.push(item);
        }
    }
    shell.args = newArgs;
}
detectargs();

let target = shell.args[0] || ".";
let listPath;

let base = target.startsWith("/") ? target : (shell.cwd === "/" ? "" : shell.cwd) + "/" + target;
listPath = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");

if (listPath !== "/" && !fs.folders.includes(listPath)) {
    write(`ls: cannot access '${target}': No such file or directory\n`);
    return 1;
}

function getEffectiveReadPermission(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "/";
    let perm = 0;

    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath] && fs.meta[currentPath].readpermission !== undefined) {
            perm = parseInt(fs.meta[currentPath].readpermission);
        }
    }

    return perm;
}

if (!(shell.userPermission >= getEffectiveReadPermission(listPath) || shell.userPermission === 4)) {
    write(`ls: cannot open directory '${target}': Permission denied\n`);
    return 1;
}

const listed = [];
const prefix = listPath === "/" ? "/" : listPath + "/";
const showHidden = options.includes("a");

for (const folder of fs.folders) {
    if (folder.startsWith(prefix)) {
        const relative = folder.slice(prefix.length);
        if (relative && !relative.includes("/") && (showHidden || !relative.startsWith("."))) {
            listed.push({
                name: relative,
                type: "folder"
            });
        }
    }
}

for (const filePath in fs.files) {
    if (filePath.startsWith(prefix)) {
        const relative = filePath.slice(prefix.length);
        if (relative && !relative.includes("/") && (showHidden || !relative.startsWith("."))) {
            listed.push({
                name: relative,
                type: "file"
            });
        }
    }
}

for (const item of listed) {
    if (item.type === "folder") write(item.name + " ", "cyan");
}
for (const item of listed) {
    if (item.type === "file") write(item.name + " ", "white");
}
newline();