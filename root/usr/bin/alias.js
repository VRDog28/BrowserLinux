const userinput = shell.args.join(" ")
if (!userinput) {
    write("Interactive mode is not available\n");
    return 1;
}
const alias = userinput.split("=")[0];
const string = userinput.split("=")[1];
if (!alias || !string) {
    write("Invalid input\n");
    return 1;
}
let pattern = string

if (
  (pattern.startsWith('"') && pattern.endsWith('"')) ||
  (pattern.startsWith("'") && pattern.endsWith("'"))
) {
  pattern = pattern.slice(1, -1);
}

window.shell.aliases[alias] = pattern;