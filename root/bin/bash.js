window.typemode = false;
window.typefile = "";
window.shell.ifStack = [];
window.shell.whileStack = [];

let exit = false
let exitcode = null;

async function evaluateCondition(condition) {
    condition = handleVariables(condition).trim();

    if (condition.startsWith("[") && condition.endsWith("]")) {
        const content = condition.slice(1, -1).trim();

        const parts = content.match(/"[^"]*"|\S+/g) || [];

        const leftRaw = parts[0];
        const op = parts[1];
        const rightRaw = parts[2];

        const clean = (v) =>
            v?.startsWith('"') && v.endsWith('"') ?
            v.slice(1, -1) :
            v;

        const left = clean(leftRaw);
        const right = clean(rightRaw);
        if (op === "=") return left === right;
        if (op === "!=") return left !== right;
        const l = Number(left);
        const r = Number(right);

        if (!isNaN(l) && !isNaN(r)) {
            switch (op) {
                case "-eq":
                    return l === r;
                case "-ne":
                    return l !== r;
                case "-gt":
                    return l > r;
                case "-lt":
                    return l < r;
                case "-ge":
                    return l >= r;
                case "-le":
                    return l <= r;
            }
        }

        return false;
    }

    return false;
}

async function runIfBlock(lines, shouldRun) {
    let execute = false;
    for (const line of lines) {
        if (line === "then") {
            execute = shouldRun;
            continue;
        }

        if (line === "else") {
            execute = !shouldRun;
            continue;
        }

        if (line === "fi") break;

        if (execute) {
            await executeCommand(line);
        }
    }
}

function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

async function runWhileBlock(stateRef) {

    const savedStack = window.shell.whileStack;
    window.shell.whileStack = []; 

    const id = Math.random().toString(36).slice(2, 6);

    console.log(`[runWhileBlock:${id}] START condition="${stateRef.condition}"`);
    console.log(`[runWhileBlock:${id}] buffer=`, JSON.stringify(stateRef.buffer));

    let iterations = 0;
    const MAX = 10000;

    while (true) {
        if (++iterations > MAX) {
            write("bash: while loop exceeded max iterations\n");
            break;
        }

        await yieldToUI();

        const result = await evaluateCondition(
            handleVariables(stateRef.condition)
        );

        if (!result) break;

        for (const line of stateRef.buffer) {
            const t = line.trim();

            await yieldToUI();
            await executeCommand(t);

            if (stateRef.break || window.shell.breakSignal) {
                stateRef.break = false;
                window.shell.breakSignal = false;
                window.shell.whileStack = savedStack;
                return;
            }
        }
    }

    window.shell.whileStack = savedStack; 

}

async function setVar(name, value) {
    value = await resolveCommandSubstitution(value);
    if (!name || typeof name !== "string") {
        write("bash: invalid variable name\n");
        return;
    }

    log("Bash", "Attempting to set variable");

    if (window.shell.protectedVars?.has(name) && shell.userPermission != 4) {
        write(`bash: cannot modify '${name}': Permission denied\n`);
        return;
    }

    const varConfPath = "/tmp/var.conf";

    if (!fs.files[varConfPath]) fs.files[varConfPath] = "";

    const lines = fs.files[varConfPath]
        .split("\n")
        .filter(l => l.trim() !== "");

    let found = false;

    for (let i = 0; i < lines.length; i++) {
        const eq = lines[i].indexOf("=");
        if (eq === -1) continue;

        const key = lines[i].slice(0, eq).trim();

        if (key === name) {
            lines[i] = `${name}=${JSON.stringify(value)}`;
            found = true;
            break;
        }
    }

    if (!found) {
        lines.push(`${name}=${JSON.stringify(value)}`);
    }

    fs.files[varConfPath] = lines.join("\n");

    window.shell[name] = value;

    if (!window.shell.allowedKeys) window.shell.allowedKeys = new Set();
    window.shell.allowedKeys.add(name);

    if (typeof saveFS1 === "function") saveFS1();
}

