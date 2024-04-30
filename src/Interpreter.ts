import { BinaryExpr, Expr, GroupingExpr, LiteralExpr, Token, TokenType, UnaryExpr, ExprVisitor, StmtVisitor, ExpressionStmt, PrintStmt, Stmt, VariableExpr, VarStmt, AssignmentExpr, BlockStmt, IfStmt, LogicalExpr, WhileStmt, CallExpr, FunctionStmt, ReturnStmt, BreakStmt, ContinueStmt, ClassStmt, GetExpr, SetExpr, ThisExpr, FunctionExpr, SuperExpr, IndexGetExpr, IndexSetExpr } from "./Ast";
import { Environment } from "./Environment";
import { Break, Continue, Return, RuntimeError } from "./Errors";
import { Lox } from "./Lox";
import { LoxArray } from "./LoxArray";
import { LoxCallable } from "./LoxCallable";
import { LoxClass } from "./LoxClass";
import { LoxFunction, LoxFunctionLike, LoxNativeFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";
import { globalFunctions } from "./NativeFunctions";

export type Lobj = any

export class Interpreter implements ExprVisitor<Lobj>, StmtVisitor<void> {
    private printNext = false;
    public globals = new Environment();
    private environment = this.globals;
    private readonly locals: Map<Expr, number> = new Map();

    constructor(private lox: Lox, private replMode: boolean = false) {
        for (const functionname in globalFunctions) {
            this.globals.define(functionname, new LoxNativeFunction(globalFunctions[functionname]));
        }
    }

    resolve(expr: Expr, depth: number): void {
        this.locals.set(expr, depth);
    }

    interpret(statements: Stmt[]): void {
        try {
            if (this.replMode && statements.length > 0 && statements[0] instanceof ExpressionStmt) {
                this.printNext = true;
            }
            for (const statement of statements) {
                this.execute(statement);
            }
        } catch (e) {
            if (e instanceof RuntimeError) {
                this.lox.runtimeError(e);
            } else {
                throw e;
            }
        } finally {
            this.printNext = false;
        }
    }

    execute(stmt: Stmt): void {
        stmt.accept(this);
    }

    static stringify(obj: Lobj) {
        if (obj == null) return "nil";

        if (typeof obj === "number") {
            let text = obj.toString();
            if (text.endsWith(".0")) text = text.substring(0, text.length - 2);
            return text;
        }

        return obj.toString();
    }

    assertNumberOperand(operator: Token, operand: Lobj): void {
        if (typeof operand === "number") return;
        throw new RuntimeError(operator, "Operand must be a number.");
    }

    assertNumberOperands(operator: Token, left: Lobj, right: Lobj) {
        if (typeof left === "number" && typeof right === "number") return;
        throw new RuntimeError(operator, "Operands must be numbers");
    }

    visitBinaryExpr(binary: BinaryExpr) {
        const left = this.evaluate(binary.left);
        const right = this.evaluate(binary.right);

        switch (binary.operator.type) {
            case TokenType.GREATER:
                this.assertNumberOperands(binary.operator, left, right);
                return left > right;
            case TokenType.GREATER_EQUAL:
                this.assertNumberOperands(binary.operator, left, right);
                return left >= right;
            case TokenType.LESS:
                this.assertNumberOperands(binary.operator, left, right);
                return left < right;
            case TokenType.LESS_EQUAL:
                this.assertNumberOperands(binary.operator, left, right);
                return left <= right;
            case TokenType.BANG_EQUAL:
                return !this.isEqual(left, right);
            case TokenType.EQUAL_EQUAL:
                return this.isEqual(left, right);
            case TokenType.MINUS:
                this.assertNumberOperands(binary.operator, left, right);
                return left - right;
            case TokenType.PLUS:
                if (typeof left === "number" && typeof right === "number") {
                    return left + right;
                }

                if (typeof left === "string" && typeof right === "string") {
                    return left + right;
                }
                throw new RuntimeError(binary.operator, "Operands must be two numbers or two strings.");
            case TokenType.SLASH:
                this.assertNumberOperands(binary.operator, left, right);
                return left / right;
            case TokenType.STAR:
                this.assertNumberOperands(binary.operator, left, right);
                return left * right;
        }

        return null;
    }

    visitGroupingExpr(grouping: GroupingExpr) {
        return this.evaluate(grouping.expr);
    }

    visitLiteralExpr(literal: LiteralExpr) {
        return literal.value;
    }

    visitUnaryExpr(unary: UnaryExpr) {
        const right = this.evaluate(unary.right);

        switch (unary.operator.type) {
            case TokenType.BANG:
                return !this.isTruthy(right);
            case TokenType.MINUS:
                this.assertNumberOperand(unary.operator, right);
                return -right;
        }

        return null;
    }

    visitVariableExpr(variable: VariableExpr) {
        return this.lookUpVariable(variable.name, variable);
    }

    visitFunctionExpr(func: FunctionExpr) {
        return new LoxFunction(func, this.environment, false);
    }

    lookUpVariable(name: Token, expr: Expr): Lobj {
        const distance = this.locals.get(expr);
        if (distance !== undefined) {
            return this.environment.getAt(distance, name.lexeme);
        } else {
            return this.globals.get(name);
        }
    }

    visitAssignmentExpr(assignment: AssignmentExpr) {
        const value = this.evaluate(assignment.value);
        const distance = this.locals.get(assignment);

        if (distance !== undefined) {
            this.environment.assignAt(distance, assignment.name, value);
        } else {
            this.globals.assign(assignment.name, value);
        }

        return value;
    }

    visitLogicalExpr(logical: LogicalExpr) {
        const left = this.evaluate(logical.left);
        if (logical.operator.type == TokenType.OR) {
            if (this.isTruthy(left)) return left;
        } else {
            if (!this.isTruthy(left)) return left;
        }

        return this.evaluate(logical.right);
    }

    visitCallExpr(call: CallExpr) {
        const callee = this.evaluate(call.callee);

        const args: Lobj[] = [];
        for (const arg of call.args) {
            args.push(this.evaluate(arg));
        }

        if (!('__lox_callable' in callee)) {
            throw new RuntimeError(call.paren, "Can only call functions and classes.");
        }

        const func = callee as LoxCallable;
        if (args.length != func.arity) {
            throw new RuntimeError(call.paren,
                `Expected ${func.arity} arguments but got ${args.length}.`);
        }

        return func.call(this, args);
    }

    visitGetExpr(get: GetExpr): Lobj {
        const object = this.evaluate(get.object);
        if (object instanceof LoxInstance) {
            const property = object.get(get.name);
            if (property instanceof LoxFunction && property.isGetter) {
                return property.call(this, []);
            } else {
                return property;
            }
        }
        throw new RuntimeError(get.name, "Only instances have properties.");
    }

    visitIndexGetExpr(get: IndexGetExpr) {
        const object = this.evaluate(get.object);
        const index = this.evaluate(get.index);

        if (object instanceof LoxArray) {
            if (typeof index !== "number") {
                throw new RuntimeError(get.bracket, "Index must be a number.");
            }

            if (index < 0) throw new RuntimeError(get.bracket, "Index must be greater or equal to 0.");
            if (index >= object.innerArray.length) throw new RuntimeError(get.bracket, "Array index out of range.");

            return object.innerArray[index];
        } else if(object instanceof LoxInstance) {
            const getter = object.getMethod("$get");
            if(getter) {
                return getter.boundTo(object).call(this, [index]);
            }
        }

        throw new RuntimeError(get.bracket, "Value not indexable.");
    }

    visitSetExpr(set: SetExpr): Lobj {
        const object = this.evaluate(set.object);
        if (!(object instanceof LoxInstance)) {
            throw new RuntimeError(set.name, "Only instances have fields.");
        }

        const value = this.evaluate(set.value);
        object.set(set.name, value);
        return value;
    }

    visitIndexSetExpr(set: IndexSetExpr) {
        const object = this.evaluate(set.object);
        const index = this.evaluate(set.index);
        if (object instanceof LoxArray) {
            if (typeof index !== "number") {
                throw new RuntimeError(set.bracket, "Index must be a number.");
            }

            if (index < 0) throw new RuntimeError(set.bracket, "Index must be greater or equal to 0.");
            if (index >= object.innerArray.length) throw new RuntimeError(set.bracket, "Array index out of range.");

            const value = this.evaluate(set.value);
            object.innerArray[index] = value;
            return value;
        } else if (object instanceof LoxInstance) {
            // Check if set-index magic is present
            const setter = object.getMethod("$set");
            if (setter) {
                const value = this.evaluate(set.value);
                setter.boundTo(object).call(this, [index, value]);
                return value;
            }
        }

        throw new RuntimeError(set.bracket, "Value not indexable.");
    }

    visitThisExpr(thisValue: ThisExpr) {
        return this.lookUpVariable(thisValue.keyword, thisValue);
    }

    visitSuperExpr(superExpr: SuperExpr) {
        const distance = this.locals.get(superExpr)!;
        const superclass = this.environment.getAt(distance, "super") as LoxClass;
        const obj = this.environment.getAt(distance - 1, "this") as LoxInstance;
        const method = superclass.findMethod(superExpr.method.lexeme);
        if (!method) {
            throw new RuntimeError(superExpr.method, `Undefined property '${superExpr.method.lexeme}'.`);
        }
        return method.boundTo(obj);
    }

    visitExpressionStmt(stmt: ExpressionStmt): void {
        const result = this.evaluate(stmt.expression);
        if (this.replMode && this.printNext) {
            this.lox.print(Interpreter.stringify(result), "> ");
            this.printNext = false;
        }
    }

    visitPrintStmt(stmt: PrintStmt): void {
        const value = this.evaluate(stmt.expression);
        this.lox.print(value);
    }

    visitVarStmt(stmt: VarStmt): void {
        let value: Lobj | undefined;
        if (stmt.initializer) value = this.evaluate(stmt.initializer);
        this.environment.define(stmt.name.lexeme, value, stmt.isConst);
    }

    visitBlockStmt(stmt: BlockStmt): void {
        this.executeBlock(stmt.statements, new Environment(this.environment));
    }

    visitIfStmt(stmt: IfStmt): void {
        if (this.isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.thenBranch);
        } else if (stmt.elseBranch) {
            this.execute(stmt.elseBranch);
        }
    }

    visitWhileStmt(stmt: WhileStmt): void {
        let i = 0;
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            try {
                // Safety
                if(i++ > 1000) {
                    console.info("Safety triggered");
                    return;
                } 
                this.execute(stmt.body);
            } catch (e) {
                if (e instanceof Break) return;
                else if (e instanceof Continue) continue;
                else throw e;
            }
        }
    }

    visitFunctionStmt(stmt: FunctionStmt): void {
        const func = new LoxFunction(stmt, this.environment, false);
        this.environment.define(stmt.name.lexeme, func);
    }

    visitBreakStmt(_: BreakStmt): void {
        throw new Break();
    }

    visitContinueStmt(_: ContinueStmt): void {
        throw new Continue();
    }

    visitReturnStmt(stmt: ReturnStmt): void {
        let value: Lobj = null;
        if (stmt.value) value = this.evaluate(stmt.value);
        throw new Return(value);
    }

    visitClassStmt(stmt: ClassStmt): void {
        let superclass: Lobj | undefined;
        if (stmt.superclass) {
            superclass = this.evaluate(stmt.superclass);
            if (!(superclass instanceof LoxClass)) {
                throw new RuntimeError(stmt.superclass.name, "Superclass must be a class.");
            }
        }

        this.environment.define(stmt.name.lexeme, null);

        if (stmt.superclass) {
            this.environment = new Environment(this.environment);
            this.environment.define("super", superclass);
        }

        const methods: Map<string, LoxFunction> = new Map();

        for (const method of stmt.methods) {
            const func = new LoxFunction(method, this.environment, method.name.lexeme === "init", method.isGetter);
            methods.set(method.name.lexeme, func);
        }

        const klass = new LoxClass(stmt.name.lexeme, superclass, methods);

        if (superclass) {
            this.environment = this.environment.enclosing!;
        }

        this.environment.assign(stmt.name, klass);
    }

    executeBlock(statements: Stmt[], environment: Environment): void {
        const previous = this.environment;
        try {
            this.environment = environment;
            for (const statement of statements) {
                this.execute(statement);
            }
        }
        finally {
            this.environment = previous;
        }
    }

    isTruthy(obj: Lobj): boolean {
        if (obj == null) return false;
        if (typeof obj === "boolean") return obj;
        return true;
    }

    isEqual(a: Lobj, b: Lobj): boolean {
        if (a == null && b == null) return true;
        if (a == null) return false;
        return a === b;
    }

    evaluate(expr: Expr): Lobj {
        return expr.accept(this);
    }
}