if (shell.userPermission != 4) {
    write("flash: No superuser detected\n");
    return;
}

async function unlock() {
    if (fs.files["/etc/.write-protect"]) {
        write("flash: wp is enabled\n");
        return 1;
    }
    if (!fs.folders.includes("/firm")) {
        fs.folders.push("/firm");
    }

    if (!fs.meta["/firm"]) {
        fs.meta["/firm"] = {};
    }

    if (!fs.meta["/firm"].hasOwnProperty(".firmware-unlock")) {
        fs.meta["/firm"][".firmware-unlock"] = "*";
    }
    fs.meta["/firm"]["writepermission"] = 4;
    fs.meta["/firm"]["readpermission"] = 4;

    write("flash: firmware unlocked\n");
}
await unlock();
saveFS1();