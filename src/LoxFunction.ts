import { FunctionExpr, FunctionStmt } from "./Ast";
import { Environment } from "./Environment";
import { Return } from "./Errors";
import { Interpreter, Lobj } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";
import { LoxInstance } from "./LoxInstance";

export abstract class LoxFunctionLike implements LoxCallable {
    public readonly __lox_callable: boolean = true;
    abstract get arity(): number;
    abstract call(interpreter: Interpreter, args: any[]): Lobj;
    abstract boundTo(instance: LoxInstance): LoxFunctionLike;
    toString(): string {
        return `<fn>`;
    }
}

export class LoxNativeFunction extends LoxFunctionLike {
    public thisValue: LoxInstance | undefined;
    constructor(private jsFunction: Function) { super(); }

    get arity(): number {
        let count = this.jsFunction.length - 1;
        if(count < 0) return 0;
        // Remove the 'thisValue' from the total
        return count;
    }

    call(_: Interpreter, args: any[]) {
        return this.jsFunction(this.thisValue, ...args);
    }

    boundTo(instance: LoxInstance): LoxFunctionLike {
        const boundFn = new LoxNativeFunction(this.jsFunction);
        boundFn.thisValue = instance;
        return boundFn;
    }
}

export class LoxFunction extends LoxFunctionLike {
    public readonly __lox_callable = true;

    constructor(private declaration: FunctionStmt | FunctionExpr, private closure: Environment, private isInitializer: boolean, public isGetter: boolean = false) { super(); }

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
        return new LoxFunction(this.declaration, environment, this.isInitializer, this.isGetter);
    }

    toString(): string {
        if(this.declaration instanceof FunctionStmt) {
            return `<${this.isGetter ? "getter" : "fn"} ${this.declaration.name.lexeme}>`;
        } else {
            return `<fn>`;
        }
    }
}
