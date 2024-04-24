import { Lobj } from "./Interpreter";
import { LoxArray } from "./LoxArray";

const clock = () => Date.now() / 1000.0;
const string = (_, value: Lobj) => value?.toString() ?? "";
// ToDo: Error handling for invalid/missing size arg
const array = (_, size: number) => new LoxArray(new Array(+size | 0));

export const globalFunctions: Record<string, Function> = {
    clock,
    string,
    array
};