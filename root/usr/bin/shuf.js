let options = [];
let values = {};
let argsclean = [];
let origargs = shell.args;

function detectargs() {
    let newArgs = [];

    for (let i = 0; i < shell.args.length; i++) {
        let item = shell.args[i];

        if (item.startsWith("-") && item.length > 1) {
            let key = item.slice(1);
            let next = shell.args[i + 1];

            options.push(...key.split(""));

            if (next && !next.startsWith("-")) {
                values[key] = next;
                newArgs.push(next);

                i++;
            } else {
                values[key] = true;
            }
        } else {
            newArgs.push(item);
        }
    }
    argsclean = newArgs.filter(item => {
        return !Object.values(values).includes(item);
    });

    shell.args = newArgs;
}
detectargs();
const range = values["i"];

if (!range) {
    write("shuf: no range provided\n");
    return;
}

const parts = range.split("-");

if (parts.length !== 2) {
    write("shuf: invalid range format\n");
    return;
}

let start = parseInt(parts[0], 10);
let end = parseInt(parts[1], 10);

if (isNaN(start) || isNaN(end)) {
    write("shuf: invalid numbers in range\n");
    return;
}

if (start > end) {
    write("shuf: start must be <= end\n");
    return;
}

let numbers = [];

for (let i = start; i <= end; i++) {
    numbers.push(i);
}

for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
}

let count = numbers.length;

if (values["n"] !== undefined) {
    count = parseInt(values["n"], 10);

    if (isNaN(count) || count < 0) {
        write("shuf: invalid count\n");
        return;
    }
}

for (let i = 0; i < Math.min(count, numbers.length); i++) {
    write(numbers[i] + "\n");
}