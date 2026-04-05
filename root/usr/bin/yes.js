const text = shell.args.join(" ") || "y";

let runningYes = true;

function handleKeydown(e) {
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
        runningYes = false;
        write("^C\n");
        document.removeEventListener("keydown", handleKeydown);
    }
}
document.addEventListener("keydown", handleKeydown);

while (runningYes) {
    write(text + "\n");
    await wait(10);
}