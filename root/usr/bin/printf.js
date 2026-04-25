function splitArgs(input) {
    const result = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if ((char === '"' || char === "'")) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
                continue;
            } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = null;
                continue;
            }
        }
        if (char === " " && !inQuotes) {
            if (current.length > 0) {
                result.push(current);
                current = "";
            }
            continue;
        }

        current += char;
    }

    if (current.length > 0) {
        result.push(current);
    }

    return result;
}
let args = splitArgs(shell.args.join(" "))
if (args.length == 1) write(args[0] + "\n");
if (args.length == 2) write(args[0] + "\n", args[1]);
if (args.length == 3) write(args[0] + "\n", args[1], args[2]);