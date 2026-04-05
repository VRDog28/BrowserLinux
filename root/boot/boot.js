await wait(1000);
clear();
log("Boot JS", "Attempting to start terminal.js", true);
await runFile("/bin/bash.js");
await runFile("/etc/dump.js");
if (shell.dump.includes("lock")) { write("This system is locked!"); return; }
await runFile("/bin/terminal.js");