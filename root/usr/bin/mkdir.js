if (!shell.args || shell.args.length === 0) {
    write("mkdir: missing operand\n");
    return 1;
} else {
    const foldername = shell.args[0];

    let path;
    if (foldername.startsWith("/")) {
        path = foldername.replace(/\/+/g, "/");
    } else {
        path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + foldername;
        path = path.replace(/\/+/g, "/");
    }

    function getEffectivePermissions(folderPath) {
        const parts = folderPath.split("/").filter(Boolean);
        let currentPath = "/";
        let perms = {
            read: 0,
            write: 0,
            execute: 0
        }; 

        for (const part of parts) {
            currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
            if (fs.meta[currentPath]) {
                if (fs.meta[currentPath].readpermission !== undefined) perms.read = parseInt(fs.meta[currentPath].readpermission);
                if (fs.meta[currentPath].writepermission !== undefined) perms.write = parseInt(fs.meta[currentPath].writepermission);
                if (fs.meta[currentPath].executepermission !== undefined) perms.execute = parseInt(fs.meta[currentPath].executepermission);
            }
        }

        return perms;
    }

    const parts = path.split("/");
    parts.pop(); 

    const parentFolder = parts.join("/") || "/"; 

    if (parentFolder !== "/" && !fs.folders.includes(parentFolder)) {
        write(`mkdir: cannot create directory '${parentFolder}': No such file or directory\n`);
        return 1;
    }

    const parentPerms = getEffectivePermissions(parentFolder);
    if (!(shell.userPermission >= parentPerms.write || shell.userPermission === 4)) {
        write(`mkdir: cannot create directory '${parentFolder}': Permission denied\n`);
        return 1;
    }

    if (fs.folders.includes(path) || fs.files.hasOwnProperty(path)) {
        write(`mkdir: cannot create directory '${foldername}': File exists\n`);
        return 1;
    } else {
        fs.folders.push(path);

        if (typeof saveFS1 === "function") await saveFS1();
    }
}