const disablesudo = shell.dump.includes("disablesudo");
const bypasspowerwash = shell.dump.includes("bypasspowerwash");
const enterprise = !shell.dump.includes("enterprise");
let bypass = false
if (disablesudo && bypasspowerwash && enterprise) bypass = true;
if (shell.userPermission < 4 && !bypass) {
    write("powerwash: Powerwash requires root\n");
    return;
}
write("Are you sure you want to powerwash this device?\n");
sap.play("C4")
await executeCommand('read -p "(y/n): " REPLY');
if (window.shell.REPLY && window.fs.files["/dev/sda"]) {
    if (window.shell.REPLY == "y") await powerwash();
}
async function powerwash() {
    inputMode = "None";
    write("powerwash: powerwashing device...\n");

    const raw = window.fs.files["/dev/sda"];

    if (!raw || raw === "*") {
        write("powerwash: no valid system image in /dev/sda\n");
        sap.play("B3")
        return;
    }

    const fsObj = window.fs;

    const totalFolders = fsObj.folders.length;
    const totalFiles = Object.keys(fsObj.files).length;
    const totalMeta = Object.keys(fsObj.meta).length;

    const totalSteps = totalFolders + totalFiles + totalMeta;

    let done = 0;

    function renderProgress() {
        const percent = Math.floor((done / totalSteps) * 100) || 0;
        const barLength = 30;
        const filled = Math.floor((percent / 100) * barLength);
        const bar = "[" + "#".repeat(filled) + "-".repeat(barLength - filled) + "]";

        write(`\r ${bar} ${percent}%`);
    }

    for (const folder of [...fsObj.folders]) {
        fsObj.folders = fsObj.folders.filter(f => f !== folder);
        write(`\n${folder} removed`);
        done++;
        renderProgress();
        await wait(100);
    }

    for (const path of Object.keys(fsObj.files)) {
        delete fsObj.files[path];
        write(`\n${path} removed`);
        done++;
        renderProgress();
        await wait(100);
    }

    for (const path of Object.keys(fsObj.meta)) {
        delete fsObj.meta[path];
        write(`\nmeta ${path} removed`);
        done++;
        renderProgress();
        await wait(100);
    }

    done = totalSteps;

    write("\n\npowerwash: restoring system...\n");

    await wait(500);

    const newFS = parseFS1(raw);

    window.fs.folders.length = 0;
    window.fs.folders.push(...newFS.folders);

    for (const k in window.fs.files) delete window.fs.files[k];
    for (const k in newFS.files) window.fs.files[k] = newFS.files[k];

    for (const k in window.fs.meta) delete window.fs.meta[k];
    for (const k in newFS.meta) window.fs.meta[k] = newFS.meta[k];
    sap.play("E5")
    await saveFS1();

    write("\n\npowerwash: complete.\n");
    await wait(500);

    location.reload();
}
return;