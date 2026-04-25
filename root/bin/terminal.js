let input = "";
let cursorPos = 0;
let inputLineEl = null;
let terminaluser = window.shell.userName || "Undefined";
let terminalhost = window.shell.hostName || "Undefined";
let usercwd = ""
let curindex = 0;
function reload() {
    let terminaluser = window.shell.userName || "Undefined";
    let terminalhost = window.shell.hostName || "Undefined";
}
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
    const userHostSpan = document.createElement("span");
    userHostSpan.textContent = `${terminaluser}@${terminalhost}`;
    userHostSpan.style.color = shell.userPermission > 3 ? "red" : "lime";
    const colonSpan = document.createElement("span");
    colonSpan.textContent = ":";
    colonSpan.style.color = "white";
    const pathSpan = document.createElement("span");
    pathSpan.textContent = usercwd;
    pathSpan.style.color = "dodgerblue";
    const dollarSpan = document.createElement("span");
    dollarSpan.textContent = "$ ";
    dollarSpan.style.color = "white";
    [userHostSpan, colonSpan, pathSpan, dollarSpan].forEach(span => {
        span.style.backgroundColor = window.shell.theme?.[1] || "black";
        span.style.fontSize = window.shell.theme?.[3] || "14px";
        span.style.fontFamily = getComputedStyle(document.body).fontFamily;
    });
    inputLineEl.appendChild(userHostSpan);
    inputLineEl.appendChild(colonSpan);
    inputLineEl.appendChild(pathSpan);
    inputLineEl.appendChild(dollarSpan);
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

    if (e.ctrlKey && e.key.toLowerCase() === "v") {
        e.preventDefault();

        try {
            const text = await navigator.clipboard.readText();

            input =
                input.slice(0, cursorPos) +
                text +
                input.slice(cursorPos);

            cursorPos += text.length;

            renderInputLine();
        } catch (err) {
            console.error("Paste failed:", err);
        }

        return;
    }

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
const rawFile = window.fs?.files?.["/home/.bash_history"];

const rawHistory = typeof rawFile === "string"
    ? rawFile.split("\n").filter(line => line.trim() !== "")
    : [];

const history = [];

for (let i = 0; i < rawHistory.length; i++) {
    if (i === 0 || rawHistory[i] !== rawHistory[i - 1]) {
        history.push(rawHistory[i]);
    }
}

if (e.key === "ArrowUp") {
    if (curindex >= history.length) return;

    curindex++;

    input = history[history.length - curindex];
    cursorPos = input.length;

    renderInputLine();
    return;
}

if (e.key === "ArrowDown") {
    if (curindex <= 0) {
        curindex = 0;
        input = "";
        cursorPos = 0;
        renderInputLine();
        return;
    }

    curindex--;

    if (curindex === 0) {
        input = "";
        cursorPos = 0;
    } else {
        input = history[history.length - curindex];
        cursorPos = input.length;
    }

    renderInputLine();
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
            const userHostSpan = document.createElement("span");
            userHostSpan.textContent = `${terminaluser}@${terminalhost}`;
            userHostSpan.style.color = shell.userPermission > 3 ? "red" : "lime";
            const colonSpan = document.createElement("span");
            colonSpan.textContent = ":";
            colonSpan.style.color = "white";
            const pathSpan = document.createElement("span");
            pathSpan.textContent = usercwd;
            pathSpan.style.color = "dodgerblue";
            const dollarSpan = document.createElement("span");
            dollarSpan.textContent = "$ ";
            dollarSpan.style.color = "white";
            [userHostSpan, colonSpan, pathSpan, dollarSpan].forEach(span => {
                span.style.backgroundColor = window.shell.theme?.[1] || "black";
                span.style.fontSize = window.shell.theme?.[3] || "14px";
                span.style.fontFamily = getComputedStyle(document.body).fontFamily;
            });
            inputLineEl.appendChild(userHostSpan);
            inputLineEl.appendChild(colonSpan);
            inputLineEl.appendChild(pathSpan);
            inputLineEl.appendChild(dollarSpan);


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

        await executeCommand(input, true);
        curindex = 0;

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
window.reload = reload;
log("Terminal", "Starting main prompt", true);
if (window.fs.files["/home/.bashrc"]) {
    await executeCommand("bash /home/.bashrc");
}
prompt();