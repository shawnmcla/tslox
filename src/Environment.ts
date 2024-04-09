import { Token } from "./Ast";
import { RuntimeError } from "./Errors";
import { Lobj } from "./Interpreter";

export class Environment {
    private readonly values: Map<string, Lobj> = new Map();

    constructor(public enclosing?: Environment) {}

    define(name: string, value: Lobj): void {
        this.values.set(name, value);
    }

    get(name: Token): Lobj {
        if(this.values.has(name.lexeme)) return this.values.get(name.lexeme);

        if (this.enclosing != null) return this.enclosing.get(name);

        throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
    }

    assign(name: any, value: any): void {
        if(this.values.has(name.lexeme)) {
            console.debug("ASSIGN", name, value);
            this.values.set(name.lexeme, value);
            return;
        }

        if(this.enclosing) {
            this.enclosing.assign(name, value);
            return;
        }
        
        throw new RuntimeError(name, `Undefined variable '${name.lexeme}.'`)
    }
}