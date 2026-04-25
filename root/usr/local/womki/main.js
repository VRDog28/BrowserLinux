function loadData() {
    const path = "/usr/local/womki/data";
    const fileContent = window.fs.files[path];

    if (!fileContent) return [];

    const lines = fileContent.split("\n");
    const values = [];

    for (const line of lines) {
        if (!line.includes("=")) continue;

        const [, value] = line.split("=");

        if (value !== undefined) {
            values.push(parseInt(value.trim(), 10));
        }
    }

    return values;
}

function saveData(name, value) {
    const path = "/usr/local/womki/data";
    let content = window.fs.files[path] || "";
    const lines = content.split("\n").filter(line => line.includes("="));
    let updated = false;

    for (let i = 0; i < lines.length; i++) {
        const [key, _] = lines[i].split("=");
        if (key.trim() === name) {
            lines[i] = `${name}=${value}`;
            updated = true;
            break;
        }
    }

    if (!updated) {
        lines.push(`${name}=${value}`);
    }

    window.fs.files[path] = lines.join("\n");
}

async function readNumber(promptText = "Enter number:") {
    write(promptText + " "); 

    return new Promise(resolve => {
        let inputBuffer = "";

        function onKey(e) {
            if (e.key === "Enter") {
                window.removeEventListener("keydown", onKey);
                const value = parseFloat(inputBuffer);
                resolve(value);
            } else if (/[\d.-]/.test(e.key)) { 

                inputBuffer += e.key;
                write(e.key); 

            }
        }

        window.addEventListener("keydown", onKey);
    });
}

async function DoubleDown() {
    clear();
    write("Current tokens: " + tokens + "\n");
    await wait(1000);
    const bet = await readNumber("Enter a bet:");
    newline();
    if (bet > tokens || tokens < 1) {
        write("You do not have enough tokens!");
        await wait(3000);
        return;
    }
    newline();
    const repeatCount = Math.floor(Math.random() * 6) + 5;
    let win = false;
    saveData("tokens", tokens - bet)
    tokens = tokens - bet
    for (let i = 0; i < repeatCount; i++) {
        win = !win;
        if (win) write("Double\n", "lime");
        if (!win) write("Nothing\n", "red");
        await wait(500)
    }
    newline();
    if (win) {
        saveData("tokens", tokens + bet * 2);
        tokens = tokens + bet * 2;
    }
    await wait(3000)
}

async function BuyTokens() {
    clear();
    const maxtokens = Math.floor(money / 0.72);
    write("Current tokens: " + tokens + "\n");
    write("Balance: " + money + "$\n");
    write("1 Token = 0.72$\n")
    write("Max tokens: " + maxtokens + "\n")
    await wait(1000);
    const amount = await readNumber("Enter amount:");
    newline();
    if (amount > maxtokens || amount == 0 || maxtokens == 0) {
        write("You do not have enough money!\n");
        await wait(3000);
        return;
    }
    const buying = Math.floor(amount);
    tokens += buying;
    money -= buying * 0.72;
    money = Math.floor(money);
    saveData("tokens", tokens);
    saveData("money", money);
    write("Bought " + buying + " tokens!\n");
    await wait(3000);
}

async function Cashout() {
    clear();
    const amount = tokens * 0.72;
    money += Math.floor(amount);
    tokens = 0;
    saveData("tokens", tokens);
    saveData("money", money);
    write("Cashed out! Earned: " + amount + "$\n");
    await wait(3000);
}

