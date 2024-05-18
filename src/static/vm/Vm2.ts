export enum Op {
    i32Const, // operand = i32
    f64Const, // operand = f64

    i32Arg, // operand = offset to SUBTRACT from BP
    f64Arg, // operand = offset to SUBTRACT from BP

    i32PushLocal, // operand = offset to ADD to BP
    f64PushLocal,
    i32PopLocal, // operand = offset to ADD to BP at which popped value will be written
    f64PopLocal,

    inc, // i32 -> i32
    dec,

    i32Add, // i32, i32 -> i32
    i32Sub,
    i32Mul,
    i32Div,

    f64Add, // f64, f64 -> f64
    f64Sub,
    f64Mul,
    f64Div,

    i32Equal, // i32, i32 -> i32
    i32LessThan,
    i32LessEq,
    i32GreaterThan,
    i32GreaterEq,

    f64Equal, // f64, f64 -> i32
    f64LessThan,
    f64LessEq,
    f64GreaterThan,
    f64GreaterEq,

    noop,
    pop, // operand = amount to subtract from BP

    call, // operand = Leftmost 16 bits = param size; rightmost 16 bits = target ip
    return, // operand = size of return value

    jump, // operand = offset from current ip
    jumpIf,

    jumpRel, // operand = offset from current ip
    jumpRelIf,

    stackAlloc, // i32

    print,

    dup,
    halt,
}

export class Instruction {
    constructor(public op: Op, public operand: number = 0) { }
    toString() {
        return `${Op[this.op]}(${this.operand})`;
    }
}

export class Frame {
    constructor(public returnAddr: number, public base: number) { }
}

export class Vm {
    public _stack: ArrayBuffer = new ArrayBuffer(4096);
    public stack: DataView = new DataView(this._stack);
    public halted: any = null;

    public traceMessage: string = "";
    public printTrace = true;

    public bp = 0;

    public ip = 0;
    public sp = 0;

    constructor(private program: Instruction[] = []) { }

    trace(text: any) {
        this.traceMessage += text;
    }

    traceLine(text: any) {
        this.traceMessage += text + "\n";
    }

    dumpStack(): string {
        const lines = [];

        lines.push(`|   Addr   |      i32      |       f64       |`);
        lines.push(`--------------------------------`);
        for (let i = 0; i < this.sp - 8; i += 4) {
            lines.push(`|0x${i.toString(16).padStart(8, '0')}|${this.i32Read(i).toString().padStart(15, ' ')}|${this.f64Read(i).toString().padStart(18, ' ')}`)
        }

        return lines.join('\n');
    }

    f64Write(offset: number, f64Value: number): void {
        this.stack.setFloat64(offset, f64Value, true);
    }

    f64Read(offset: number): number {
        return this.stack.getFloat64(offset, true);
    }

    f64Push(f64Value: number): void {
        this.f64Write(this.sp, f64Value);
        this.sp += 8;
    }

    f64Pop(): number {
        this.sp -= 8;
        const value = this.f64Read(this.sp);
        this.traceLine(`f64Pop: ${value}`);
        return value;
    }

    i32Write(offset: number, i32Value: number): void {
        this.stack.setInt32(offset, i32Value, true);
    }

    i32Read(offset: number): number {
        return this.stack.getInt32(offset, true);
    }

    i32Push(i32Value: number): void {
        this.i32Write(this.sp, i32Value);
        this.sp += 4;
    }

    i32Pop(): number {
        this.sp -= 4;
        const value = this.i32Read(this.sp);
        this.traceLine(`i32Read: ${value}`);
        return value;
    }

    stackAlloc(bytes: number): void {
        this.assertStackCapacity(this.sp + bytes);
        const view = new Uint8Array(this._stack);
        for(let i = 0; i < bytes; i++) {
            view[this.sp + i] = 0;
        }
        this.sp += bytes;
    }

    stackRead(offset: number, bytesToRead: number): ArrayBuffer {
        return this._stack.slice(offset, offset + bytesToRead);
    }

