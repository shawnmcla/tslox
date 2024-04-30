function print(str: string) {
    console.log(str);
}

export enum OpCode {
    RETURN,
}

export class Debug {
    static simpleInstruction(name: string, offset: number): number {
        print(name);
        return offset + 1;
    }

    static disassembleInstruction(chunk: Chunk, offset: number): number {
        const instruction = chunk.code[offset];
        switch(instruction) {
            case OpCode.RETURN:
                return Debug.simpleInstruction("RETURN", offset);
            default:
                print(`Unknown opcode ${instruction}`);
                return offset + 1;
        }
    }

    static disassembleChunk(chunk: Chunk, name: string):void {
        print(`== ${name} ==`);
        for(let offset = 0; offset < chunk.length;) {
            offset = Debug.disassembleInstruction(chunk, offset);
        }
    }
}
export class Chunk {
    constructor(public code: number[] = []) { }

    get length() {
        return this.code.length;
    }

    write(byte: number){
        this.code.push(byte);
    }
}

export function bytecode() {
    console.log("Bytecode");
    const chunk = new Chunk([0,0,0,0]);
    Debug.disassembleChunk(chunk, "Test");
}