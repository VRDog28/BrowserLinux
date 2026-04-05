if (!shell.args || shell.args.length === 0) {
    write("touch: missing file operand");
    return 1;
} else {
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

    const folderPath = parts.join("/") || "/"; 

    function getEffectiveWritePermission(folderPath) {
        const parts = folderPath.split("/").filter(Boolean);
        let currentPath = "/";
        let permission = 0; 

        for (const part of parts) {
            currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
            if (fs.meta[currentPath] && fs.meta[currentPath].writepermission !== undefined) {
                permission = parseInt(fs.meta[currentPath].writepermission);
            }
        }
        return permission;
    }

    if (folderPath !== "/" && !fs.folders.includes(folderPath)) {
        write(`touch: cannot touch '${path}': No such file or directory\n`);
        return 1;
    }

    const folderWritePerm = getEffectiveWritePermission(folderPath);
    if (shell.userPermission < folderWritePerm && shell.userPermission !== 4) {
        write(`touch: caanot touch '${path}': Permission denied\n`);
        return 1;
    }

    if (!fs.files.hasOwnProperty(path)) {
        fs.files[path] = "";
        if (typeof saveFS1 === "function") await saveFS1();
    }
}