if (shell.args.length === 0) {write(window.shell.hostName + "\n"); return; }
if (shell.args[0].toLowerCase() == "-i") write("127.0.0.1\n");