    stackWrite(offset: number, bytes: ArrayBuffer): void {
        const view = new Uint8Array(this._stack);
        const toCopyView = new Uint8Array(bytes);
        for (let i = 0; i < bytes.byteLength; i++) {
            view[offset + i] = toCopyView[i];
        }
    }

    assertIpValid(ip: number): void {
        if (ip < 0 || ip >= this.program.length) throw new Error("ILLEGAL INSTRUCTION ADDRESS");
    }

    assertStack(size: number): void {
        if (size > this.sp) throw new Error("STACK UNDERFLOW");
    }

    assertStackCapacity(size: number): void {
        if(size >= this._stack.byteLength) throw new Error("STACK OVERFLOW");
    }

    halt(code: any) {
        this.halted = code;
    }

    get isHalted() {
        return this.halted !== null;
    }

    step(): boolean {
        const I32_SIZE = 4;
        const F64_SIZE = 8;
        const CALL_TMP_SIZE = I32_SIZE * 3;

        const instruction = this.program[this.ip++];
        this.traceLine(`${instruction?.toString().padStart(16)}[ip=${this.ip - 1}, sp=${this.sp}, bp=${this.bp}]`);

        switch (instruction.op) {
            case Op.noop: {
                break;
            }

            case Op.pop: {
                const popBytes = instruction.operand;
                this.assertStack(popBytes);
                this.sp -= popBytes;
                break;
            }

            // constants
            case Op.i32Const: {
                const i32ConstValue = instruction.operand;
                this.i32Push(i32ConstValue);
                break;
            }
            case Op.f64Const: {
                const f64ConstValue = instruction.operand;
                this.f64Push(f64ConstValue);
                break;
            }

            // i32 arithmetic
            case Op.inc: {
                this.assertStack(1 * I32_SIZE);
                this.i32Push(this.i32Pop() + 1);
                break;
            }

            case Op.dec: {
                this.assertStack(1 * I32_SIZE);
                this.i32Push(this.i32Pop() - 1);
                break;
            }

            case Op.i32Add: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x + y);
                break;
            }
            case Op.i32Sub: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x - y);
                break;
            }
            case Op.i32Mul: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x * y);
                break;
            }
            case Op.i32Div: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x / y);
                break;
            }

            // i32 comparisons
            case Op.i32Equal: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x === y ? 1 : 0);
                break;
            }
            case Op.i32LessThan: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x < y ? 1 : 0);
                break;
            }
            case Op.i32LessEq: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x <= y ? 1 : 0);
                break;
            }
            case Op.i32GreaterThan: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x > y ? 1 : 0);
                break;
            }
            case Op.i32GreaterEq: {
                this.assertStack(2 * I32_SIZE);
                const y = this.i32Pop();
                const x = this.i32Pop();
                this.i32Push(x >= y ? 1 : 0);
                break;
            }

            // f64 arithmetic
            case Op.f64Add: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.f64Push(x + y);
                break;
            }
            case Op.f64Sub: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.f64Push(x - y);
                break;
            }
            case Op.f64Mul: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.f64Push(x * y);
                break;
            }
            case Op.f64Div: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.f64Push(x / y);
                break;
            }

            // f64 comparisons
            case Op.f64Equal: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.i32Push(x === y ? 1 : 0);
                break;
            }
            case Op.f64LessThan: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.i32Push(x < y ? 1 : 0);
                break;
            }
            case Op.f64LessEq: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.i32Push(x <= y ? 1 : 0);
                break;
            }
            case Op.f64GreaterThan: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.i32Push(x > y ? 1 : 0);
                break;
            }
            case Op.f64GreaterEq: {
                this.assertStack(2 * F64_SIZE);
                const y = this.f64Pop();
                const x = this.f64Pop();
                this.i32Push(x >= y ? 1 : 0);
                break;
            }

            // functions
            case Op.i32Arg: {
                const offset = instruction.operand;
                const value = this.i32Read(this.bp - CALL_TMP_SIZE - offset);
                this.traceLine("i32Arg = " + value);
                this.i32Push(value);
                break;
            }
            case Op.f64Arg: {
                const offset = instruction.operand;
                const value = this.f64Read(this.bp - CALL_TMP_SIZE - offset);
                this.f64Push(value);
                break;
            }
            case Op.i32PushLocal: {
                const offset = instruction.operand;
                const value = this.i32Read(this.bp + offset);
                this.traceLine("i32Local = " + value);
                this.i32Push(value);
                break;
            }
            case Op.f64PushLocal: {
                const offset = instruction.operand;
                const value = this.f64Read(this.bp + offset);
                this.f64Push(value);
                break;
            }
            case Op.i32PopLocal: {
                const offset = instruction.operand;
                this.assertStack(this.bp + offset + I32_SIZE);

                const value = this.i32Pop();
                this.traceLine("i32Local = " + value);
                this.i32Write(this.bp + offset, value);

                break;
            }
            case Op.f64PopLocal: {
                const offset = instruction.operand;
                this.assertStack(this.bp + offset + F64_SIZE);

                const value = this.f64Pop();
                this.f64Write(this.bp + offset, value);

                break;
            }
            case Op.call: {
                const target = instruction.operand & 0xFFFF;
                const paramsSize = instruction.operand >> 16;
                this.traceLine(`Call: Target=${target} | params size=${paramsSize}`);

                this.i32Push(paramsSize);
                this.i32Push(this.bp);
                this.i32Push(this.ip);

                this.ip = target;
                this.bp = this.sp;
                break;
            }

            case Op.return: {
                const size = instruction.operand;
                this.traceLine(`Return size: ${size}`);
                this.assertStack(this.sp - this.bp - size);
                let returnValue = 0;
                // TODO: Make this more generic and not necessarily typed
                if (size === 4) returnValue = this.i32Pop();
                else if (size === 8) returnValue = this.f64Pop();

                this.sp = this.bp;
                this.ip = this.i32Pop();
                this.bp = this.i32Pop();
                const paramsSize = this.i32Pop();
                this.sp -= paramsSize;

                if (size === 4) this.i32Push(returnValue);
                else if (size === 8) this.f64Push(returnValue);

                this.traceLine(`Return value: ${returnValue}`)
                break;
            }

            // TODO
            case Op.print: {
                this.assertStack(4);
                const value = this.i32Pop();
                console.log(">>> " + value);
                break;
            }

            case Op.dup: {
                const size = instruction.operand ?? 0;
                this.assertStack(size);
                const duped = this.stackRead(this.sp - size, size);
                this.stackWrite(this.sp, duped);
                this.sp += duped.byteLength;
                break;
            }

            // jumps
            case Op.jump: {
                const destination = instruction.operand;
                this.assertIpValid(destination);
                this.ip = destination;
                break;
            }
            case Op.jumpIf: {
                this.assertStack(I32_SIZE * 1);
                if (this.i32Pop() === 1) {
                    const destination = instruction.operand;
                    this.assertIpValid(destination);
                    this.ip = destination;
                }
                break;
            }
            case Op.jumpRel: {
                const destinationOffset = instruction.operand;
                this.assertIpValid(this.ip + destinationOffset);
                this.ip += destinationOffset;
                break;
            }
            case Op.jumpRelIf: {
                this.assertStack(I32_SIZE * 1);
                if (this.i32Pop() === 1) {
                    const destinationOffset = instruction.operand;
                    this.assertIpValid(this.ip + destinationOffset);
                    this.ip += destinationOffset;
                }
                break;
            }

            case Op.stackAlloc: {
                this.assertStack(I32_SIZE * 1);
                const size = this.i32Pop();
                this.stackAlloc(size);
                break;
            }

            case Op.halt:
                this.halt("OP_HALT");
                break;

            default:
                console.error("Vm:: Unrecognized op:", instruction.op);
        }

        if (this.ip >= this.program.length) this.halt("END");

        this.traceLine(`${' '.repeat(16)}[ip=${this.ip}, sp=${this.sp}, bp=${this.bp}]\n`);

        return !this.halted;
    }

    stepX(count: number): void {
        for (let i = 0; i < count; i++) {
            if (this.isHalted) return;
            this.step();
        }

        console.log("Trace:");
        console.log(this.traceMessage);
    }

    run(): void {
        if (!(this.ip < this.program.length)) return;
        while (!this.isHalted) {
            this.step();
        }
        console.log("Halted:", this.halted);
        if (this.printTrace) {
            console.log("Trace:");
            console.log(this.traceMessage);
        }
    }
}