async function Roulette() {
    clear();
    write("Current tokens: " + tokens + "\n");
    await wait(1000);
    const bet = await readNumber("Enter a bet amount:");
    newline();
    if (bet > tokens || tokens < 1) {
        write("You do not have enough tokens!");
        await wait(3000);
        return;
    }
    await wait(1000);
    write("1. Red\n");
    write("2. Gray\n");
    write("3. Green\n");
    const colorbet = await readNumber("Enter a bet:");
    newline();
    if (!"123".includes(colorbet)) {
        write("Invalid!\n");
        await wait(3000);
        return;
    }
    const num = Math.floor(Math.random() * 37);

    const result = num === 0 ? 3 : (num % 2 === 0 ? 1 : 2);
    saveData("tokens", tokens - bet)
    tokens = tokens - bet
    for (let i = 0; i < 20; i++) {
        const random = Math.floor(Math.random() * 37);
        const color = random === 0 ? 3 : (random % 2 === 0 ? 1 : 2);
        if (color == 1) write(random.toString(), "red");
        if (color == 2) write(random.toString(), "gray");
        if (color == 3) write(random.toString(), "lime");
        newline();
        await wait(250)
    }
    if (result == 1) write(num.toString(), "red");
    if (result == 2) write(num.toString(), "gray");
    if (result == 3) write(num.toString(), "lime");
    newline();
    newline();
    if (result == 1) write(num.toString() + "!\n", "red");
    if (result == 2) write(num.toString() + "!\n", "gray");
    if (result == 3) write(num.toString() + "!\n", "lime");

    if (colorbet == result.toString()) {
        if (result != 3) {
            saveData("tokens", tokens + bet * 2);
            tokens = tokens + bet * 2;
        } else {
            saveData("tokens", tokens + bet * 8);
            tokens = tokens + bet * 8;
        }
    }
    await wait(3000);

}

async function Slot() {
    clear();
    if (tokens - 1 < 0) {
        write("Not enough tokens!\n");
        await wait(3000);
        return;
    }
    saveData("tokens", tokens - 1)
    tokens = tokens - 1
    const num = Math.floor(Math.random() * 889) + 111;
    const hundreds = Math.floor(num / 100) * 100;
    const tens = Math.floor(num / 10) * 10;
    for (let i = 0; i < 3; i++) {
        const random = Math.floor(Math.random() * 10);
        write(random.toString() + "00\n");
        await wait(500)
    }
    write(hundreds.toString() + "\n", "lime");
    await wait(500)
    for (let i = 0; i < 3; i++) {
        const random = Math.floor(Math.random() * 8);
        write(num.toString()[0] + random.toString() + "0\n");
        await wait(500)
    }
    write(tens.toString() + "\n", "lime");
    await wait(500)
    for (let i = 0; i < 3; i++) {
        const random = Math.floor(Math.random() * 8);
        write(num.toString()[0] + num.toString()[1] + random.toString() + "\n");
        await wait(500)
    }
    write(num.toString() + "\n", "lime");
    const str = num.toString();
    const a = str[0];
    const b = str[1];
    const c = str[2];

    if (a === b && b === c) {
        write("JACKPOT!\n", "lime");
        tokens += 1400;
    } else if (a === b || b === c || a === c) {
        write("FORTUNE!\n", "lime");
        tokens += 15;
    } else if (Number(b) === Number(a) + 1 && Number(c) === Number(b) + 1) {
        write("FORTUNE!!!!\n", "lime");
        tokens += 1000;
    }
    saveData("tokens", tokens);
    await wait(3000);
}

let data = loadData();
let tokens = data[0];
let money = data[1];

async function main() {
    clear();
    write("*****************\n");
    write("*     womki     *\n");
    write("*****************\n");

    write("Tokens: " + tokens + "\n");

    write("1. Double Down\n");
    write("2. Roulette\n");
    write("3. Leave\n");
    write("4. Buy tokens\n");
    write("5. Cashout\n");
    write("6. Slot Machine (1 token) \n");
    const handler = async (e) => {
        if (e.key.length === 1 && "123456".includes(e.key)) {
            document.removeEventListener("keydown", handler);
            write("\n");

            switch (e.key) {
                case "1":
                    await DoubleDown();
                    main();
                    break;
                case "2":
                    await Roulette();
                    main();
                    break;
                case "3":
                    await exitwomki();
                    return;
                case "4":
                    await BuyTokens();
                    main();
                    return;
                case "5":
                    await Cashout();
                    main();
                    return;
                case "6":
                    await Slot();
                    main();
                    return;
            }
        } else {
            main();
        }
    };

    document.addEventListener("keydown", handler, {
        once: true
    });
}

async function exitwomki() {
    if (window.sap.playing) {
        window.sap.stop = true;
        while (window.sap.stop == true) {
            await wait(100);
        }
    }
    window.shell.inputMode = "command";
    saveFS1();
    clear();
    prompt();
    return 0;
}
window.shell.inputMode = "womki"
sap.playsap("/usr/local/womki/music")
main();