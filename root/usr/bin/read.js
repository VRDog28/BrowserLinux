let promptText = "";
let varName = null;

for (let i = 0; i < shell.args.length; i++) {
    if (shell.args[i] === "-p") {
        let parts = [];
        i++;

        while (i < shell.args.length) {
            parts.push(shell.args[i]);

            if (shell.args[i].endsWith('"')) break;
            i++;
        }

        promptText = parts.join(" ").replace(/^"|"$/g, "");
    } else {
        varName = shell.args[i];
    }
}

async function readInput(promptText = "") {
    return new Promise(resolve => {
        let inputBuffer = "";

        function render() {
            currentLine.textContent = promptText + inputBuffer;
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

shell.inputMode = "read";
let value = await readInput(promptText);
shell.inputMode = "command";

if (varName) {
    setVar(varName, value);
} else {
    setVar("REPLY", value);
}