if (shell.args.length === 0) { write("Linux\n"); return; }
if (shell.args[0].toLowerCase() == "-a") write("Linux " + shell.hostName + " 6.1.38-chrome12.5-g44bda5e8f6-ab137h7568\n");
if (shell.args[0].toLowerCase() == "-r") write("6.1.38-chrome12.5-g44bda5e8f6-ab137h7568\n");