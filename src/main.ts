// import { samples } from "./Lox/samples";
// import hljs from 'highlight.js';
// import 'highlight.js/styles/github-dark.css';
// import javascript from 'highlight.js/lib/languages/javascript';
// hljs.registerLanguage('javascript', javascript);

import { doLang } from "./static/lang";

// import { bytecode } from "./Lox/bytecode/bytecode";

// let worker: Worker | undefined;
// function reset() {
//     worker?.terminate();
//     worker = new Worker(new URL("./Lox/LoxWorker.ts", import.meta.url).href, { type: "module" });
//     worker.onmessage = (e) => {
//         console.debug("Main:: Received message", e.data);
//         const { type } = e.data;
//         switch (type) {
//             case "write":
//                 write(e.data.text);
//                 break;
//             case "write-err":
//                 writeError(e.data.text);
//                 break;
//             case "write-warn":
//                 writeWarning(e.data.text);
//                 break;
//             default:
//                 console.warn("Main:: Unhandled message type", e.data);
//                 break;
//         }
//     }
// }

// function setFlag(flag?: string, value?: string) {
//     worker.postMessage({ type: "set", flag: flag ?? "", value: value ?? "" });
// }

// reset();

// const domSamples = document?.querySelector(".samples");
// const domSamplesSelect = domSamples?.querySelector("select");
// const domSamplesButton = domSamples?.querySelector("button");

// let option: HTMLOptionElement | undefined;
// for (const sample in samples) {
//     option = document.createElement("option");
//     option.value = sample;
//     option.textContent = sample;
//     domSamplesSelect?.append(option);
// }

// const domConsole = document?.querySelector(".console");
// const domOutput = domConsole?.querySelector(".output");
// const domInput = domConsole?.querySelector("#input");

// domSamplesButton?.addEventListener("click", (e) => {
//     const sample = domSamplesSelect?.value;
//     if (sample && sample !== "") {
//         console.info("Loading sample: " + sample);
//         const sampleText = samples[sample];
//         domInput.value = sampleText;
//     }
// });

// if (option) {
//     domSamplesSelect.value = option.value;
//     domSamplesButton?.click();
// }

// domOutput?.addEventListener("click", (e) => {
//     let closest = e.target.closest('.input');
//     if (closest) {
//         const restoreText = closest.innerText;
//         domInput.value = restoreText;
//     }
// });

// function fixInput(input: string): string {
//     input = input.trim();
//     // If we have more than one source line, do nothing
//     if (input.split('\n').length > 1) return input;

//     // If it already ends with a semicolon or with a curly brace, do nothing
//     const lastChar = input[input.length - 1];
//     if (lastChar === '}' || lastChar === ';') return input;

//     // Else, add a semicolon
//     return input + ';';
// }

// domInput?.addEventListener("keydown", (e) => {
//     if (e.key == "Enter" && !e.shiftKey) {
//         e.preventDefault();
//         let input = (e.target as HTMLInputElement).value ?? "";
//         if (input.startsWith("#")) {
//             let inputs = input.split(" ");
//             switch (inputs[0]) {
//                 case "#reset":
//                     reset();
//                     break;
//                 case "#set":
//                     setFlag(inputs[1], inputs[2]);
//                     break;
//             }
//         } else {
//             addCodeToOutput(input);
//             // REPL Only:
//             // If there is only one source line and it doesn't end with an expected terminator (closing brace, semicolon, etc)
//             // Then we insert a semicolon for the user. This allows typing expressions directly without needing a semicolon for better UX
//             // Of course, this isn't perfect and allows weird things like '{}5+2' but that's OK. It's just a REPL :-)
//             worker.postMessage({ type: "run", script: fixInput(input) });
//         }
//         (e.target as HTMLInputElement).value = "";
//     }
// });

// function addCodeToOutput(source: string) {
//     const pre = document.createElement("pre");
//     pre.innerHTML = hljs.highlight("javascript", source).value;
//     pre.classList.add('input');
//     domOutput?.append(pre);
// }

// function addStdoutLine(text: string, className?: string) {
//     const pre = document.createElement("pre");
//     pre.innerText = text;
//     if (className) pre.classList.add(className);
//     domOutput?.append(pre);
// }

// function write(text: string) {
//     addStdoutLine(text);
// }

// function writeError(text: string) {
//     addStdoutLine(text, "error");
// }

// function writeWarning(text: string) {
//     addStdoutLine(text, "warn");
// }

// console.log(domConsole);

// //bytecode();

doLang();