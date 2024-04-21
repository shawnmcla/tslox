import { Interpreter, Lobj } from "./Interpreter";

export interface LoxCallable {
    __lox_callable: boolean;
    get arity(): number;
    call(interpreter: Interpreter, args: Lobj[]): Lobj;
}

