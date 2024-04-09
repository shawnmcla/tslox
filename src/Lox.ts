import { Token, TokenType } from "./Ast";
import { RuntimeError } from "./Errors";
import { Interpreter } from "./Interpreter";
import { Parser } from "./Parser";
import { Scanner } from "./Scanner";

const domConsole = document.querySelector(".console");
const domOutput = domConsole?.querySelector(".output");
const domInput = domConsole?.querySelector("input");

domInput?.addEventListener("keydown", (e) => {
    if(e.key == "Enter") {
        e.preventDefault();
        const input = (e.target as HTMLInputElement).value ?? "";
        Lox.runRepl(input);
        (e.target as HTMLInputElement).value = "";
    }
});

function addStdoutLine(text: string, className?: string) {
    const pre = document.createElement("pre");
    pre.innerText = text;
    if(className) pre.classList.add(className);
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

window.write = write;
window.error = writeError;
window.warn = writeWarning;

console.log(domConsole);
export class Lox {
    private static interpreter = new Interpreter();
    static hadError = false;
    static hadRuntimeError = false;

    public static print(text: string, prefix = "> ") {
        write(prefix + text);
    }

    private static report(line: number, where: string, message: string): void {
        const text = `[line ${line}] Error ${where}: ${message}`;
        console.error(text);
        writeError(text);
    }

    static runtimeError(error: RuntimeError) {
        const text = `${error.message}\n[line ${error.token.line}]`;
        Lox.hadRuntimeError = true;
        console.error(text);
        writeError(text);
    }

    static error(line: number, message: string): void
    static error(token: Token, message: string): void
    static error(lineOrToken: number | Token, message: string): void {
        Lox.hadError = true;
        if (typeof lineOrToken === "number") {
            Lox.report(lineOrToken, "", message);
            return;
        }
        if (lineOrToken.type === TokenType.EOF) {
            Lox.report(lineOrToken.line, "at end", message);
        } else {
            Lox.report(lineOrToken.line, `at '${lineOrToken.lexeme}'`, message);
        }
    }

    static runRepl(source: string): void {
        this.print(source, "");
        this.run(source, true);
        this.hadError = false;
    }

    static run(source: string, isRepl: boolean = false): void {
        const scanner = new Scanner(source);
        const tokens = scanner.scanTokens();
        const parser = new Parser(tokens);
        const statements = parser.parse();
        if(this.hadError || !statements) return;

        this.interpreter.interpret(statements, isRepl);
    }
}
