const etcConfigPath = "/etc/config.conf";
window.shell = {};
let profilePath = null;

if (!fs.files[etcConfigPath]) {
    write("config: No /etc/config.conf found, using defaults.\n");
    profilePath = "/etc/profiles/default.conf";
} else {
    const etcLines = fs.files[etcConfigPath].split("\n");

    for (let line of etcLines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;

        const eq = line.indexOf("=");
        if (eq === -1) continue;

        const key = line.slice(0, eq).trim();
        const valueStr = line.slice(eq + 1).trim();

        if (key === "configfile") {
            try {
                profilePath = Function(`"use strict"; return (${valueStr});`)();
            } catch (e) {
                write("config: Failed to parse configfile path\n");
            }
            break;
        }
    }
}

if (!profilePath) {
    write("config: No configfile specified in /etc/config.conf\n");
} else if (!fs.files[profilePath]) {
    write(`config: Profile file not found: ${profilePath}\n`);
} else {

    const lines = fs.files[profilePath].split("\n");
    window.shell.protectedVars = new Set();

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;

        const eq = line.indexOf("=");
        if (eq === -1) continue;

        const key = line.slice(0, eq).trim();
        window.shell.protectedVars.add(key);
        const valueStr = line.slice(eq + 1).trim();

        try {
            const value = Function(`"use strict"; return (${valueStr});`)();
            window.shell[key] = value;
        } catch (e) {
            write(`config: Failed to parse line in profile: ${line}\n`);
        }
    }

    if (!fs.folders.includes("/tmp")) fs.folders.push("/tmp");

    fs.files["/tmp/var.conf"] = fs.files[profilePath]; 

    saveFS1();
}

write("config: Config loaded\n");