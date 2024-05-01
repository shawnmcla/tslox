import { Interpreter, Lobj } from "./Interpreter";
import { LoxClass } from "./LoxClass";
import { LoxNativeFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";

const array_len = (thisArray: LoxArray) => thisArray?.innerArray?.length ?? 0;
const array_pop = (thisArray: LoxArray) => thisArray?.innerArray?.pop();
const array_push = (thisArray: LoxArray, value: Lobj) => thisArray?.innerArray.push(value);
const array_toString = (thisArray: LoxArray) => {
    if(thisArray.innerArray.length <= 10) {
        return `[${thisArray.innerArray.map(x => Interpreter.stringify(x)).join(', ')}]`
    } else {
        return `[${thisArray.innerArray.slice(0, 10).map(x => Interpreter.stringify(x)).join(', ')}...]`
    }
}
const arrayClass = new LoxClass(
    "Array", 
    undefined, 
    new Map([
        ["len", new LoxNativeFunction(array_len)],
        ["pop", new LoxNativeFunction(array_pop)],
        ["push", new LoxNativeFunction(array_push)],
        ["toString", new LoxNativeFunction(array_toString)]
    ]
));

export class LoxArray extends LoxInstance {
    constructor(public innerArray: Lobj[] = []) { super(arrayClass); }

    toString(): string {
        return `Array(${this.innerArray.length})`;
    }
}