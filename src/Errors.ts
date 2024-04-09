import { Token } from "./Ast";
import { Lobj } from "./Interpreter";

export class LoxError extends Error { }
export class ParseError extends LoxError { }
export class RuntimeError extends LoxError { 
    constructor(public token: Token, message: string) {
        super(message);
    }
}
export class Return extends RuntimeError {
    constructor(public value: Lobj) {
        super(null!, null!);
    }
}
export class Break extends RuntimeError {
    constructor() { super(null!, null!); }
}
export class Continue extends RuntimeError {
    constructor() { super(null!, null!); }
}