class BInstruction extends Instruction {
    public needsResolve = false;
    public nameToResolve = "";

    constructor(op: Op, operand: any) {
        super(op, typeof operand === "number" ? operand : 0);
        if (typeof operand === "string") {
            this.needsResolve = true;
            this.nameToResolve = operand;
        }
    }
}

class Block {
    public instructions: BInstruction[] = [];
    constructor(public label: string) { }
}

export class ProgramBuilder {
    public blocks: Record<string, Block> = {};
    public toResolve: BInstruction[] = [];

    public current?: Block;
    constructor() { }

    beginBlock(name: string = "main"): void {
        if (this.current) {
            throw new Error("Already in a block");
        }
        if (this.blocks[name]) {
            throw new Error("Already specified block with name " + name);
        }

        this.blocks[name] = new Block(name);
        this.current = this.blocks[name];
    }

    endBlock(): void {
        this.current = undefined;
    }

    block(name: string, ...instructions: BInstruction[]) {
        this.beginBlock(name);
        this.current!.instructions = instructions;
        this.endBlock();
    }

    op(op: Op, operand: any = 0): BInstruction {
        return new BInstruction(op, operand);
    }

    add(op: Op, operand: any = 0): void {
        if (!this.current) return;
        const binst = new BInstruction(op, operand);
        this.current.instructions.push(binst);
        if (binst.needsResolve) this.toResolve.push(binst);
    }

