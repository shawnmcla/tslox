export enum Op {
    PushConst,

    loadConst,

    i32Add,
    i32Sub,
    i32Mul,
    i32Div,

    f64Add,
    f64Sub,
    f64Mul,
    f64Div,

    equal,
    lessThan,
    lessEq,
    greaterThan,
    greaterEq,

    noop,
    call,
    return,

    jump,
    jumpIf,

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
    public stack: any[] = [];
    public frames: Frame[] = [];

    public ip = 0;
    public sp = 0;

    constructor(private program: Instruction[] = []) { }

    assertIpValid(ip: number): void {
        if (ip < 0 || ip >= this.program.length) throw new Error("ILLEGAL INSTRUCTION ADDRESS");
    }

    assertStack(size: number): void {
        if (size > this.sp) throw new Error("STACK UNDERFLOW");
    }

    assertFrame(): void {
        if (this.frames.length === 0) throw new Error("NO FRAME TO RETURN");
    }

    step(): boolean {
        let halted = false;
        const instruction = this.program[this.ip++];
        //console.debug(`Vm::step: [${this.ip-1}]: ${instruction?.toString()}`);

        switch (instruction.op) {
            case Op.noop:
                break;

            case Op.loadConst:
                this.stack[this.sp++] = instruction.operand;
                break;

            case Op.i32Add:
                this.assertStack(2);
                this.stack[this.sp - 2] += this.stack[this.sp - 1]
                this.sp--;
                break;

            case Op.i32Sub:
                this.assertStack(2);
                this.stack[this.sp - 2] -= this.stack[this.sp - 1]
                this.sp--;
                break;

            case Op.i32Mul:
                this.assertStack(2);
                this.stack[this.sp - 2] *= this.stack[this.sp - 1]
                this.sp--;
                break;

            case Op.i32Div:
                this.assertStack(2);
                this.stack[this.sp - 2] /= this.stack[this.sp - 1]
                this.sp--;
                break;

            case Op.equal:
                this.assertStack(2);
                this.stack[this.sp - 2] = (this.stack[this.sp - 2] === this.stack[this.sp - 1] ? 1 : 0);
                break;

            case Op.lessThan:
                this.assertStack(2);
                this.stack[this.sp - 2] = (this.stack[this.sp - 2] < this.stack[this.sp - 1] ? 1 : 0);
                break;

            case Op.lessEq:
                this.assertStack(2);
                this.stack[this.sp - 2] = (this.stack[this.sp - 2] <= this.stack[this.sp - 1] ? 1 : 0);
                break;

            case Op.greaterThan:
                this.assertStack(2);
                this.stack[this.sp - 2] = (this.stack[this.sp - 2] > this.stack[this.sp - 1] ? 1 : 0);
                break;

            case Op.greaterEq:
                this.assertStack(2);
                this.stack[this.sp - 2] = (this.stack[this.sp - 2] >= this.stack[this.sp - 1] ? 1 : 0);
                break;

            case Op.call:
                const newFrame = new Frame(this.ip, this.sp);
                this.frames.push(newFrame);
                this.ip = instruction.operand;
                break;

            case Op.return:
                this.assertFrame();
                const discardedFrame = this.frames.pop()!;
                this.ip = discardedFrame.returnAddr;
                break;

            case Op.print:
                this.assertStack(1);
                const value = this.stack[--this.sp];
                console.log(">>> " + value);
                break;

            case Op.dup:
                const offset = instruction.operand ?? 0;
                this.assertStack(offset + 1);
                const duped = this.stack[this.sp - 1 - offset];
                this.stack[this.sp++] = duped;
                break;

            case Op.jump:
                const destination = instruction.operand;
                this.assertIpValid(destination);
                this.ip = destination;
                break;

            case Op.jumpIf:
                this.assertStack(1);
                if (this.stack[--this.sp] > 0) {
                    const destination = instruction.operand;
                    this.assertIpValid(destination);
                    this.ip = destination;
                }
                break;

            case Op.halt:
                halted = true;
                break;

            default:
                console.error("Vm:: Unrecognized op:", instruction.op);
        }

        if (this.ip >= this.program.length) halted = true;

        return !halted;
    }

    run(): void {
        if (!(this.ip < this.program.length)) return;
        while (this.step()) { }
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
        for(const blockName in this.blocks) {
            if(blockName !== "main") orderedBlocks.push(this.blocks[blockName]);
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

pb.block("fib",
    pb.op(Op.dup),
    pb.op(Op.loadConst, 2),
    pb.op(Op.lessThan),
    pb.op(Op.jumpIf, "fib0"),

    pb.op(Op.dup),
    pb.op(Op.loadConst, 2),
    pb.op(Op.i32Sub),
    pb.op(Op.call, "fib"),

    pb.op(Op.dup),
    pb.op(Op.loadConst, 1),
    pb.op(Op.i32Sub),
    pb.op(Op.call, "fib"),

    pb.op(Op.i32Add),
    pb.op(Op.dup),
    pb.op(Op.print),

    pb.op(Op.return),
);

pb.block("fib0",
    pb.op(Op.loadConst, 1),
    pb.op(Op.return),
);

pb.block("main", 
    pb.op(Op.loadConst, 10),
    pb.op(Op.call, "fib"),

    pb.op(Op.print),
    pb.op(Op.halt),
)

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

const program = pb.finish();
console.log(program.length);
console.log(program.map(i => i.toString()));
const vm = new Vm(program);

vm.run();

console.debug("Result", vm.stack.slice(0, vm.sp));