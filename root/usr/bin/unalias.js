const userinput = shell.args[0];
if (!userinput) {
    write("Interactive mode is not available\n");
    return 1;
}
if (window.shell.aliases[userinput]) {
  delete window.shell.aliases[userinput];
} else {
  write("Alias not found\n");
}