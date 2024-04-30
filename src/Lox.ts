import { Token, TokenType } from "./Ast";
import { RuntimeError } from "./Errors";
import { Interpreter } from "./Interpreter";
import { LoxIO } from "./LoxIO";
import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { Scanner } from "./Scanner";

export class Lox {
    private interpreter = new Interpreter(this, true);
    private io: LoxIO;
    private flags: Map<string, string> = new Map();

    hadError = false;
    hadRuntimeError = false;

    constructor(io?: LoxIO){
        if(io){
            this.io = io;
            io.registerLoxInstance(this);
        }
        else {
            this.io = {
                write: console.log,
                writeError: console.error,
                writeWarning: console.warn,
                registerLoxInstance: () => {}
            };
        }
    }
    
    public setFlag(flag: string, value: string) {
        this.flags.set(flag, value);
    }

    public getFlag(flag: string): string {
        return this.flags.get(flag) ?? "";
    }

    public print(text: string, prefix = "") {
        this.io.write(prefix + text);
    }

    private reportError(line: number, where: string, message: string): void {
        const text = `[line ${line}] Error ${where}: ${message}`;
        console.error(text);
        this.io.writeError(text);
    }

    private reportWarning(line: number, where: string, message: string): void {
        const text = `[line ${line}] Warning ${where}: ${message}`;
        console.warn(text);
        this.io.writeWarning(text);
    }

    runtimeError(error: RuntimeError) {
        const text = `${error.message}\n[line ${error.token.line}]`;
        this.hadRuntimeError = true;
        console.error(text);
        this.io.writeError(text);
    }

    warn(line: number, message: string): void
    warn(token: Token, message: string): void
    warn(lineOrToken: number | Token, message: string): void {
        if (typeof lineOrToken === "number") {
            this.reportWarning(lineOrToken, "", message);
            return;
        }
        if (lineOrToken.type === TokenType.EOF) {
            this.reportWarning(lineOrToken.line, "at end", message);
        } else {
            this.reportWarning(lineOrToken.line, `at '${lineOrToken.lexeme}'`, message);
        }
    }

    error(line: number, message: string): void
    error(token: Token, message: string): void
    error(lineOrToken: number | Token, message: string): void {
        this.hadError = true;
        if (typeof lineOrToken === "number") {
            this.reportError(lineOrToken, "", message);
            return;
        }
        if (lineOrToken.type === TokenType.EOF) {
            this.reportError(lineOrToken.line, "at end", message);
        } else {
            this.reportError(lineOrToken.line, `at '${lineOrToken.lexeme}'`, message);
        }
    }

    runRepl(source: string): void {
        this.run(source);
        this.hadError = false;
    }

    run(source: string): void {
        const printTokens = this.getFlag("print-tokens") === "1";
        
        const scanner = new Scanner(this, source);
        
        const tokens = scanner.scanTokens();
        if(printTokens) {
            this.io.write(tokens.join('  '));
        }

        const parser = new Parser(this, tokens);

        const statements = parser.parse();
        if(this.hadError || !statements) return;

        const resolver = new Resolver(this.interpreter, this);
        resolver.resolveStatements(statements);
        if(this.hadError) return;

        this.interpreter.interpret(statements);
    }
}
