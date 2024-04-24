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

    getAt(distance: number, name: string): any {
        return this.ancestor(distance).values.get(name);
    }

    ancestor(distance: number): Environment {
        let env: Environment = this;
        for(let i = 0; i < distance; i++) {
            // Resolver pass ensures this is not null
            env = env.enclosing!;
        }
        return env;
    }

    assign(name: any, value: any): void {
        if(this.values.has(name.lexeme)) {
            this.values.set(name.lexeme, value);
            return;
        }

        if(this.enclosing) {
            this.enclosing.assign(name, value);
            return;
        }
        
        throw new RuntimeError(name, `Undefined variable '${name.lexeme}.'`)
    }

    assignAt(distance: number, name: Token, value: Lobj): void {
        this.ancestor(distance).values.set(name.lexeme, value);
    }
}