window.typemode = false;
window.typefile = "";
window.shell.ifStack = [];
window.shell.whileStack = [];
window.shell.last = [];
window.shell.whileRef = {};
let exit = false
let exitcode = null;
    function getEffectiveWritePermission(folderPath) {
        const parts = folderPath.split("/").filter(Boolean);
        let currentPath = "/";
        let permission = 0; 

        for (const part of parts) {
            currentPath = currentPath === "/" ? "/" + part : currentPath + "/" + part;
            if (fs.meta[currentPath] && fs.meta[currentPath].writepermission !== undefined) {
                permission = parseInt(fs.meta[currentPath].writepermission);
            }
        }
        return permission;
    }

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
    if (condition.trim() == "true") return true;
    if (condition.trim() == "false") return false;
    let originalWrite = write;
    write = (text, color="d", color2="d") => {};
    await executeCommand(condition);
    write = originalWrite;
    return window.shell.lastStatus === 0;
}

async function runIfBlock(lines, shouldRun) {
    let execute = false;
    let depth = 0;
    lines = lines.slice(1);
    console.log(lines);
    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("if ")) {
            depth++;
        }
        if (t === "then" && depth === 0) {
            execute = shouldRun;
            continue;
        }
        if (t === "else" && depth === 0) {
            execute = !shouldRun;
            continue;
        }
        if (t.startsWith("elif") && depth === 0) {
            if (execute) {
                shouldRun = false;
                continue;
            }
            shouldRun = await evaluateCondition(t.slice(5));
            continue;
        }
        if (t === "fi") {
            if (depth === 0) break;
            depth--;
        }
        if (execute) {
            await executeCommand(line);
        }
    }
}

function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

async function runWhileBlock(stateRef) {

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

        console.log("run")

        if (!result) break;

        console.log("run2")


        for (const line of stateRef.buffer) {
            const t = line.trim();

            await yieldToUI();
            await executeCommand(t);

            if (stateRef.break) {
                stateRef.break = false;
                window.shell.whileRef = {};
                return;
            }
            if (stateRef.continue) {
                stateRef.continue = false;
                window.shell.whileRef.continue = false;
                break;
            }
        }
    }
    window.shell.whileRef = {};
}

async function setVar(name, value) {
    if (!name || typeof name !== "string") {
        write("bash: invalid variable name\n");
        return;
    }

    log("Bash", "Attempting to set variable");

    if (window.shell.protectedVars?.has(name) && shell.userPermission != 4) {
        write(`bash: cannot modify '${name}': Permission denied\n`);
        return;
    }

    const varConfPath = "/etc/var.conf";

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
    if (current?.intype) {
        if (trimmed === "EOF") {
            current.intype = false;
        }
        current.buffer.push(trimmed);
        return true;
    }
    if (trimmed.startsWith("if ")) {
        if (current) {
            current.depth++;
            current.buffer.push(trimmed);
            return true;
        }
        window.shell.last.push("if");
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
            buffer: [trimmed],
            depth: 1,
            intype: false
        });

        return true;
    }
    if (!current) return false;

    if (trimmed.startsWith("type ") && !current.intype) {
        current.intype = true;
        current.buffer.push(trimmed);
        return true;
    }
    if (trimmed.startsWith("then")) {
        current.buffer.push("then");

        const rest = trimmed.slice(4).trim();
        if (rest) current.buffer.push(rest);

        if (rest && rest.startsWith("if ")) current.depth++;
        

        return true;
    }
    if (trimmed.startsWith("else")) {
        current.buffer.push("else");

        const rest = trimmed.slice(4).trim();
        if (rest) current.buffer.push(rest);

        if (rest && rest.startsWith("if ")) current.depth++;

        return true;
    }
    if (trimmed.startsWith("elif")) {
        current.buffer.push(trimmed);
        return true;
    }
    if (trimmed === "fi") {
        current.buffer.push("fi");
        current.depth--;
        if (current.depth === 0) {
            window.shell.last.pop();
            const finished = stack.pop();
            await runIfBlock(finished.buffer, finished.conditionPassed);
        }

        return true;
    }
    current.buffer.push(trimmed);
    return true;
}

async function handleWhile(raw) {
    const stack = window.shell.whileStack;
    const current = stack[stack.length - 1];
    if (current?.intype) {
        if (raw === "EOF") {
            current.intype = false;
        }
        current.buffer.push(raw);
        return true;
    }
    if (raw.startsWith("while ")) {
        if (current) {
            current.depth++;
            current.buffer.push(raw);
            return true;
        }
        window.shell.last.push("while");
        stack.push({
            waitingForDo: true,
            condition: raw.slice(6).trim(),
            buffer: [],
            break: false,
            intype: false,
            depth: 1,
            continue: false
        });
        return true;
    }
    if (!current) return false;
    if (raw.startsWith("type ") && !current.intype) {
        current.intype = true;
        current.buffer.push(raw);
        return true;
    }

    if (raw === "do" || raw.startsWith("do ")) {
        return true;
    }

    if (raw === "done") {
        current.depth--;
        if (current.depth === 0) {
            window.shell.last.pop();
            const finished = stack.pop();
            window.shell.whileRef = finished;
            await runWhileBlock(finished);
        }

        return true;
    }


    current.buffer.push(raw);
    return true;

}