async function handleIf(trimmed) {
    const stack = window.shell.ifStack;
    const current = stack[stack.length - 1];

    if (trimmed.startsWith("if ")) {
        const condition = trimmed.slice(3).trim();

        let result = false;
        try {
            result = await evaluateCondition(condition);
            window.shell.lastStatus = result ? 0 : 1;
        } catch {
            result = false;
            window.shell.lastStatus = 1;
        }

        stack.push({
            waitingForThen: true,
            conditionPassed: result,
            buffer: [trimmed]
        });

        return true;
    }

    if (trimmed.startsWith("then")) {
        if (!current) return true;

        current.waitingForThen = false;
        current.buffer.push("then");

        const rest = trimmed.slice(4).trim();
        if (rest) current.buffer.push(rest);

        return true;
    }

    if (trimmed.startsWith("else")) {
        if (!current) return true;

        current.buffer.push("else");

        const rest = trimmed.slice(4).trim();
        if (rest) current.buffer.push(rest);

        return true;
    }

    if (trimmed === "fi") {
        if (!current) return true;

        current.buffer.push("fi");

        const finished = stack.pop();

        await runIfBlock(finished.buffer, finished.conditionPassed);

        return true;
    }

    if (current) {
        current.buffer.push(trimmed);
        return true;
    }

    return false;
}

async function handleWhile(raw) {
    const stack = window.shell.whileStack;
    const current = stack[stack.length - 1];

    if (raw.startsWith("while ")) {
        if (current) {

            current.buffer.push(raw);
            return true;
        }
        stack.push({
            waitingForDo: true,
            condition: raw.slice(6).trim(),
            buffer: [],
            break: false
        });
        return true;
    }

    if (raw === "do" || raw.startsWith("do ")) {
        if (!current) return true;
        current.buffer.push(raw);
        return true;
    }

    if (raw === "done") {
        if (!current) return true;

        let depth = 0;
        for (const l of current.buffer) {
            if (l.trim().startsWith("while ")) depth++;
            if (l.trim() === "done") depth--;
        }

        if (depth > 0) {

            current.buffer.push(raw);
            return true;
        }

        current.buffer.push(raw);
        const finished = stack.pop();

        if (stack.length === 0) {
            await runWhileBlock(finished);
        }

        return true;
    }

    if (current) {
        current.buffer.push(raw);
        return true;
    }

    return false;
}

function handleAssignment(cmdLine) {
    const assignMatch = cmdLine.match(/^([a-zA-Z_]\w*)=(.+)$/);

    if (!assignMatch) return false;

    const varName = assignMatch[1];
    let varValue;

    try {
        varValue = Function(`"use strict"; return (${assignMatch[2]});`)();
    } catch {
        varValue = assignMatch[2];
    }
    setVar(varName, varValue);
    return true;
}

function handleRedirection(cmdLine) {
    let targetFile = null;
    let append = false;
    let commandPart = cmdLine;

    if (cmdLine.includes(">>")) {
        const parts = cmdLine.split(">>");
        commandPart = parts[0].trim();
        targetFile = parts[1].trim();
        append = true;
    } else if (cmdLine.includes(">")) {
        const parts = cmdLine.split(">");
        commandPart = parts[0].trim();
        targetFile = parts[1].trim();
        append = false;
    }

    return {
        commandPart,
        targetFile,
        append
    };
}

async function handlePipes(commandPart) {
    const pipeParts = commandPart.split("|").map(p => p.trim());

    if (pipeParts.length <= 1) return false;

    let capturedOutput = "";
    const originalWrite = write;

    write = (text) => {
        capturedOutput += text;
    };

    await executeCommand(pipeParts[0]);

    write = originalWrite;

    capturedOutput = capturedOutput.replace(/\n$/, "");
    window.shell.pipe = capturedOutput;

    await executeCommand(pipeParts.slice(1).join(" | "));
    window.shell.pipe = "";

    return true;
}

function handleVariables(commandPart) {
    if (!fs.files["/tmp/var.conf"]) return commandPart;

    const allowedKeys = new Set();

    fs.files["/tmp/var.conf"].split("\n").forEach(line => {
        const eq = line.indexOf("=");
        if (eq === -1) return;

        const key = line.slice(0, eq).trim();
        if (key) allowedKeys.add(key);
    });
    commandPart = commandPart.replace(/\$\?/g, () => {
        return (window.shell.lastStatus !== undefined ? window.shell.lastStatus : 0);
    });

    commandPart = commandPart.replace(/\$([a-zA-Z_]\w*|\d+)/g, (_, varName) => {
        if (varName === "lastStatus") return "";

        if (allowedKeys.has(varName) && window.shell[varName] !== undefined) {
            const val = window.shell[varName];
            return typeof val === "object" ? JSON.stringify(val) : val;
        }

        return "";
    });

    return commandPart;
}

async function executeCommandCapture(cmd) {
    let captured = "";

    const originalWrite = write;

    write = (text) => {
        captured += text;
    };

    await executeCommand(cmd);

    write = originalWrite;

    return captured;
}

async function resolveCommandSubstitution(input) {
    const regex = /\$\(([^)]+)\)/g;

    let match;

    while ((match = regex.exec(input))) {
        const command = match[1];

        const output = await executeCommandCapture(command);

        input = input.replace(match[0], output.trim());
    }

    return input;
}

