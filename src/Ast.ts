export enum TokenType {
    // Single-character tokens.
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
    COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

    // One or two character tokens.
    BANG, BANG_EQUAL,
    EQUAL, EQUAL_EQUAL,
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,

    // Literals.
    IDENTIFIER, STRING, NUMBER,

    // Keywords.
    AND, CLASS, CONST, ELSE, FALSE, FUN, FOR, IF, NIL, OR,
    PRINT, BREAK, CONTINUE, RETURN, SUPER, THIS, TRUE, VAR, WHILE,

    EOF
}

export interface Location {
    file: string,
    line: number,
    offset: number
}

export class Token {
    constructor(public type: TokenType, public lexeme: string, public literal: any, public loc: Location) { }

    toString(): string {
        return `${TokenType[this.type]} ${this.lexeme} ${this.literal}`;
    }
}

export abstract class Expr {
    abstract accept<T>(visitor: ExprVisitor<T>): T;
}

export class BinaryExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitBinaryExpr(this);
    }
    constructor(public left: Expr, public operator: Token, public right: Expr) { super(); }
}

export class GroupingExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitGroupingExpr(this);
    }
    constructor(public expr: Expr) { super(); }
}

export class LiteralExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitLiteralExpr(this);
    }
    constructor(public value: any) { super(); }
}

export class UnaryExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitUnaryExpr(this);
    }
    constructor(public operator: Token, public right: Expr) { super(); }
}

export class VariableExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitVariableExpr(this);
    }
    constructor(public name: Token) { super(); }
}

export class AssignmentExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitAssignmentExpr(this);
    }
    constructor(public name: Token, public value: Expr) { super(); }
}

export class LogicalExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitLogicalExpr(this);
    }
    constructor(public left: Expr, public operator: Token, public right: Expr) { super(); };
}

export class CallExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitCallExpr(this);
    }
    constructor(public callee: Expr, public paren: Token, public args: Expr[]) { super(); }
}

export class GetExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitGetExpr(this);
    }
    constructor(public object: Expr, public name: Token) { super(); }
}

export class SetExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitSetExpr(this);
    }
    constructor(public object: Expr, public name: Token, public value: Expr) { super(); }
}

export class ThisExpr extends Expr {
    accept<T>(visitor: ExprVisitor<T>): T {
        return visitor.visitThisExpr(this);
    }
    constructor(public keyword: Token) { super(); }
}

export abstract class Stmt {
    abstract accept<T>(visitor: StmtVisitor<T>): T;
}

export class ExpressionStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitExpressionStmt(this);
    }
    constructor(public expression: Expr) { super(); }
}

export class PrintStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitPrintStmt(this);
    }
    constructor(public expression: Expr) { super(); }
}

export class VarStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitVarStmt(this);
    }
    constructor(public name: Token, public initializer?: Expr, public isConst?: boolean) { super(); }
}

export class BlockStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitBlockStmt(this);
    }
    constructor(public statements: Stmt[]) { super(); }
}

export class IfStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitIfStmt(this);
    }
    constructor(public condition: Expr, public thenBranch: Stmt, public elseBranch?: Stmt) { super(); }
}

export class WhileStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitWhileStmt(this);
    }
    constructor(public condition: Expr, public body: Stmt) { super(); }
}

export class FunctionStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitFunctionStmt(this);
    }
    constructor(public name: Token , public params: Token[], public body: Stmt[], public isGetter: boolean = false) { super(); }
}

export class BreakStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitBreakStmt(this);
    }
    constructor(public keyword: Token) { super(); }
}

export class ContinueStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitContinueStmt(this);
    }
    constructor(public keyword: Token) { super(); }
}

export class ReturnStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitReturnStmt(this);
    }
    constructor(public keyword: Token, public value?: Expr) { super(); }
}

export class ClassStmt extends Stmt {
    accept<T>(visitor: StmtVisitor<T>): T {
        return visitor.visitClassStmt(this);
    }
    constructor(public name: Token, public methods: FunctionStmt[]) { super(); }
}

export interface ExprVisitor<T> {
    visitBinaryExpr(binary: BinaryExpr): T;
    visitGroupingExpr(grouping: GroupingExpr): T;
    visitLiteralExpr(literal: LiteralExpr): T;
    visitUnaryExpr(unary: UnaryExpr): T;
    visitVariableExpr(variable: VariableExpr): T;
    visitAssignmentExpr(assignment: AssignmentExpr): T;
    visitLogicalExpr(logical: LogicalExpr): T;
    visitCallExpr(call: CallExpr): T;
    visitGetExpr(get: GetExpr): T;
    visitSetExpr(set: SetExpr): T;
    visitThisExpr(thisValue: ThisExpr): T;
}

export interface StmtVisitor<T> {
    visitExpressionStmt(stmt: ExpressionStmt): T;
    visitPrintStmt(stmt: PrintStmt): T;
    visitVarStmt(stmt: VarStmt): T;
    visitBlockStmt(stmt: BlockStmt): T;
    visitIfStmt(stmt: IfStmt): T;
    visitWhileStmt(stmt: WhileStmt): T;
    visitFunctionStmt(stmt: FunctionStmt): T;
    visitBreakStmt(stmt: BreakStmt): T;
    visitContinueStmt(stmt: ContinueStmt): T;
    visitReturnStmt(stmt: ReturnStmt): T;
    visitClassStmt(stmt: ClassStmt): T;
}