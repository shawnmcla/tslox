import { FunctionStmt } from "./Ast";
import { Environment } from "./Environment";
import { Return } from "./Errors";
import { Interpreter, Lobj } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";
import { LoxInstance } from "./LoxInstance";


export class LoxFunction implements LoxCallable {
    public readonly __lox_callable = true;

    constructor(private declaration: FunctionStmt, private closure: Environment, private isInitializer: boolean) { }

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
                // Special case for init() methods/constructors; always return 'this'
                if (this.isInitializer) return this.closure.getAt(0, "this")
                return e.value;
            }
            else throw e;
        }

        // Special case for init() methods/constructors; always return 'this'
        if (this.isInitializer) return this.closure.getAt(0, "this");

        return null;
    }

    boundTo(instance: LoxInstance): LoxFunction {
        const environment = new Environment(this.closure);
        environment.define("this", instance);
        return new LoxFunction(this.declaration, environment, this.isInitializer);
    }

    toString(): string {
        return `<fn ${this.declaration.name.lexeme}>`;
    }
}
