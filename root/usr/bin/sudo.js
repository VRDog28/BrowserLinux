if (shell.dump.includes("disablesudo")) return;
if (!shell.args || shell.args.length === 0) {
    write("sudo [command [arg ...]]\n");
} else {
    const superuserPass = fs.meta["/etc"]?.[".superuser"];
    if (!superuserPass) {
        log("Sudo", "No superuser password set", true);
        write("sudo: no superuser password set.\n");
        return 1;
    }
    log("Sudo", "Attempting to request superuser password", true);
    await new Promise(resolve => {

        requestSuperuserPassword(async (input) => {
            newline();

            if (input !== superuserPass) {
                log("Sudo", `Incorrect superuser password`, true);
                write("Sorry, try again.\n");
                resolve();
                return 1;
            }

            const prevPermission = window.shell.userPermission;
            window.shell.userPermission = 4; 

            try {
                const fullCmd = shell.args.join(" ");
                if (fullCmd == "-s") {
                    await executeCommand("userPermission=4");
                } else {
                    log("Sudo", `Attempting to execute ${shell.args[0]}`, true);
                    await executeCommand(fullCmd);
                }
            } catch (e) {
                log("Sudo", `Error running ${shell.args[0]}: ${e.message}\n`, true);
                write(`sudo error: ${shell.args[0]}: ${e.message}\n`);
                return 1;
            }

            let newPerm = prevPermission;

            if (fs.files["/tmp/var.conf"]) {
                const lines = fs.files["/tmp/var.conf"].split("\n");

                for (let line of lines) {
                    line = line.trim();
                    if (!line || line.startsWith("#")) continue;

                    const eq = line.indexOf("=");
                    if (eq === -1) continue;

                    const key = line.slice(0, eq).trim();
                    const valueStr = line.slice(eq + 1).trim();

                    if (key === "userPermission") {
                        try {
                            newPerm = Function(`"use strict"; return (${valueStr});`)();
                        } catch {}
                        break;
                    }
                }
            }

            window.shell.userPermission = newPerm;
            resolve();
        });
    });
}