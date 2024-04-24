import { Lobj } from "./Interpreter";
import { LoxClass } from "./LoxClass";
import { LoxNativeFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";

const array_len = (thisArray: LoxArray) => thisArray?.innerArray?.length ?? 0;
const array_pop = (thisArray: LoxArray) => thisArray?.innerArray?.pop();
const arrayClass = new LoxClass(
    "Array", 
    undefined, 
    new Map([
        ["len", new LoxNativeFunction(array_len)],
        ["pop", new LoxNativeFunction(array_pop)]
    ]
));

export class LoxArray extends LoxInstance {
    constructor(public innerArray: Lobj[] = []) { super(arrayClass); }

    toString(): string {
        return `Array(${this.innerArray.length})`;
    }
}