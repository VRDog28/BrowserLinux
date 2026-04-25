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

let msg = shell.args.join(" ");

if (
  (msg.startsWith('"') && msg.endsWith('"')) ||
  (msg.startsWith("'") && msg.endsWith("'"))
) {
  msg = msg.slice(1, -1);
}
write(msg + "\n");
return 0;