let options = [];
let values = {};

function detectargs() {
    let newArgs = [];

    for (let i = 0; i < shell.args.length; i++) {
        let item = shell.args[i];

        if (item.startsWith("-") && item.length > 1) {
            let key = item.slice(1);
            let next = shell.args[i + 1];

            if (next && !next.startsWith("-")) {
                values[key] = next;
                newArgs.push(next);

                i++;
            } else {
                values[key] = true;
            }
            options.push(...key.split(""));
        } else {
            newArgs.push(item);
        }
    }
    shell.args = newArgs;
}
detectargs();

let pattern = shell.args.join(" ");

if (
  (pattern.startsWith('"') && pattern.endsWith('"')) ||
  (pattern.startsWith("'") && pattern.endsWith("'"))
) {
  pattern = pattern.slice(1, -1);
}
if (!pattern) {
  write("grep: missing pattern\n");
  return 1;
}

const stdin = shell.pipe || "";

const ignoreCase = options.includes("i");
const invertMatch = options.includes("v");

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let safePattern = escapeRegExp(pattern);

let regex;

try {
  regex = new RegExp(safePattern, ignoreCase ? "i" : "");
} catch {
  write("grep: invalid pattern\n");
  return 1;
}

const lines = stdin.split("\n");

let found = false;

for (const line of lines) {
  const match = regex.test(line);

  if ((match && !invertMatch) || (!match && invertMatch)) {
    write(line + "\n");
    found = true;
  }
}


if (found) {
  return 0;
} else {
  return 1;
}