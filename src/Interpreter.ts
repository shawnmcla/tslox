import { BinaryExpr, Expr, GroupingExpr, LiteralExpr, Token, TokenType, UnaryExpr, ExprVisitor, StmtVisitor, ExpressionStmt, PrintStmt, Stmt, VariableExpr, VarStmt, AssignmentExpr, BlockStmt, IfStmt, LogicalExpr, WhileStmt, CallExpr, FunctionStmt, ReturnStmt, BreakStmt, ContinueStmt } from "./Ast";
import { Environment } from "./Environment";
import { Break, Continue, Return, RuntimeError } from "./Errors";
import { Lox } from "./Lox";
import { LoxCallable } from "./LoxCallable";
import { LoxFunction } from "./LoxFunction";

export type Lobj = any

export class Interpreter implements ExprVisitor<Lobj>, StmtVisitor<void> {
    private replMode = false;
    public globals = new Environment();
    private environment = this.globals;

    constructor() {
        this.globals.define("clock", {
            __lox_callable: true,
            get arity() { return 0; },
            call(_interpreter: Interpreter, _args: Lobj[]): Lobj {
                return Date.now() / 1000.0;
            },
            toString() { return "<native fn>"; }
        });
    }

    interpret(statements: Stmt[], isRepl: boolean = false): void {
        try {
            this.replMode = isRepl;
            for (const statement of statements) {
                this.execute(statement);
            }
        } catch (e) {
            if (e instanceof RuntimeError) {
                Lox.runtimeError(e);
            } else {
                throw e;
            }
        } finally {
            this.replMode = false;
        }
    }

    execute(stmt: Stmt): void {
        stmt.accept(this);
    }

    stringify(obj: Lobj) {
        if (obj === null) return "nil";

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
        const value = this.environment.get(variable.name);
        if (value === undefined) {
            throw new RuntimeError(variable.name, "Cannot access variable before initialization.");
        }
        return value;
    }

    visitAssignmentExpr(assignment: AssignmentExpr) {
        const value = this.evaluate(assignment.value);
        this.environment.assign(assignment.name, value);
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

    visitExpressionStmt(stmt: ExpressionStmt): void {
        const result = this.evaluate(stmt.expression);
        if (this.replMode && !(stmt.expression instanceof AssignmentExpr)) {
            Lox.print(this.stringify(result));
        }
    }

    visitPrintStmt(stmt: PrintStmt): void {
        const value = this.evaluate(stmt.expression);
        console.log(this.stringify(value));
        Lox.print(value);
    }

    visitVarStmt(stmt: VarStmt): void {
        let value: Lobj | undefined;
        if (stmt.initializer) value = this.evaluate(stmt.initializer);
        this.environment.define(stmt.name.lexeme, value);
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
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            try {
                this.execute(stmt.body);
            } catch (e) {
                if (e instanceof Break) return;
                else if (e instanceof Continue) continue;
                else throw e;
            }
        }
    }

    visitFunctionStmt(stmt: FunctionStmt): void {
        const func = new LoxFunction(stmt, this.environment);
        this.environment.define(stmt.name.lexeme, func);
    }

    visitBreakStmt(stmt: BreakStmt): void {
        throw new Break();
    }

    visitContinueStmt(stmt: ContinueStmt): void {
        throw new Continue();
    }

    visitReturnStmt(stmt: ReturnStmt): void {
        let value: Lobj = null;
        if (stmt.value) value = this.evaluate(stmt.value);
        throw new Return(value);
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