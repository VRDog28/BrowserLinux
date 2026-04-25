let mode = shell.args[0]
let setting = shell.args[1]
if (mode.toLowerCase() == "reload") {
    if (setting.toLowerCase() == "dump") {
        runFile("/etc/dump.js");
        return 0;
    }
    if (setting.toLowerCase() == "config") {
        runFile("/etc/config.js");
        return 0;
    }
}