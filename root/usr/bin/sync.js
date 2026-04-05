if (!fs1FileHandle) return;

try {
    const file = await fs1FileHandle.getFile();
    const fs1Content = await file.text();
    const newFS = parseFS1(fs1Content);

    fs.folders.length = 0;
    fs.folders.push(...newFS.folders);

    for (const key in fs.files) delete fs.files[key];
    for (const key in newFS.files) fs.files[key] = newFS.files[key];

    for (const key in fs.meta) delete fs.meta[key];
    for (const key in newFS.meta) fs.meta[key] = newFS.meta[key];
} catch (e) {
    log("kernel", "FS1 SYNC FAILED", true);
    write("[FS1 sync failed: " + e.message + "]\n");
}