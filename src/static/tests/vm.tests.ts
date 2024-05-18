import { test, expect, describe } from "bun:test";
import { Instruction, Op, Vm } from "../vm/Vm2";
// TODO: Refactor test data into jsonc files maybe
describe("VM Instructions", () => {
    test("constants", () => {
        const vm = new Vm([
            new Instruction(Op.i32Const, 10),
            new Instruction(Op.i32Const, 1_000_000_000),
            new Instruction(Op.f64Const, -0.555),
            new Instruction(Op.f64Const, 123.45678),
        ]);

        vm.run();

        expect(vm.sp).toEqual(4 * 2 + 8 * 2);
        expect(vm.i32Read(0)).toEqual(10);
        expect(vm.i32Read(4)).toEqual(1_000_000_000);
        expect(vm.f64Read(8)).toEqual(-0.555);
        expect(vm.f64Read(16)).toEqual(123.45678);
    });

    test("i32 arithmetic", () => {
        const a = 10;
        const b = 25;
        const c = -30;
        const d = 2;
        const e = 4;

        const res1 = a + b;
        const res2 = res1 - c;
        const res3 = res2 * d;
        const res4 = (res3 / e) | 0;

        const vm = new Vm([
            new Instruction(Op.i32Const, b),
            new Instruction(Op.i32Const, a),
            new Instruction(Op.i32Add), // a + b

            new Instruction(Op.i32Const, c),
            new Instruction(Op.i32Sub), // (a+b) - (-c)

            new Instruction(Op.i32Const, d),
            new Instruction(Op.i32Mul), // ((a+b) - (-c)) * d

            new Instruction(Op.i32Const, e),
            new Instruction(Op.i32Div), // (((a+b) - (-c)) * d) / e
        ]);

        vm.stepX(3);
        expect(vm.i32Read(0)).toEqual(res1);

        vm.stepX(2);
        expect(vm.i32Read(0)).toEqual(res2);

        vm.stepX(2);
        expect(vm.i32Read(0)).toEqual(res3);

        vm.stepX(2);
        expect(vm.i32Read(0)).toEqual(res4);
    });

    test("i32 comparisons", () => {
        const x = [-10, 0, 10];
        for(let i = 0; i < x.length - 1; i++) {
            for(let j = 0; j < x.length; j++){
                const a = x[i];
                const b = x[j];

                const resGt = a > b ? 1 : 0;
                const resGeq = a >= b ? 1 : 0;
                const resEq = a === b ? 1 : 0;
                const resLt = a < b ? 1 : 0;
                const resLeq = a <= b ? 1 : 0;

                const vm = new Vm([
                    new Instruction(Op.i32Const, a),
                    new Instruction(Op.i32Const, b),
                    new Instruction(Op.i32GreaterThan),
                    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.i32Const, a),
                    new Instruction(Op.i32Const, b),
                    new Instruction(Op.i32GreaterEq),
                    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.i32Const, a),
                    new Instruction(Op.i32Const, b),
                    new Instruction(Op.i32Equal),

                    new Instruction(Op.pop, 4),
                    new Instruction(Op.i32Const, a),
                    new Instruction(Op.i32Const, b),
                    new Instruction(Op.i32LessThan),
                    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.i32Const, a),
                    new Instruction(Op.i32Const, b),
                    new Instruction(Op.i32LessEq),
                ]);
                
                vm.stepX(3);
                expect(vm.i32Read(0)).toEqual(resGt);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resGeq);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resEq);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resLt);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resLeq);
            }
        }
    });

    test("f64 arithmetic", () => {
        const a = 1.25;
        const b = -5.753;
        const c = 10000;
        const d = 2;
        const e = 4;

        const res1 = a + b;
        const res2 = res1 - c;
        const res3 = res2 * d;
        const res4 = res3 / e;

        const vm = new Vm([
            new Instruction(Op.f64Const, b),
            new Instruction(Op.f64Const, a),
            new Instruction(Op.f64Add), // a + b

            new Instruction(Op.f64Const, c),
            new Instruction(Op.f64Sub), // (a+b) - (-c)

            new Instruction(Op.f64Const, d),
            new Instruction(Op.f64Mul), // ((a+b) - (-c)) * d

            new Instruction(Op.f64Const, e),
            new Instruction(Op.f64Div), // (((a+b) - (-c)) * d) / e
        ]);

        vm.stepX(3);
        expect(vm.f64Read(0)).toEqual(res1);

        vm.stepX(2);
        expect(vm.f64Read(0)).toEqual(res2);

        vm.stepX(2);
        expect(vm.f64Read(0)).toEqual(res3);

        vm.stepX(2);
        expect(vm.f64Read(0)).toEqual(res4);
    });

    test("f64 comparisons", () => {
        const x = [-10.75, 0, 10.345];
        for(let i = 0; i < x.length - 1; i++) {
            for(let j = 0; j < x.length; j++){
                const a = x[i];
                const b = x[j];
                console.debug(a, b);
                const resGt = a > b ? 1 : 0;
                const resGeq = a >= b ? 1 : 0;
                const resEq = a === b ? 1 : 0;
                const resLt = a < b ? 1 : 0;
                const resLeq = a <= b ? 1 : 0;
    
                const vm = new Vm([
                    new Instruction(Op.f64Const, a),
                    new Instruction(Op.f64Const, b),
                    new Instruction(Op.f64GreaterThan),
                    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.f64Const, a),
                    new Instruction(Op.f64Const, b),
                    new Instruction(Op.f64GreaterEq),
                    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.f64Const, a),
                    new Instruction(Op.f64Const, b),
                    new Instruction(Op.f64Equal),
    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.f64Const, a),
                    new Instruction(Op.f64Const, b),
                    new Instruction(Op.f64LessThan),
                    
                    new Instruction(Op.pop, 4),
                    new Instruction(Op.f64Const, a),
                    new Instruction(Op.f64Const, b),
                    new Instruction(Op.f64LessEq),
                ]);
                
                vm.stepX(3);
                expect(vm.i32Read(0)).toEqual(resGt);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resGeq);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resEq);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resLt);
                vm.stepX(4);
                expect(vm.i32Read(0)).toEqual(resLeq);
            }
        }
    });
    
});
