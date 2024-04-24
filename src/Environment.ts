import { Token } from "./Ast";
import { RuntimeError } from "./Errors";
import { $_LOX_CONST } from "./Internals";
import { Lobj } from "./Interpreter";

class BoxedValue {
    [$_LOX_CONST]: boolean;
    constructor(public innerValue: Lobj, isConst: boolean = false) { 
        this[$_LOX_CONST] = isConst;
    }
}

export class Environment {
    private readonly values: Map<string, BoxedValue> = new Map();

    constructor(public enclosing?: Environment) {}

    define(name: string, value: Lobj, isConst: boolean = false): void {
        this.values.set(name, this.box(value, isConst));
        console.log(this.values);
    }

    unbox(value: BoxedValue): Lobj {
        return value.innerValue;    
    }

    box(value: Lobj, isConst: boolean = false): BoxedValue {
        return new BoxedValue(value, isConst);
    }

    _get(name: Token): Lobj {
        if(this.values.has(name.lexeme)) {
            return this.values.get(name.lexeme);
        }
        if (this.enclosing != null) {
            return this.enclosing.get(name);
        }
        throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
    }

    get(name: Token): Lobj {
        return this.unbox(this._get(name));
    }

    getAt(distance: number, name: string): any {
        return this.unbox(this.ancestor(distance).values.get(name)!);
    }

    ancestor(distance: number): Environment {
        let env: Environment = this;
        for(let i = 0; i < distance; i++) {
            // Resolver pass ensures this is not null
            env = env.enclosing!;
        }
        return env;
    }

    assign(name: Token, value: any): void {
        if(this.values.has(name.lexeme)) {
            const boxed = this.values.get(name.lexeme)!;
            if(boxed[$_LOX_CONST]) {
                throw new RuntimeError(name, `Cannot reassign const variable '${name.lexeme}'`);
            }
            boxed.innerValue = value;
            return;
        }

        if(this.enclosing) {
            this.enclosing.assign(name, value);
            return;
        }
        
        throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`)
    }

    assignAt(distance: number, name: Token, value: Lobj): void {
        const boxed = this.ancestor(distance).values.get(name.lexeme)!;
        if(boxed[$_LOX_CONST]) {
            throw new RuntimeError(name, `Cannot reassign const variable '${name.lexeme}'`);
        }
        boxed.innerValue = value;
    }
}