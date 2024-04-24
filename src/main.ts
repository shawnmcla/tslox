import { samples } from "./samples";
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import javascript from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('javascript', javascript);

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

const domSamples = document?.querySelector(".samples");
const domSamplesSelect = domSamples?.querySelector("select");
const domSamplesButton = domSamples?.querySelector("button");

let option: HTMLOptionElement | undefined;
for (const sample in samples) {
  option = document.createElement("option");
  option.value = sample;
  option.textContent = sample;
  domSamplesSelect?.append(option);
}

if (option) {
  domSamplesSelect.value = option.value;
}

const domConsole = document?.querySelector(".console");
const domOutput = domConsole?.querySelector(".output");
const domInput = domConsole?.querySelector("#input");

domSamplesButton?.addEventListener("click", (e) => {
  const sample = domSamplesSelect?.value;
  if (sample && sample !== "") {
    console.info("Loading sample: " + sample);
    const sampleText = samples[sample];
    domInput.value = sampleText;
  }
});

domOutput?.addEventListener("click", (e) => {
  let closest = e.target.closest('.input');
  if (closest) {
    const restoreText = closest.innerText;
    domInput.value = restoreText;
  }
});

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
      addCodeToOutput(input);
      worker.postMessage({ type: "run", script: input });
    }
    (e.target as HTMLInputElement).value = "";
  }
});

function addCodeToOutput(source: string) {
  const pre = document.createElement("pre");
  pre.innerHTML = hljs.highlight("javascript", source).value;
  pre.classList.add('input');
  domOutput?.append(pre);
}

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