import { Token } from "./Scanner";

export interface ParseTreeNodeVisitor<T> {
    visitBinaryExpression(expr: BinaryExpression): T;
    visitVariableExpression(expr: VariableExpression): T;
    visitLiteralExpression(expr: LiteralExpression): T;
    visitCallExpression(expr: CallExpression): T;
    visitGroupingExpression(expr: GroupingExpression): T;
    
    visitBlock(stmt: BlockStatement): T;
    visitFunctionDeclaration(stmt: FunctionDeclarationStatement): T;
    visitVariableDeclaration(stmt: VariableDeclarationStatement): T;
    visitExpressionStatement(stmt: ExpressionStatement): T;
    visitReturnStatement(stmt: ReturnStatement): T;
}

export class Param { constructor(public name: Token, public type: Token) { } }

export abstract class ParseTreeNode { public readonly nodeType: string; constructor(public readonly token: Token) { this.nodeType = this.constructor.name; } get loc() { return this.token.loc; } get metas() { return this.token.metas; } get docComment() { return this.token.docComment; } abstract accept<T>(visitor: ParseTreeNodeVisitor<T>): T; }
export abstract class Expression extends ParseTreeNode { constructor(token: Token) { super(token); } }

export class BinaryExpression extends Expression {
    constructor(token: Token, public lhs: Expression, public operator: Token, public rhs: Expression) { super(token); }
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitBinaryExpression(this);
    }
}
export class VariableExpression extends Expression {
    constructor(token: Token) { super(token); }
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitVariableExpression(this);
    }
}
export class LiteralExpression extends Expression {
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitLiteralExpression(this);
    }
}
export class CallExpression extends Expression {
    constructor(token: Token, public callee: Expression, public args: Expression[]) { super(token); }
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitCallExpression(this);
    }
}
export class GroupingExpression extends Expression {
    constructor(token: Token, public expression: Expression) { super(token); }
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitGroupingExpression(this);
    }
}
export abstract class Statement extends ParseTreeNode { constructor(token: Token) { super(token); } }

export class BlockStatement extends Statement {
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitBlock(this);
    }
    constructor(token: Token, public statements: Statement[] = []) { super(token); }
}
export class FunctionDeclarationStatement extends Statement {
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitFunctionDeclaration(this);
    }
    constructor(token: Token, public name: Token, public parameters: Param[], public returnType: Token | undefined, public body: BlockStatement) { super(token); }
}
export class VariableDeclarationStatement extends Statement {
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitVariableDeclaration(this);
    }
    constructor(token: Token, public name: Token, public isConst: boolean = false, public type?: Token, public initializer?: Expression) { super(token); }
}
export class ExpressionStatement extends Statement {
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitExpressionStatement(this);
    }
    constructor(token: Token, public readonly expression: Expression) { super(token); }
}
export class ReturnStatement extends Statement {
    accept<T>(visitor: ParseTreeNodeVisitor<T>): T {
        return visitor.visitReturnStatement(this);
    }
    constructor(token: Token, public expression?: Expression) { super(token); }
}

export class ParseTreePrinter implements ParseTreeNodeVisitor<void> {
    private out: string = "";
    private indentAmount = 0;
    private newLine = true;

    constructor(private nodes: ParseTreeNode[]) { }

    visitCallExpression(expr: CallExpression): void {
        this.writeLine("CallExpression(");
        this.indent();
        this.write("callee = ");
        expr.callee.accept(this);
        this.writeLine("args = (");
        this.indent();
        for(const arg of expr.args) {
            arg.accept(this);
        }
        this.dedent();
        this.writeLine(")");
        this.dedent();
        this.writeLine(")");
    }

    visitGroupingExpression(expr: GroupingExpression): void {
        this.writeLine("GroupingExpression(");
        this.indent();
        expr.expression.accept(this);
        this.dedent();
        this.writeLine(")");
    }
    visitBinaryExpression(expr: BinaryExpression): void {
        this.writeLine("BinaryExpression(");
        this.indent();
        this.writeLine("operator = " + expr.operator.lexeme);
        this.write("lhs = ");
        expr.lhs.accept(this);

        this.write("rhs = ");
        expr.rhs.accept(this);
        
        this.dedent();
        this.writeLine(")");
    }

    indent() {
        this.indentAmount += 2;
    }

    dedent() {
        if (this.indentAmount >= 2) this.indentAmount -= 2;
    }

    write(str: string) {
        if (this.newLine) this.out += " ".repeat(this.indentAmount);
        this.out += str;
        this.newLine = false;
    }

    writeLine(str: string = "") {
        if (this.newLine) this.out += " ".repeat(this.indentAmount);
        this.out += str + "\n";
        this.newLine = true;
    }

    visitVariableExpression(expr: VariableExpression): void {
        this.writeLine(`VariableExpression(${expr.token.lexeme})`);
    }

    visitLiteralExpression(expr: LiteralExpression): void {
        this.writeLine(`Literal(${expr.token.literal})`);
    }
    visitBlock(stmt: BlockStatement): void {
        this.writeLine("Block(");
        this.indent();
        for (const s of stmt.statements) {
            s.accept(this);
        }
        this.dedent();
        this.writeLine(")");
    }
    visitFunctionDeclaration(stmt: FunctionDeclarationStatement): void {
        this.writeLine(`FunctionDeclaration(`);
        this.indent();
        this.writeLine(`name = ${stmt.name.lexeme}`);
        this.writeLine(`params = (${stmt.parameters.map(p => `${p.name.lexeme}: ${p.type.lexeme}`).join(', ')})`);
        this.writeLine(`returnType = ${stmt.returnType?.lexeme}`);
        this.write(`body = `);

        stmt.body.accept(this);

        this.dedent();
        this.writeLine(`)`);
    }

    visitVariableDeclaration(stmt: VariableDeclarationStatement): void {
        this.writeLine("VariableDeclaration(");
        this.indent();
        this.writeLine(`name = ${stmt.name.lexeme}`);
        this.writeLine(`type = ${stmt.type?.lexeme ?? "none"}`); 
        this.writeLine(`const? = ${(stmt.isConst ? "yes" : "no")}`);
        this.write(`initializer = `);

        if (stmt.initializer) {
            this.writeLine();
            this.indent();
            stmt.initializer.accept(this);
            this.dedent();
        } else {
            this.writeLine("none");
        }

        this.dedent();
        this.writeLine(")");
    }

    visitExpressionStatement(stmt: ExpressionStatement): void {
        stmt.expression.accept(this);
    }
    visitReturnStatement(stmt: ReturnStatement): void {
        this.writeLine(`ReturnStatement(`);
        if (stmt.expression) {
            this.indent();
            stmt.expression.accept(this);
            this.dedent();
        }
        else this.write("none");
        this.writeLine(`)`);
    }

    print(): string {
        for(const node of this.nodes) {
            node.accept(this);
        }
        return this.out;
    }
}