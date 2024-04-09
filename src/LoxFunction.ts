import { FunctionStmt } from "./Ast";
import { Environment } from "./Environment";
import { Return } from "./Errors";
import { Interpreter, Lobj } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";


export class LoxFunction implements LoxCallable {
    public readonly __lox_callable = true;
    
    constructor(private declaration: FunctionStmt, private closure: Environment) { }

    get arity(): number {
        return this.declaration.params.length;
    }

    call(interpreter: Interpreter, args: Lobj[]) {
        const environment = new Environment(this.closure);
        for (let i = 0; i < this.declaration.params.length; i++) {
            environment.define(this.declaration.params[i].lexeme, args[i]);
        }

        try {
            interpreter.executeBlock(this.declaration.body, environment);
        } catch (e) {
            if (e instanceof Return) {
                return e.value;
            }
            else throw e;
        }
        return null;
    }

    toString(): string {
        return `<fn ${this.declaration.name.lexeme}>`;
    }
}