function handleAssignment(cmdLine) {
    const assignMatch = cmdLine.match(/^([a-zA-Z_]\w*)=(.+)$/);
    if (!assignMatch) return false;

    const varName = assignMatch[1];
    const rawValue = assignMatch[2].trim();

    let varValue;


    try {
        varValue = JSON.parse(rawValue);
    } catch {
        if (/^[0-9+\-*/().\s]+$/.test(rawValue)) {
            try {
                varValue = Function(`"use strict"; return (${rawValue})`)();
            } catch {
                varValue = rawValue;
            }
        }
        else if (rawValue === "true") varValue = true;
        else if (rawValue === "false") varValue = false;
        else if (
            (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ) {
            varValue = rawValue.slice(1, -1);
        }
        else {
            varValue = rawValue;
        }
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
    if (!fs.files["/etc/var.conf"]) return commandPart;

    const allowedKeys = new Set();

    fs.files["/etc/var.conf"].split("\n").forEach(line => {
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
    let result = "";
    let i = 0;

    while (i < input.length) {
        if (input[i] === "$" && input[i + 1] === "(") {
            i += 2;

            let depth = 1;
            let command = "";

            while (i < input.length && depth > 0) {
                if (input[i] === "(") {
                    depth++;
                } else if (input[i] === ")") {
                    depth--;
                    if (depth === 0) {
                        i++;
                        break;
                    }
                }

                command += input[i];
                i++;
            }

            const resolved = await resolveCommandSubstitution(command);

            const output = await executeCommandCapture(resolved);

            result += output.trim();
        } else {
            result += input[i];
            i++;
        }
    }

    return result;
}

async function executeCommand(cmdLine, store=false) {
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

    const inIf = window.shell.ifStack.length > 0;
    const inWhile = window.shell.whileStack.length > 0;

    const commands = cmdLine.split(";").map(c => c.trim()).filter(Boolean);

    if (commands.length > 1 && !inIf && !inWhile) {
        for (const cmd of commands) {
            await executeCommand(cmd);
        }
        return;
    }

    cmdLine = await resolveCommandSubstitution(cmdLine);

    const raw = cmdLine.trim(); 



    let trimmed = handleVariables(raw);

    if (window.shell.last.at(-1) == "if") {
        if (await handleIf(trimmed)) return;
    } else if (window.shell.last.at(-1) == "while") {
        if (await handleWhile(raw)) return;
    } else {
        if (await handleWhile(raw)) return;
        if (await handleIf(trimmed)) return;
    }

    if (window.fs.files.hasOwnProperty("/home/.bash_history") && store) {
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

    commandPart = handleVariables(commandPart).trim();

    let tempparts = commandPart.split(" ")
    if (Object.keys(window.shell.aliases).length > 0) {
        for (let key in window.shell.aliases) {
            if (tempparts[0] == key) {
                tempparts.shift();
                commandPart = window.shell.aliases[key] + " " + tempparts.join(" ");
                break;
            }
        }
    }
    

    const parts = commandPart.split(" ");
    const cmd = parts[0];
    if (cmd === "break") {
        if (Object.keys(window.shell.whileRef).length === 0) {
            write("-bash: break: only meaningful in a 'while' loop\n");
            return;
        }
        window.shell.whileRef.break = true;
        return;
    } else if (cmd === "continue") {
            if (Object.keys(window.shell.whileRef).length === 0) {
                write("-bash: continue: only meaningful in a 'while' loop\n");
            return;
        }
        window.shell.whileRef.continue = true;
        return;
    }
    const argsOrig = parts.slice(1);

    let originalWrite = write;
    let wroteToFile = false;
    let haspermission = false;
    let path;

    if (targetFile) {
        let base = targetFile.startsWith("/") ? targetFile : (shell.cwd === "/" ? "" : shell.cwd) + "/" + targetFile;
        path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");
        if (path === "/dev/null") return;
        if (fs.meta[path] && fs.meta[path]["writepermission"] && fs.meta[path]["writepermission"] <= shell.userPermission) haspermission = true;
        if (!haspermission) {
            let parent = path.substring(0, path.lastIndexOf("/")) || "/";
            path = parent
            if (fs.meta[path] && fs.meta[path]["writepermission"] && fs.meta[path]["writepermission"] <= shell.userPermission) haspermission = true;
            if (!haspermission) {
                const folderWritePerm = getEffectiveWritePermission(path);
                if (shell.userPermission >= folderWritePerm) haspermission = true; 
            }
        }
        if (!haspermission) {
            write("bash: cannot write to '" + path + "': Permission denied\n");
            window.shell.lastStatus = 1;
            return;
        }
        let overwriteFirstWrite = true;

        write = (text) => {
            let path;

    let base = targetFile.startsWith("/") ? targetFile : (shell.cwd === "/" ? "" : shell.cwd) + "/" + targetFile;
    path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");

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

    for (let base of window.shell.path) {
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
            window.shell.lastStatus = 1;
        }
    } else if (cmd == "exit") {
        exit = true;
        if (argsOrig[0]) exitcode = argsOrig[0];
    } else {
        originalWrite(`${cmd}: command not found\n`);
        window.shell.lastStatus = 127;
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
let base = target.startsWith("/") ? target : (shell.cwd === "/" ? "" : shell.cwd) + "/" + target;
path = "/" + base.split("/").filter(Boolean).reduce((a, p) => p === ".." ? (a.pop(), a) : p === "." ? a : (a.push(p), a), []).join("/");

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