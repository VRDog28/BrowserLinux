if (shell.userPermission != 4) {
    write("reboot: Reboot must be run as root\n");
    return;
}
clear();
write("Rebooting system...\n", "yellow");
log("REBOOT", "Rebooting system at uptime " + window.uptime + " " + Date.now().toString())
saveFS1();
await wait(1000);
location.reload();