import { Token } from "./Ast";
import { RuntimeError } from "./Errors";
import { Lobj } from "./Interpreter";
import { LoxClass } from "./LoxClass";


export class LoxInstance {
    protected klass: LoxClass;
    private fields: Map<string, Lobj> = new Map();

    constructor(klass?: LoxClass) {
        // 'klass' is optional here because derived class LoxClass
        // cannot pass 'this' when calling 'super', so it gets set right after
        // This should never be undefined in any other cases.
        this.klass = klass!;
    }

    get(name: Token) {
        if (this.fields.has(name.lexeme)) {
            return this.fields.get(name.lexeme);
        }

        const method = this.klass.findMethod(name.lexeme);
        if (method) return method.boundTo(this);

        throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`)
    }

    set(name: Token, value: Lobj) {
        this.fields.set(name.lexeme, value);
    }

    toString(): string {
        return `${this.klass.name} instance`;
    }
}
