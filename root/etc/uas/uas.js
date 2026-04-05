window.shell.userPermission = 4 

clear();
write("#####################################\n");
write("# Welcome to your operating system! #\n");
write("#####################################\n");
newline();
if (!fs.meta["/etc"]) fs.meta["/etc"] = {};
let userName = "";
while (!userName) {
    write("Enter a username: ");
    await executeCommand('read -p "Username: " REPLY');

    userName = (window.shell.REPLY || "").trim();

    if (!userName) {
        write("Username cannot be empty.\n");
    }
}
await setVar("userName", userName);
let passwordSet = false;
while (!passwordSet) {
    write("\nSet a superuser password:\n");

    await new Promise(res => {
        requestSuperuserPassword(async pw => {

            if (!pw) {
                write("\nPassword cannot be empty.\n");
                return res();
            }

            write("\nConfirm superuser password:\n");

            await requestSuperuserPassword(async confirmPw => {
                if (pw !== confirmPw) {
                    write("\nPasswords do not match. Try again.\n");
                    return res();
                }
                fs.meta["/etc"][".superuser"] = pw;
                passwordSet = true;
                res();
            });
        });
    });
}
write("\nEnter a hostname (optional, press Enter to skip): ");
await executeCommand('read -p "Hostname: " REPLY');
let hostName = (window.shell.REPLY).trim();
if (!hostName) {
    hostName = userName + "-pc";
}
await setVar("hostName", hostName);
await wait(1000);
fs.files["/etc/uas/setup.conf"] = "setup=1";
let config = fs.files["/tmp/var.conf"] || "";
let lines = config.split("\n");
lines.pop();
config = lines.join("\n");
fs.files["/etc/profiles/default.conf"] = config;
await saveFS1();
write("\nSetup complete!\n");
await wait(1000);
location.reload();