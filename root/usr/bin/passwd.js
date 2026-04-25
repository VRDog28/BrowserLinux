if (window.shell.userPermission != 4) {
    write("Insufficient permissions\n");
    return;
}
async function readInput(promptText = "") {
    return new Promise(resolve => {
        let inputBuffer = "";

        function render() {
            let text = "";
            for (char of inputBuffer) text += "*";
            
            currentLine.textContent = promptText + text;
            currentLine.style.color = window.shell.theme?.[0] || "white";
            currentLine.style.backgroundColor = window.shell.theme?.[1] || "black";
            currentLine.style.fontSize = window.shell.theme?.[3] || "14px";
            currentLine.style.fontFamily = getComputedStyle(document.body).fontFamily;
        }

        function onKey(e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.key === "Enter") {
                window.removeEventListener("keydown", onKey);
                resolve(inputBuffer);
                return;
            }

            if (e.key === "Backspace") {
                inputBuffer = inputBuffer.slice(0, -1);
                render();
                return;
            }

            if (e.key.length === 1) {
                inputBuffer += e.key;
                render();
            }
        }

        let currentLine = document.createElement("div");
        screen.appendChild(currentLine);

        render();

        setTimeout(() => {
            window.addEventListener("keydown", onKey);
        }, 0);
    });
}
let newpass = "";
async function request() {
    const pass = await readInput("New password: ");
    const pass2 = await readInput("Confirm password: ");
    newpass = pass
    return pass == pass2
}
window.shell.inputMode = "passwd";
while (true) {
    let condition = await request();
    if (condition && newpass != "") break;
    write("Passwords do not match or is invalid\n");
}
window.shell.inputMode = "command";
window.fs.meta["/etc"][".superuser"] = newpass;
saveFS1();