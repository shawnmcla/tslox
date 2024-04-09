import { Interpreter, Lobj } from "./Interpreter";

export interface LoxCallable {
    get arity(): number;
    call(interpreter: Interpreter, args: Lobj[]): Lobj;
}

