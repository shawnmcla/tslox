import { AssignmentExpr, BinaryExpr, BlockStmt, BreakStmt, CallExpr, ContinueStmt, Expr, ExprVisitor, ExpressionStmt, FunctionStmt, GroupingExpr, IfStmt, LiteralExpr, LogicalExpr, PrintStmt, ReturnStmt, Stmt, StmtVisitor, Token, UnaryExpr, VarStmt, VariableExpr, WhileStmt } from "./Ast";
import { Interpreter } from "./Interpreter";
import { Lox } from "./Lox";

enum FunctionType {
    NONE,
    FUNCTION
}

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
    private readonly scopes: Map<string, boolean>[] = [];
    private currentFunction = FunctionType.NONE;
    private loopDepth = 0;

    public peekScope(): Map<string, boolean> {
        return this.scopes[this.scopes.length - 1];
    }

    constructor(private interpreter: Interpreter) { }

    resolveStatements(statements: Stmt[]): void {
        for (const statement of statements) {
            this.resolveStatement(statement);
        }
    }

    resolveStatement(stmt: Stmt): void {
        stmt.accept(this);
    }

    resolveExpression(expr: Expr): void {
        expr.accept(this);
    }

    resolveLocal(expr: Expr, name: Token): void {
        // Walk scopes backwards, finding nearest match
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name.lexeme)) {
                // If we find it, we report the number of scope "hops" for this mapping
                this.interpreter.resolve(expr, this.scopes.length - 1 - i);
                return;
            }
        }
    }

    resolveFunction(func: FunctionStmt, type: FunctionType): void {
        const enclosingFunction = this.currentFunction;
        this.currentFunction = type;
        this.beginScope();
        for (const param of func.params) {
            this.declare(param);
            this.define(param);
        }
        this.resolveStatements(func.body);
        this.endScope();
        this.currentFunction = enclosingFunction;
    }

    beginScope(): void {
        this.scopes.push(new Map());
    }

    endScope(): void {
        this.scopes.pop();
    }

    declare(name: Token): void {
        if (this.scopes.length === 0) return;
        const scope = this.peekScope();
        if (scope.has(name.lexeme)) {
            Lox.error(name, "Already a variable with this name in this scope.");
        }
        scope.set(name.lexeme, false);
    }

    define(name: Token) {
        if (this.scopes.length === 0) return;
        this.peekScope().set(name.lexeme, true);
    }

    visitExpressionStmt(stmt: ExpressionStmt): void {
        this.resolveExpression(stmt.expression);
    }

    visitPrintStmt(stmt: PrintStmt): void {
        this.resolveExpression(stmt.expression);
    }

    visitVarStmt(stmt: VarStmt): void {
        this.declare(stmt.name);
        if (stmt.initializer) {
            this.resolveExpression(stmt.initializer);
        }
        this.define(stmt.name);
    }

    visitBlockStmt(stmt: BlockStmt): void {
        this.beginScope();
        this.resolveStatements(stmt.statements);
        this.endScope();
    }

    visitIfStmt(stmt: IfStmt): void {
        this.resolveExpression(stmt.condition);
        this.resolveStatement(stmt.thenBranch);
        if (stmt.elseBranch) this.resolveStatement(stmt.elseBranch);
    }

    visitWhileStmt(stmt: WhileStmt): void {
        this.loopDepth++;
        this.resolveExpression(stmt.condition);
        this.resolveStatement(stmt.body);
        this.loopDepth--;
    }

    visitFunctionStmt(stmt: FunctionStmt): void {
        this.declare(stmt.name);
        this.define(stmt.name);
        this.resolveFunction(stmt, FunctionType.FUNCTION);
    }

    visitBreakStmt(stmt: BreakStmt): void {
        if (this.loopDepth <= 0) {
            Lox.error(stmt.keyword, "Break statement can only be used inside a loop.");
        }
    }

    visitContinueStmt(stmt: ContinueStmt): void {
        if (this.loopDepth <= 0) {
            Lox.error(stmt.keyword, "Break statement can only be used inside a loop.");
        }
    }

    visitReturnStmt(stmt: ReturnStmt): void {
        if (this.currentFunction === FunctionType.NONE) {
            Lox.error(stmt.keyword, "Can't return from top-level code.");
        }

        if (stmt.value) this.resolveExpression(stmt.value);
    }

    visitBinaryExpr(binary: BinaryExpr): void {
        this.resolveExpression(binary.left);
        this.resolveExpression(binary.right);
    }

    visitGroupingExpr(grouping: GroupingExpr): void {
        this.resolveExpression(grouping.expr);
    }

    visitLiteralExpr(literal: LiteralExpr): void {
        // No op
    }

    visitUnaryExpr(unary: UnaryExpr): void {
        this.resolveExpression(unary.right);
    }

    visitVariableExpr(variable: VariableExpr): void {
        if (this.scopes.length > 0 && this.peekScope().get(variable.name.lexeme) === false) {
            Lox.error(variable.name, "Can't read local variable in its own initializer.");
        }

        this.resolveLocal(variable, variable.name);
    }

    visitAssignmentExpr(assignment: AssignmentExpr): void {
        this.resolveExpression(assignment.value);
        this.resolveLocal(assignment, assignment.name);
    }

    visitLogicalExpr(logical: LogicalExpr): void {
        this.resolveExpression(logical.left);
        this.resolveExpression(logical.right);
    }

    visitCallExpr(call: CallExpr): void {
        this.resolveExpression(call.callee);

        for (const arg of call.args) {
            this.resolveExpression(arg);
        }
    }
}