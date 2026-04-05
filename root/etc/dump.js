const dumpfile = "/usr/local/dump.conf";
window.shell.dump = []
if (!window.fs.files[dumpfile]) return;
const filecontent = window.fs.files[dumpfile];
const lines = filecontent.split("\n");
let dump = []
for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (line == "") continue;
    const valuename = line.split("=")[0];
    const bool = line.split("=")[1];
    if (bool != "true") continue;
    dump.push(valuename);
}
setVar("dump", dump);