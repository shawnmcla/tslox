import { AstNode, Block, Expression, FunctionDeclaration, Return, Scope, ScopeType, TypeRef } from "./Ast";
import { BinaryExpression, BlockStatement, DeclarationStatement, ExpressionStatement, FunctionDeclarationStatement, LiteralExpression, ParseTreeNode, ParseTreeNodeVisitor, ReturnStatement, VariableDeclarationStatement, VariableExpression } from "./ParseTree";

export class Program {
    constructor(public root: AstNode) { }
}

export class AstCompiler implements ParseTreeNodeVisitor<AstNode> {
    private scopes: Scope[] = [];
    private decls: any[] = [];

    constructor(public parseTreeRoot: ParseTreeNode) { }

    topScope() {
        if(this.scopes.length) return this.scopes[this.scopes.length - 1];
    }

    enterScope(type: ScopeType) {
        const scope = new Scope(type, this.topScope());
        this.scopes.push(scope);
    }

    collectDeclarations(block: BlockStatement) {
        for(const stmt of block.statements){
            if(stmt instanceof DeclarationStatement) {
                this.decls.push(`${stmt.name}->${stmt.declType}`);
            }
        }
    }

    leaveScope() {
        this.scopes.pop();
    }

    compile(): Program {
        const program = new Program(this.parseTreeRoot.accept(this));
        console.log("DECLS", this.decls);
        return program;
    }

    visitBinaryExpression(expr: BinaryExpression): Binary {
        
    }

    visitVariableExpression(expr: VariableExpression): AstNode {
        throw new Error("Method not implemented.");
    }
    visitLiteralExpression(expr: LiteralExpression): AstNode {
        throw new Error("Method not implemented.");
    }
    visitBlock(stmt: BlockStatement): Block {
        const statements = [];

        this.enterScope(ScopeType.Block);
        for(const s of stmt.statements) {
            statements.push(s.accept(this));
        }

        return new Block(stmt, statements);
    }

    visitFunctionDeclaration(stmt: FunctionDeclarationStatement): FunctionDeclaration {
        const name = stmt.name.lexeme;
        const params: [string, TypeRef][] = [];
        const returnType = new TypeRef(stmt.returnType ? stmt.returnType.lexeme : "void");

        this.enterScope(ScopeType.Function);
        const scope = this.topScope();
        for(const param of params) {
            const name = param[0];
            const type = param[1];
        }   
        const statements = [];
        for(const s of stmt.body.statements) {
            statements.push(s.accept(this));
        }
        const body = new Block(stmt.body, statements)
        this.leaveScope();

        const fn = new FunctionDeclaration(
            stmt,
            name,
            params,
            returnType,
            body
        );

        console.debug("FUNCTION DECLARATION\n", fn.name);
        return fn; 
    }
    visitVariableDeclaration(stmt: VariableDeclarationStatement): AstNode {
        throw new Error("Method not implemented.");
    }
    visitExpressionStatement(stmt: ExpressionStatement): AstNode {
        throw new Error("Method not implemented.");
    }
    visitReturnStatement(stmt: ReturnStatement): Return {
        const expr = stmt.expression?.accept(this) as Expression;
        return new Return(stmt, expr);
    }
}