async function executeCommand(cmdLine) {
    if (window.typemode && window.fs.files.hasOwnProperty(window.typefile)) {
        if (cmdLine == "EOF") {
            window.fs.files[window.typefile] = window.fs.files[window.typefile].replace(/\n$/, "");
            await saveFS1();
            window.typemode = false;
            window.typefile = "";
            return;
        }
        window.fs.files[window.typefile] += cmdLine + "\n";
        return;
    }
    if (cmdLine.trim() == "") return;

    const commands = cmdLine.split(";").map(c => c.trim()).filter(Boolean);

    if (commands.length > 1) {
        for (const cmd of commands) {
            await executeCommand(cmd);
        }
        return;
    }

    const raw = cmdLine.trim(); 

    if (await handleWhile(raw)) return;

    let trimmed = handleVariables(raw);

    if (await handleIf(trimmed)) return;

    if (window.fs.files.hasOwnProperty("/home/.bash_history")) {
        window.fs.files["/home/.bash_history"] += cmdLine + "\n";
    }

    if (cmdLine.split(" ")[0].toLowerCase() === "terminal") return;

    if (handleAssignment(cmdLine)) return;

    let {
        commandPart,
        targetFile,
        append
    } = handleRedirection(cmdLine);

    if (await handlePipes(commandPart)) return;

    commandPart = handleVariables(commandPart);

    const parts = commandPart.split(" ");
    const cmd = parts[0];
    if (cmd === "break") {
        const stack = window.shell.whileStack;
        if (stack.length > 0) {
            stack[stack.length - 1].break = true;
        } else {

            window.shell.breakSignal = true;
        }
        return;
    }
    const argsOrig = parts.slice(1);

    let originalWrite = write;
    let wroteToFile = false;

    if (targetFile) {
        let overwriteFirstWrite = true;

        write = (text) => {
            let path;

            if (targetFile.startsWith("/")) {
                path = targetFile.replace(/\/+/g, "/");
            } else {
                path =
                    (shell.cwd === "/" ? "/" : shell.cwd + "/") + targetFile;
                path = path.replace(/\/+/g, "/");
            }

            if (path === "/dev/null") return;

            if (!fs.files.hasOwnProperty(path)) {
                fs.files[path] = "";
            }

            if (append) {

                fs.files[path] += text;
            } else {

                if (overwriteFirstWrite) {
                    fs.files[path] = ""; 

                    overwriteFirstWrite = false;
                }

                fs.files[path] += text; 

            }

            wroteToFile = true;
        };
    }

    let cmdPath = null;

    for (const base of window.shell.path) {
        const fullPath = `${base}/${cmd}.js`;

        if (fs.files[fullPath]) {
            cmdPath = fullPath;
            break;
        }
    }

    if (cmdPath) {
        try {
            window.shell.args = argsOrig;
            await runFile(cmdPath);
        } catch (e) {
            originalWrite(`Error: ${cmd}: ${e.message}\n`);
        }
    } else if (cmd == "exit") {
        exit = true;
        if (argsOrig[0]) exitcode = argsOrig[0];
    } else {
        originalWrite(`${cmd}: command not found\n`);
    }

    if (targetFile) write = originalWrite;

    if (wroteToFile && typeof saveFS1 === "function") {
        await saveFS1();
    }
}

window.executeCommand = executeCommand;
window.setVar = setVar;
if (shell.args.length == 0) return;
const target = shell.args[0];
let path;
if (target.startsWith("/")) {
    path = target.replace(/\/+/g, "/");
} else {
    path = (shell.cwd === "/" ? "/" : shell.cwd + "/") + target;
    path = path.replace(/\/+/g, "/");
}

let file = window.fs.files[path];

if (!file) {
    write("bash: script not found\n");
    window.shell.lastStatus = 1;
} else {
    let script = typeof file === "string" ? file : file.content;

    let scriptArgs = shell.args.slice(1);

    let oldArgs = shell.args;
    shell.args = scriptArgs;
    shell.inputMode = "bash";
    exit = false;
    exitcode = null;
    for (let line of script.split("\n")) {
        shell.inputMode = "bash";
        if (line.startsWith("#")) continue;
        line = line.replace(/\$(\d+)/g, (_, n) => scriptArgs[n - 1] || "");
        await executeCommand(line);
        if (exit) break;
    }
    exit = false;
    shell.args = oldArgs;
    shell.inputMode = "command";
}
if (exitcode != null) {
    return Number(exitcode);
    exitcode = null;
}