let input = "";
let cursorPos = 0;
let inputLineEl = null;
let terminaluser = window.shell.userName || "Undefined";
let terminalhost = window.shell.hostName || "Undefined";
let usercwd = ""
function prompt() {
    input = "";
    cursorPos = 0;

    const line = document.createElement("div");
    screen.appendChild(line);
    inputLineEl = line;

    renderInputLine();
}

function renderInputLine() {
    if (!inputLineEl) {
        inputLineEl = document.createElement("div");
        screen.appendChild(inputLineEl);
    }

    inputLineEl.innerHTML = "";
    if (window.shell.cwd == window.shell.home) {
        usercwd = "~";
    } else {
        usercwd = window.shell.cwd;
    }
    const promptSpan = document.createElement("span");
    promptSpan.textContent = `${terminaluser}@${terminalhost}:${usercwd}$ `;
    if (shell.userPermission > 3) promptSpan.style.color = "red";
    if (shell.userPermission < 4) promptSpan.style.color = "lime";
    promptSpan.style.backgroundColor = window.shell.theme?.[1] || "black"; 

    promptSpan.style.fontSize = window.shell.theme?.[3] || "14px";
    promptSpan.style.fontFamily = getComputedStyle(document.body).fontFamily;
    inputLineEl.appendChild(promptSpan);

    for (let i = 0; i <= input.length; i++) {
        const span = document.createElement("span");

        if (i === cursorPos) {
            span.textContent = input[i] || " ";
            span.style.backgroundColor = "white"; 

            span.style.color = "black"; 

        } else if (i < input.length) {
            span.textContent = input[i];
            span.style.color = window.shell.theme?.[0] || "white";
            span.style.backgroundColor = window.shell.theme?.[1] || "black";
        }

        span.style.fontSize = window.shell.theme?.[3] || "14px";
        span.style.fontFamily = getComputedStyle(document.body).fontFamily;

        inputLineEl.appendChild(span);
    }
}
const keydownHandler = async (e) => {
    if (window.shell.inputMode !== "command") return;

    if (e.key === "Backspace") {
        if (cursorPos > 0) {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
            cursorPos--;
            renderInputLine();
        }
        e.preventDefault();
        return;
    }

    if (e.key === "ArrowLeft") {
        cursorPos = Math.max(0, cursorPos - 1);
        renderInputLine();
        e.preventDefault();
        return;
    }

    if (e.key === "ArrowRight") {
        cursorPos = Math.min(input.length, cursorPos + 1);
        renderInputLine();
        e.preventDefault();
        return;
    }

    if (e.key === "Enter") {
        if (inputLineEl) {
            inputLineEl.innerHTML = "";
            if (window.shell.cwd == window.shell.home) {
                usercwd = "~";
            } else {
                usercwd = window.shell.cwd;
            }
            const promptSpan = document.createElement("span");
            promptSpan.textContent = `${terminaluser}@${terminalhost}:${usercwd}$ `;

            if (shell.userPermission > 3) promptSpan.style.color = "red";
            if (shell.userPermission < 4) promptSpan.style.color = "lime";

            promptSpan.style.backgroundColor =
                window.shell.theme?.[1] || "black";
            promptSpan.style.fontSize = window.shell.theme?.[3] || "14px";
            promptSpan.style.fontFamily =
                getComputedStyle(document.body).fontFamily;

            inputLineEl.appendChild(promptSpan);

            const textSpan = document.createElement("span");
            textSpan.textContent = input;
            textSpan.style.color = window.shell.theme?.[0] || "white";
            textSpan.style.backgroundColor =
                window.shell.theme?.[1] || "black";
            textSpan.style.fontSize = window.shell.theme?.[3] || "14px";
            textSpan.style.fontFamily =
                getComputedStyle(document.body).fontFamily;

            inputLineEl.appendChild(textSpan);
        }

        const newLine = document.createElement("div");
        screen.appendChild(newLine);

        if (input === "exit") {
            screen.innerHTML = ""
            document.removeEventListener("keydown", keydownHandler); 

            return;
        }

        await executeCommand(input);

        inputLineEl = null;
        prompt();
        return;
    }

    if (e.key.length === 1) {
        input = input.slice(0, cursorPos) + e.key + input.slice(cursorPos);
        cursorPos++;
        renderInputLine();
    }
};

document.addEventListener("keydown", keydownHandler);
window.prompt = prompt;
log("Terminal", "Starting main prompt", true);
prompt();