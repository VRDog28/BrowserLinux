let options = [];
let values = {};

function detectargs() {
    let newArgs = [];

    for (let i = 0; i < shell.args.length; i++) {
        let item = shell.args[i];

        if (item.startsWith("-") && item.length > 1) {
            let key = item.slice(1);
            let next = shell.args[i + 1];

            if (next && !next.startsWith("-")) {
                values[key] = next;
                newArgs.push(next);

                i++;
            } else {
                values[key] = true;
            }
            options.push(...key.split(""));
        } else {
            newArgs.push(item);
        }
    }
    shell.args = newArgs;
}
detectargs();

const url = shell.args[0];

const followRedirects = options.includes("L");
const failSilently = options.includes("f");
const saveToFile = options.includes("O");

if (!url) {
  write("curl: missing operand");
  return 1;
} else {
  let finalUrl = url;

  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = "https://" + finalUrl;
  }

  await fetch(finalUrl)
    .then(async res => {
      if (!res.ok) {
        if (failSilently) return null;
        write(`curl: (${res.status}) ${res.statusText}`);
        return null;
      }

      const data = await res.text();
      if (saveToFile) {
        let filename = finalUrl.split("/").pop() || "index.html";
        filename = filename.split("?")[0];

        const path = window.shell.cwd.endsWith("/")
          ? window.shell.cwd + filename
          : window.shell.cwd + "/" + filename;

        window.fs.files[path] = data;
      }
      if (!saveToFile) await write(data);
      return null;
    })
    .catch(() => {
      if (!failSilently) {
        write("curl: failed to fetch");
      }
    });
}