    finish(): Instruction[] {
        const orderedBlocks: Block[] = [];
        orderedBlocks.push(this.blocks["main"]);
        for (const blockName in this.blocks) {
            if (blockName !== "main") orderedBlocks.push(this.blocks[blockName]);
        }

        const getOffsetToBlock = (blockName: string) => {
            let offset = 0;
            for (const b of orderedBlocks) {
                if (b.label === blockName) return offset;
                offset += b.instructions.length;
            }

            throw new Error("Could not find block " + blockName);
        }



        const p: Instruction[] = [];
        for (const blockName in this.blocks) {
            const block = this.blocks[blockName];
            for (const i of block.instructions) {
                if (i.needsResolve) {
                    i.operand = getOffsetToBlock(i.nameToResolve);
                }
            }
        }

        return orderedBlocks.map(b => b.instructions).flat();
    }
}

const pb = new ProgramBuilder();
// pb.beginBlock();
// pb.add(Op.loadConst, 420);
// pb.add(Op.loadConst, 69);
// pb.add(Op.call, "addThenDouble");
// pb.add(Op.print);
// pb.add(Op.halt);
// pb.endBlock();

// pb.beginBlock("double");
// pb.add(Op.loadConst, 2);
// pb.add(Op.i32Mul);
// pb.add(Op.return);
// pb.endBlock();

// pb.beginBlock("addThenDouble");
// pb.add(Op.i32Add);
// pb.add(Op.call, "double");
// pb.add(Op.return);
// pb.endBlock();

// pb.block("main",
//     pb.op(Op.loadConst, 420),
//     pb.op(Op.loadConst, 69),
//     pb.op(Op.call, "addThenDouble"),
//     pb.op(Op.print),
//     pb.op(Op.halt),
// );

// pb.block("double",
//     pb.op(Op.loadConst, 2),
//     pb.op(Op.i32Mul),
//     pb.op(Op.return),
// );
// pb.block("addThenDouble",
//     pb.op(Op.i32Add),
//     pb.op(Op.call, "double"),
//     pb.op(Op.return),
// );

// fib(n)
// if(n < 2) return 1
// return fib(n-2) + fib(n-1)

// pb.block("fib",
//     pb.op(Op.dup),
//     pb.op(Op.loadConst, 2),
//     pb.op(Op.i32LessThan),
//     pb.op(Op.jumpIf, "fib0"),

//     pb.op(Op.dup),
//     pb.op(Op.loadConst, 2),
//     pb.op(Op.i32Sub),
//     pb.op(Op.call, "fib"),

