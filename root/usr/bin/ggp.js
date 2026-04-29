if (shell.userPermission != 4) {
    write("ggp: no root detected\n");
    return;
}
const pkgname = shell.args[0];
const mode = shell.args[1] || "none";
if (!pkgname) {
    write("ggp: invalid package name\n");
    return;
}
let data = ""
if (mode != "local") {
    const url = `https://raw.githubusercontent.com/VRDog28/BrowserLinux/main/packages/${pkgname}`;
    write("Fetching package from github...\n");
    try {
        const res = await fetch(url);
        if (res.ok) {
            data = await res.text();
        } else {
            write(`ggp: package "${pkgname}" not found\n`);
        }
    } catch (err) {
        write("ggp: network error\n");
    }

    if (!data) {
        return;
    }
} else {
    let base = pkgname.startsWith("/") ? pkgname : (shell.cwd === "/" ? "" : shell.cwd) + "/" + pkgname;
    let path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");
    if (!window.fs.files[path]) {
        write("ggp: local package not found\n");
        return;
    }
    data = window.fs.files[path];
}
write("Parsing package...\n");
const parsedpkg = parseFS1(data);
if (!parsedpkg || typeof parsedpkg !== "object") {
    write("ggp: invalid package format\n");
    return;
}

if (parsedpkg.folders && parsedpkg.folders.length > 0) {
    for (const folder of parsedpkg.folders) {
        if (fs.folders.includes(folder)) continue;
        fs.folders.push(folder);
    }
}
if (parsedpkg.files && typeof parsedpkg.files === "object") {
    for (const file in parsedpkg.files) {
        fs.files[file] = parsedpkg.files[file];
    }
}
if (parsedpkg.meta && typeof parsedpkg.meta === "object") {
    for (const meta in parsedpkg.meta) {
        fs.meta[meta] = parsedpkg.meta[meta];
    }
}
if (window.fs.files["/etc/.packages"]) {
    window.fs.files["/etc/.packages"] = (Number(window.fs.files["/etc/.packages"]) || 0) + 1;
}

await saveFS1();
