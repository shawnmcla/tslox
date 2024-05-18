import { Chunk, OpCode } from "./bytecode";

export function print(str: any) {
    str = str?.toString() ?? "";
    if (process?.stdout?.write(str)) return;
    console.log(str);
}

export function padLeft(str: any, width: number, char: string = " ") {
    const _str = str?.toString() ?? "";
    const padding = width - _str.length;
    if (padding > 0) return str + char.repeat(padding);
    return str;
}

export function padRight(str: any, width: number, char: string = " ") {
    const _str = str?.toString() ?? "";
    const padding = width - _str.length;
    if (padding > 0) return char.repeat(padding) + str;
    return str;
}

export class Debug {
    static simpleInstruction(name: string, offset: number): number {
        print(name + "\n");
        return offset + 1;
    }

    static constantInstruction(name: string, chunk: Chunk, offset: number): number {
        const constant = chunk.code[offset + 1];
        print(`${padLeft(name, 16)}${padRight(constant, 4)} `);
        print(chunk.constants[constant]);
        print("\n");
        return offset + 2;
    }

    static disassembleInstruction(chunk: Chunk, offset: number): number {
        print(padLeft(offset, 4, "0"));

        if (offset > 0 && chunk.lines[offset] === chunk.lines[offset - 1]) {
            print("    | ");
        } else {
            print(padRight(chunk.lines[offset], 5) + " ");
        }

        const instruction = chunk.code[offset];
        switch (instruction) {
            case OpCode.CONSTANT:
                return Debug.constantInstruction("CONSTANT", chunk, offset);
            case OpCode.ADD:
                return this.simpleInstruction("ADD", offset);
            case OpCode.SUBTRACT:
                return this.simpleInstruction("SUBTRACT", offset);
            case OpCode.MULTIPLY:
                return this.simpleInstruction("MULTIPLY", offset);
            case OpCode.DIVIDE:
                return this.simpleInstruction("DIVIDE", offset);
            case OpCode.NEGATE:
                return Debug.simpleInstruction("NEGATE", offset);
            case OpCode.RETURN:
                return Debug.simpleInstruction("RETURN", offset);
            default:
                print(`Unknown opcode ${instruction}`);
                return offset + 1;
        }
    }

    static disassembleChunk(chunk: Chunk, name: string): void {
        print(`== ${name} ==\n`);
        for (let offset = 0; offset < chunk.length;) {
            offset = Debug.disassembleInstruction(chunk, offset);
        }
    }
}