//     pb.op(Op.dup),
//     pb.op(Op.loadConst, 1),
//     pb.op(Op.i32Sub),
//     pb.op(Op.call, "fib"),

//     pb.op(Op.i32Add),
//     pb.op(Op.dup),
//     pb.op(Op.print),

//     pb.op(Op.return),
// );

// pb.block("fib0",
//     pb.op(Op.loadConst, 1),
//     pb.op(Op.return),
// );

// pb.block("main",
//     pb.op(Op.loadConst, 10),
//     pb.op(Op.call, "fib"),

//     pb.op(Op.print),
//     pb.op(Op.halt),
// )

// [
//     new Instruction(Op.loadConst, 420),
//     new Instruction(Op.loadConst, 69),
//     new Instruction(Op.call, 5),
//     new Instruction(Op.print),
//     new Instruction(Op.halt),

//     // --- addThenDouble
//     new Instruction(Op.i32Add),
//     new Instruction(Op.loadConst, 2),
//     new Instruction(Op.i32Mul),
//     new Instruction(Op.return),

// ])


// pb.block("main",
//     pb.op(Op.i32Const, 20),
//     pb.op(Op.i32Const, 10),
//     pb.op(Op.call, 4 | (8 << 16)),
//     pb.op(Op.halt, 0),
//     // addDouble
//     pb.op(Op.i32Arg, 8),
//     pb.op(Op.i32Arg, 4),
//     pb.op(Op.i32Add),
//     pb.op(Op.i32Const, 2),
//     pb.op(Op.i32Mul),
//     pb.op(Op.return, 4),
// );

const labelFib = 14;
const labelFib0 = 28;
const labelLoop = 1;

// pb.block("main", 
// pb.op(Op.i32Const, 0),
// pb.op(Op.inc),
// pb.op(Op.i32Local, 0),
// pb.op(Op.print),
// pb.op(Op.i32Local, 0),
// pb.op(Op.i32Const, 10),
// pb.op(Op.i32LessThan),
// pb.op(Op.jumpIf, 1),
// pb.op(Op.halt),
// );
pb.block("main",
    pb.op(Op.i32Const, 0),
    // loop:
    // Increment local(0)
    pb.op(Op.i32PushLocal, 0),
    pb.op(Op.inc),
    pb.op(Op.i32PopLocal, 0),

    pb.op(Op.i32PushLocal, 0),
    pb.op(Op.call, labelFib | (4 << 16)),
    pb.op(Op.print),

    // Chekc if local(0) < 15
    pb.op(Op.i32PushLocal, 0),
    pb.op(Op.i32Const, 1),
    pb.op(Op.i32LessThan),
    pb.op(Op.jumpIf, labelLoop),
    pb.op(Op.i32Const, 64),
    pb.op(Op.stackAlloc),
    pb.op(Op.halt, 0),
    // fib:
    //   if(n <= 2) return 1
    pb.op(Op.i32Arg, 4),
    pb.op(Op.i32Const, 2),
    pb.op(Op.i32LessEq),
    pb.op(Op.jumpIf, labelFib0), // tbd

    //   else return fib(n - 2) + fib(n - 1)
    pb.op(Op.i32Arg, 4),
    pb.op(Op.i32Const, 2),
    pb.op(Op.i32Sub),
    pb.op(Op.call, labelFib | (4 << 16)),

    pb.op(Op.i32Arg, 4),
    pb.op(Op.i32Const, 1),
    pb.op(Op.i32Sub),
    pb.op(Op.call, labelFib | (4 << 16)),

    pb.op(Op.i32Add),
    pb.op(Op.return, 4),

    // fib0:
    pb.op(Op.i32Const, 1),
    pb.op(Op.return, 4),
);

// pb.block("main",
//     pb.op(Op.i32Const, 10),
//     pb.op(Op.i32Const, 15),
//     pb.op(Op.dup, 8),
// );
const program = pb.finish();
const vm = new Vm(program);
vm.printTrace = true;
try {
    vm.run();
} catch (e) {
    console.error(e);
    console.log(vm.traceMessage);
}

console.log(vm.dumpStack());