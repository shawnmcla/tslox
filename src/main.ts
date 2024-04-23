
const ss = `
var a = "global a";
var b = "global b";
var c = "global c";
{
  var a = "outer a";
  var b = "outer b";
  {
    var a = "inner a";
    print a;
    print b;
    print c;
  }
  print a;
  print b;
  print c;
}
print a;
print b;
print c;`

let worker: Worker | undefined;
function reset() {
  worker?.terminate();
  worker = new Worker(new URL("./LoxWorker.ts", import.meta.url).href, { type: "module" });
  worker.onmessage = (e) => {
    console.debug("Main:: Received message", e.data);
    const { type } = e.data;
    switch (type) {
      case "write":
        write(e.data.text);
        break;
      case "write-err":
        writeError(e.data.text);
        break;
      case "write-warn":
        writeWarning(e.data.text);
        break;
      default:
        console.warn("Main:: Unhandled message type", e.data);
        break;
    }
  }
}

reset();

const domConsole = document?.querySelector(".console");
const domOutput = domConsole?.querySelector(".output");
const domInput = domConsole?.querySelector("#input");

domInput?.addEventListener("keydown", (e) => {
  if (e.key == "Enter" && !e.shiftKey) {
    e.preventDefault();
    const input = (e.target as HTMLInputElement).value ?? "";
    if (input.startsWith("#")) {
      switch (input) {
        case "#reset":
          reset();
      }
    } else {
      worker.postMessage({ type: "run", script: input });
    }
    (e.target as HTMLInputElement).value = "";
  }
});

function addStdoutLine(text: string, className?: string) {
  const pre = document.createElement("pre");
  pre.innerText = text;
  if (className) pre.classList.add(className);
  domOutput?.append(pre);
}

function write(text: string) {
  addStdoutLine(text);
}

function writeError(text: string) {
  addStdoutLine(text, "error");
}

function writeWarning(text: string) {
  addStdoutLine(text, "warn");
}

console.log(domConsole);