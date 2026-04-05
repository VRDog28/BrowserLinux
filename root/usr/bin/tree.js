function getEffectiveReadPermission(path) {
    const parts = path.split("/").filter(Boolean);
    let currentPath = "/";
    let permission = 0; 

    for (const part of parts) {
        currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
        if (fs.meta[currentPath] && fs.meta[currentPath].readpermission !== undefined) {
            permission = parseInt(fs.meta[currentPath].readpermission);
        }
    }
    return permission;
}

for (const folder of fs.folders) {
    const folderReadPerm = getEffectiveReadPermission(folder);
    if (shell.userPermission >= folderReadPerm || shell.userPermission === 4) {
        write(folder + "\n");
    }
}

for (const filePath in fs.files) {
    const fileReadPerm = getEffectiveReadPermission(filePath);
    if (shell.userPermission >= fileReadPerm || shell.userPermission === 4) {
        write(filePath + "\n");
    }
}