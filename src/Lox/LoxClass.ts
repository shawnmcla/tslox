import { Interpreter } from "./Interpreter";
import { LoxCallable } from "./LoxCallable";
import { LoxFunctionLike } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";

//const LoxMetaClass = { findMethod(name: string): LoxFunction | undefined { return; } };

export class LoxClass implements LoxCallable {
    public readonly __lox_callable = true;

    constructor(public name: string, public superclass: LoxClass | undefined, private methods: Map<string, LoxFunctionLike>) {
        // const meta = {
        //     findMethod(name: string): LoxFunction | undefined { return; },
        //     methods: new Map()
        // };
        
        //super(meta as LoxClass);
        //if (staticMethods)
    }

    get arity(): number {
        const initializer = this.findMethod("init");
        return initializer?.arity ?? 0;
    }

    call(interpreter: Interpreter, args: any[]) {
        const instance = new LoxInstance(this);

        // If we have an init (constructor) method defined on this class
        // We call it upon initialization
        const initializer = this.findMethod("init");
        if (initializer) {
            initializer.boundTo(instance).call(interpreter, args);
        }

        return instance;
    }

    findMethod(name: string): LoxFunctionLike | undefined {
        if (this.methods.has(name)) {
            return this.methods.get(name);
        }

        if(this.superclass) {
            return this.superclass.findMethod(name);
        }
    }

    toString(): string {
        return this.name;
    }
}