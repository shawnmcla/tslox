import { Debug, print } from "./Debug";
import { ErrorToken, Parser, Scanner, Tok, Token } from "./Parser";

export enum OpCode {
    CONSTANT,
    ADD,
    SUBTRACT,
    MULTIPLY,
    DIVIDE,
    NEGATE,
    RETURN,
}

export enum InterpretResult {
    Ok,
    CompileError,
    RuntimeError,
}

export class Vm {
    public chunk: Chunk = new Chunk();
    public ip = 0;

    public stack: number[] = [];
    public sp = 0;

    public trace = true;

    public parser = new Parser("")
    
    push(value: number) {
        this.stack[this.sp++] = value;
    }

    pop(): number {
        return this.stack[--this.sp];
    }

    readByte(): number {
        return this.chunk.code[this.ip++];
    }

    interpret(source: string): InterpretResult {
        const chunk = new Chunk();
       
        if(!this.compile(source, chunk)) {
            return InterpretResult.CompileError;
        }

        this.chunk = chunk;
        this.ip = 0;
        return this.run();
    }

    compile(source: string, chunk: Chunk) {
        this.parser = new Parser(source);

        this.parser.advance();
        this.parser.expression();
        this.parser.consume(Tok.EOF, "Expect end of expression.");
    }
    
    readConstant(): number {
        return this.chunk.constants[this.readByte()];
    }

    binary(op: OpCode) {
        const b = this.pop();
        const a = this.pop();
        switch(op) {
            case OpCode.ADD: this.push(a+b); break;
            case OpCode.SUBTRACT: this.push(a-b); break;
            case OpCode.MULTIPLY: this.push(a*b); break;
            case OpCode.DIVIDE: this.push(a/b); break;
        }
    }

    run(): InterpretResult {
        for (; ;) {
            let instruction: OpCode;
            if (this.trace) {
                Debug.disassembleInstruction(this.chunk, this.ip);
                print(" stack: ");
                for (let i = 0; i < this.sp; i++) {
                    print(`[${this.stack[i]}]`);
                }
                print("\n");
            }
            switch (instruction = this.readByte()) {
                case OpCode.CONSTANT:
                    const constant = this.readConstant();
                    this.push(constant);
                    break;
                case OpCode.ADD:
                    this.binary(instruction)
                    break;
                case OpCode.SUBTRACT:
                    this.binary(instruction);
                    break;
                case OpCode.MULTIPLY:
                    this.binary(instruction);
                    break;
                case OpCode.DIVIDE:
                    this.binary(instruction);
                    break;
                case OpCode.NEGATE:
                    this.push(-this.pop());
                    break;
                case OpCode.RETURN:
                    print(this.pop());
                    print("\n");
                    return InterpretResult.Ok;
            }
        }
    }
}

export class Chunk {
    public constants: number[] = [];
    public lines: number[] = [];
    public code: number[] = []
    constructor() { }

    get length() {
        return this.code.length;
    }

    write(byte: number, line: number) {
        this.code.push(byte);
        this.lines.push(line);
    }

    addConstant(value: number): number {
        this.constants.push(value);
        return this.constants.length - 1;
    }
}

export function bytecode() {
    const src = `var drink = "Tea";
    var steep = 4;
    var cool = 2;`;

    const scanner = new Scanner(src);
    let tok: Token;
    const tokens: Token[] = [];
    do {
        tok = scanner.scanToken();
        tokens.push(tok);
    } while(tok.type !== Tok.EOF);

    console.log("TOKENS", tokens.map(t => `${Tok[t.type]}(${(t instanceof ErrorToken ? t.message : "")})`));
    return;

    const chunk = new Chunk();

    let constant = chunk.addConstant(1.2);
    chunk.write(OpCode.CONSTANT, 123);
    chunk.write(constant, 123);

    constant = chunk.addConstant(3.4);
    chunk.write(OpCode.CONSTANT, 123);
    chunk.write(constant, 123);

    chunk.write(OpCode.ADD, 123);

    constant = chunk.addConstant(5.6);
    chunk.write(OpCode.CONSTANT, 123);
    chunk.write(constant, 123);

    chunk.write(OpCode.DIVIDE, 123);
    chunk.write(OpCode.NEGATE, 123);

    chunk.write(OpCode.RETURN, 123);


    const vm = new Vm();
    vm.interpret(chunk);
}

bytecode();
console.log("");


