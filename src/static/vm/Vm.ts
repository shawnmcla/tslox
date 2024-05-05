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

    dup,
    halt,
}

export class Instruction {
    constructor(public op: Op, public operand: number = 0) { }
    toString() {
        return `${Op[this.op]}(${this.operand})`;
    }
}


export class Vm {
    public stack: any[] = [];

    private ip = 0;
    private sp = 0;

    constructor(private program: Instruction[] = []) { }

    assertStack(size: number): void {
        if(size > this.sp) throw new Error("STACK UNDERFLOW");
    }

    step(): boolean {
        let halted = false;
        const instruction = this.program[this.ip++];
        console.debug("Vm::step: Instruction: " + instruction?.toString());

        switch(instruction.op) {

            case Op.loadConst:
                this.stack[this.sp++] = instruction.operand;
                break;

            case Op.i32Add:
                this.assertStack(2);
                this.stack[this.sp-2] += this.stack[this.sp-1]
                this.sp -= 2;
                break;

            case Op.i32Sub:
                this.stack[this.sp-2] -= this.stack[this.sp-1]
                this.sp -= 2;
                this.assertStack(2);
                break;

            case Op.i32Mul:
                this.stack[this.sp-2] *= this.stack[this.sp-1]
                this.sp -= 2;
                this.assertStack(2);
                break;

            case Op.i32Div:
                this.stack[this.sp-2] /= this.stack[this.sp-1]
                this.sp -= 2;
                this.assertStack(2);
                break;

            default:
                console.error("Vm:: Unrecognized op:", instruction.op);
        }

        if(this.ip >= this.program.length) halted = true;

        return !halted;
    }

    run(): void { 
        while(this.step()){}
    }
}

const vm = new Vm([
    new Instruction(Op.loadConst, 420),
    new Instruction(Op.loadConst, 69),
    new Instruction(Op.i32Add),
]);

vm.run();

console.debug("Result", vm.stack);