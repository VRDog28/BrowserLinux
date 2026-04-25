if (shell.args.length === 0) { write("Linux\n"); return; }
if (shell.args[0].toLowerCase() == "-a") write("Linux " + shell.hostName + " BrowserLinux Kernel\n");
if (shell.args[0].toLowerCase() == "-r") write("BrowserLinux Kernel\n");