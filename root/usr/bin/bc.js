let input = "";

if (window.shell.pipe && window.shell.pipe.trim() !== "") {
    input = window.shell.pipe.trim();
} else {
    write("bc: File " + shell.args[0] + " is unavailable.");
    return 1;
}

if (!input) {
    write("Interactive mode not available\n");
    return 1;
}

function evaluate(expr) {

    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        return "Error: invalid characters";
    }

    try {
        return Function(`"use strict"; return (${expr})`)();
    } catch (e) {
        return "Error: invalid expression";
    }
}

const result = evaluate(input);

write(result + "\n", "white");

return 0;