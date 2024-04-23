import { Token, TokenType } from "./Ast";
import { RuntimeError } from "./Errors";
import { Interpreter } from "./Interpreter";
import { LoxIO } from "./LoxIO";
import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { Scanner } from "./Scanner";

export class Lox {
    private interpreter = new Interpreter(this);
    private io: LoxIO;

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
    
    public print(text: string, prefix = "> ") {
        this.io.write(prefix + text);
    }

    private report(line: number, where: string, message: string): void {
        const text = `[line ${line}] Error ${where}: ${message}`;
        console.error(text);
        this.io.writeError(text);
    }

    runtimeError(error: RuntimeError) {
        const text = `${error.message}\n[line ${error.token.line}]`;
        this.hadRuntimeError = true;
        console.error(text);
        this.io.writeError(text);
    }

    error(line: number, message: string): void
    error(token: Token, message: string): void
    error(lineOrToken: number | Token, message: string): void {
        this.hadError = true;
        if (typeof lineOrToken === "number") {
            this.report(lineOrToken, "", message);
            return;
        }
        if (lineOrToken.type === TokenType.EOF) {
            this.report(lineOrToken.line, "at end", message);
        } else {
            this.report(lineOrToken.line, `at '${lineOrToken.lexeme}'`, message);
        }
    }

    runRepl(source: string): void {
        this.print(source, "");
        this.run(source, true);
        this.hadError = false;
    }

    run(source: string, isRepl: boolean = false): void {
        const scanner = new Scanner(source);
        const tokens = scanner.scanTokens();
        const parser = new Parser(tokens);

        const statements = parser.parse();
        if(this.hadError || !statements) return;

        const resolver = new Resolver(this.interpreter);
        resolver.resolveStatements(statements);
        if(this.hadError) return;

        this.interpreter.interpret(statements, isRepl);
    }
}
