if (shell.userPermission != 4) {
    write("flash: No superuser detected\n");
    return;
}

async function unlock() {

    if (!fs.folders.includes("/firm")) {
        fs.folders.push("/firm");
    }

    if (!fs.meta["/firm"]) {
        fs.meta["/firm"] = {};
    }

    if (!fs.meta["/firm"].hasOwnProperty(".firmware-unlock")) {
        fs.meta["/firm"][".firmware-unlock"] = "*";
    }

    write("flash: firmware unlocked\n");
}

await unlock();
saveFS1();