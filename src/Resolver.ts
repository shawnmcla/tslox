import { AssignmentExpr, BinaryExpr, BlockStmt, BreakStmt, CallExpr, ClassStmt, ContinueStmt, Expr, ExprVisitor, ExpressionStmt, FunctionExpr, FunctionStmt, GetExpr, GroupingExpr, IfStmt, LiteralExpr, LogicalExpr, PrintStmt, ReturnStmt, SetExpr, Stmt, StmtVisitor, SuperExpr, ThisExpr, Token, UnaryExpr, VarStmt, VariableExpr, WhileStmt } from "./Ast";
import { Interpreter } from "./Interpreter";
import { Lox } from "./Lox";

enum FunctionType {
    NONE,
    FUNCTION,
    INITIALIZER,
    METHOD
}

enum ClassType {
    NONE,
    CLASS,
    SUBCLASS
}

class VarInfo {
    constructor(public defined: boolean, public used: boolean = false) { }
}

type Scope = Map<string, VarInfo>;

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
    private readonly scopes: Scope[] = [];
    private currentFunction = FunctionType.NONE;
    private currentClass = ClassType.NONE;

    private loopDepth = 0;

    public peekScope(): Scope {
        return this.scopes[this.scopes.length - 1];
    }

    constructor(private interpreter: Interpreter, private lox: Lox) { }

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
                this.scopes[i].get(name.lexeme)!.used = true;
                // If we find it, we report the number of scope "hops" for this mapping
                this.interpreter.resolve(expr, this.scopes.length - 1 - i);
                return;
            }
        }
    }

    resolveFunction(func: FunctionStmt | FunctionExpr, type: FunctionType): void {
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
        const scope = this.scopes.pop()!;
        for (const name of scope.keys()) {
            const info = scope.get(name)!;
            if(!info.used) { 
                this.lox.warn(0, `Variable ${name} unused`)
            }
        }
    }

    declare(name: Token): void {
        if (this.scopes.length === 0) return;
        const scope = this.peekScope();
        if (scope.has(name.lexeme)) {
            this.lox.error(name, "Already a variable with this name in this scope.");
        }
        scope.set(name.lexeme, new VarInfo(false));
    }

    define(name: Token) {
        if (this.scopes.length === 0) return;
        const varInfo = this.peekScope().get(name.lexeme);
        if (varInfo) varInfo.defined = true;
        else this.peekScope().set(name.lexeme, new VarInfo(true));
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
            this.lox.error(stmt.keyword, "Break statement can only be used inside a loop.");
        }
    }

    visitContinueStmt(stmt: ContinueStmt): void {
        if (this.loopDepth <= 0) {
            this.lox.error(stmt.keyword, "Break statement can only be used inside a loop.");
        }
    }

    visitReturnStmt(stmt: ReturnStmt): void {
        if (this.currentFunction === FunctionType.NONE) {
            this.lox.error(stmt.keyword, "Can't return from top-level code.");
        }

        if (stmt.value) {
            if (this.currentFunction === FunctionType.INITIALIZER) {
                this.lox.error(stmt.keyword, "Cannot return a value from an initializer.");
            }
            this.resolveExpression(stmt.value);
        }
    }

    visitClassStmt(stmt: ClassStmt): void {
        const enclosingClass = this.currentClass;
        this.currentClass = ClassType.CLASS;
        this.declare(stmt.name);
        this.define(stmt.name);

        if(stmt.superclass) {
            if (stmt.name.lexeme === stmt.superclass.name.lexeme) {
                this.lox.error(stmt.superclass.name,
                    "A class can't inherit from itself.");
            }
            this.currentClass = ClassType.SUBCLASS;
            this.resolveExpression(stmt.superclass);

            this.beginScope();
            this.peekScope().set("super", new VarInfo(true, true));
        }

        this.beginScope();
        this.peekScope().set("this", new VarInfo(true, true));

        for (const method of stmt.methods) {
            const declaration = method.name.lexeme === "init" ? FunctionType.INITIALIZER : FunctionType.METHOD;
            this.resolveFunction(method, declaration);
        }

        this.endScope();
        if(stmt.superclass) {
            this.endScope();
        }
        this.currentClass = enclosingClass;
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
        if (this.scopes.length > 0 && this.peekScope().get(variable.name.lexeme)?.defined === false) {
            this.lox.error(variable.name, "Can't read local variable in its own initializer.");
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

    visitGetExpr(get: GetExpr): void {
        this.resolveExpression(get.object);
    }

    visitSetExpr(set: SetExpr): void {
        this.resolveExpression(set.value);
        this.resolveExpression(set.object);
    }

    visitThisExpr(thisValue: ThisExpr): void {
        if (this.currentClass === ClassType.NONE) {
            this.lox.error(thisValue.keyword, "Can't use 'this' outside of a class.");
        }
        this.resolveLocal(thisValue, thisValue.keyword);
    }

    visitSuperExpr(superExpr: SuperExpr): void {
        if (this.currentClass === ClassType.NONE) {
            this.lox.error(superExpr.keyword,
                "Can't use 'super' outside of a class.");
          } else if (this.currentClass !== ClassType.SUBCLASS) {
            this.lox.error(superExpr.keyword,
                "Can't use 'super' in a class with no superclass.");
          }
        this.resolveLocal(superExpr, superExpr.keyword);    
    }

    visitFunctionExpr(func: FunctionExpr): void {
        this.resolveFunction(func, FunctionType.FUNCTION);
    }
}