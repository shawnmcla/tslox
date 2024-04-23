import { Lox } from "./Lox";

export interface LoxIO {
    write(text: string): void;
    writeError(text: string): void;
    writeWarning(text: string): void;

    registerLoxInstance(lox: Lox): void;
}