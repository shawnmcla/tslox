import { ParseTreeNode, FunctionDeclarationStatement, VariableDeclarationStatement, Statement, Expression, VariableExpression, BlockStatement, LiteralExpression, Param, ReturnStatement, BinaryExpression, CallExpression, GroupingExpression, ExpressionStatement } from "./ParseTree";
import { Token, TokenType, Location } from "./Scanner";

function parseNodeToString(node: ParseTreeNode) {
    if(node instanceof FunctionDeclarationStatement) {
        return `fn ${node.name.lexeme}(${node.parameters.map(p => `${p.name.lexeme}: ${p.type.lexeme}`).join(', ')})${(node.returnType ? `: ${node.returnType.lexeme}` : "")} { ...body }`;
    }

    if(node instanceof VariableDeclarationStatement) {
        const keyword = node.isConst ? "const" : "let";
        const name = node.name.lexeme;
        const type = node.type ? `: ${node.type.lexeme}` : "";
        const initializer = node.initializer ? `= ${node.initializer.token.lexeme}` : "";
        return `${keyword} ${name}${type} ${initializer};`;
    }

    return node.toString();
}

export enum ParseErrorType {
    General,
    UnexpectedToken,
}

export class ParseError extends Error {
    constructor(public type: ParseErrorType, public loc: Location, public message: string) { super(message); }
}

export class UnexpectedTokenError extends ParseError {
    constructor(public found: Token, public expected: TokenType, info?: string) { super(ParseErrorType.UnexpectedToken, found.loc, `Found '${found.lexeme}' but expected '${TokenType[expected]}${(info ? ` ${info}` : "")}.`) }
}

export class Parser {
    private cur = 0;

    constructor(private tokens: Token[]) { }

    parse(): BlockStatement {
        const statements: Statement[] = [];
        while (!this.isAtEnd) {
            statements.push(this.declaration()!);
        }
        return new BlockStatement(statements[0].token, statements);
    }

    get isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    error(token: Token, message: string): Error {
        //this.lox.error(token, message);
        return new ParseError(ParseErrorType.General, token.loc, message);
    }

    consume(type: TokenType, messageSuffix: string = ""): Token {
        if (this.check(type)) return this.advance();

        throw new UnexpectedTokenError(this.peek(), type, messageSuffix);
    }

    advance(): Token {
        if (!this.isAtEnd) this.cur++;
        return this.previous();
    }

    peek(): Token {
        return this.tokens[this.cur];
    }

    previous(): Token {
        return this.tokens[this.cur - 1];
    }

    check(type: TokenType): boolean {
        if (this.isAtEnd) return false;
        return this.peek().type === type;
    }

    match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }

        return false;
    }

    synchronize(): void {
        this.advance();

        while (!this.isAtEnd) {
            if (this.previous().type === TokenType.SEMICOLON) return;

            switch (this.peek().type) {
                case TokenType.CLASS:
                case TokenType.FN:
                case TokenType.LET:
                case TokenType.CONST:
                case TokenType.FOR:
                case TokenType.IF:
                case TokenType.WHILE:
                case TokenType.PRINT:
                case TokenType.BREAK:
                case TokenType.CONTINUE:
                case TokenType.RETURN:
                    return;
            }

            this.advance();
        }
    }

    expression(): Expression {
        return this.assignment();
    }

    assignment(): Expression {
        let expr = this.or();

        if (this.match(TokenType.EQUAL)) {
            const equals = this.previous();
            const value = this.assignment();

            if (expr instanceof VariableExpression) {
                const name = expr.name;
                return new AssignmentExpr(name, value);
            } else if (expr instanceof GetExpr) {
                return new SetExpr(expr.object, expr.name, value);
            } else if (expr instanceof IndexGetExpr) {
                return new IndexSetExpr(expr.bracket, expr.object, expr.index, value);
            }

            this.error(equals, "Invalid assignment target.");
        }

        return expr;
    }

    declaration(): Statement | undefined {
        try {
            //if (this.match(TokenType.CLASS)) return this.classDeclaration();
            if (this.match(TokenType.FN)) return this.functionDeclaration("function");
            if (this.match(TokenType.LET)) return this.varDeclaration();
            if (this.match(TokenType.CONST)) return this.varDeclaration(true);
            return this.statement();
        } catch (e) {
            if (e instanceof ParseError) {
                throw e; // for now
                this.synchronize();
                return;
            } else {
                throw e;
            }
        }
    }

    varDeclaration(isConst: boolean = false) {
        const token = this.previous();
        const name = this.consume(TokenType.IDENTIFIER);

        let type: Token | undefined;
        if (this.match(TokenType.COLON)) {
            if(this.match(...TokenType.IdentifierTypes)) {
                type = this.previous();
            } else {
                throw new UnexpectedTokenError(this.peek(), TokenType.IDENTIFIER, "in function return type");
            }
        }

        let initializer: Expression | undefined;
        
        if (this.match(TokenType.EQUAL)) {
            initializer = this.expression();
        }

        this.consume(TokenType.SEMICOLON, "after variable declaration.");
        return new VariableDeclarationStatement(token, name, isConst, type, initializer);
    }

    statement(): Statement {
        if (this.match(TokenType.FOR)) return this.forStatement();
        if (this.match(TokenType.FOREACH)) return this.foreachStatement();
        if (this.match(TokenType.IF)) return this.ifStatement();
        if (this.match(TokenType.PRINT)) return this.printStatement();
        if (this.match(TokenType.BREAK)) return this.breakStatement();
        if (this.match(TokenType.CONTINUE)) return this.continueStatement();
        if (this.match(TokenType.RETURN)) return this.returnStatement();
        if (this.match(TokenType.WHILE)) return this.whileStatement();
        if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block());
        return this.expressionStatement();
    }

    block(): BlockStatement {
        const token = this.previous();
        const statements: Statement[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd) {
            statements.push(this.declaration()!);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
        return new BlockStatement(token, statements);
    }

    ifStatement(): Statement {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

        const thenBranch = this.statement();
        let elseBranch: Statement | undefined;
        if (this.match(TokenType.ELSE)) {
            elseBranch = this.statement();
        }

        return new IfStmt(condition, thenBranch, elseBranch);
    }

    printStatement(): Statement {
        const value = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
        return new PrintStmt(value);
    }

    whileStatement(): Statement {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after while condition.");
        const body = this.statement();
        return new WhileStmt(condition, body);
    }

    foreachStatement(): Statement {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");
        this.consume(TokenType.VAR, "Expect 'var' after '('.")
        const valueVar = this.consume(TokenType.IDENTIFIER, "Expect identifier after 'var'.");
        this.consume(TokenType.IN, "Expect 'in' after identifier.");
        const target = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");

        let body = this.statement();

        const g = new CodeGenProvider();

        const indexDecl = g.declareVar("__i0", 0);
        const valueDecl = g.declareVar(valueVar.lexeme);
        const valueSet = g.setVar(valueDecl, g.getIndex(target, g.getVar("__i0")));

        const test = g.less(g.getVar("__i0"), g.callMethod(target, "len"));
        const increment = g.increment("__i0");
        return g.block(
            indexDecl,
            valueDecl,
            g.while(test, g.block(valueSet, body, increment)),
        );
    }

    forStatement(): Statement {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

        let initializer: Statement | undefined;
        if (this.match(TokenType.SEMICOLON)) {
            initializer = undefined;
        }
        else if (this.match(TokenType.VAR)) {
            initializer = this.varDeclaration();
        }
        else {
            initializer = this.expressionStatement();
        }

        let condition: Expression | undefined;
        if (!this.check(TokenType.SEMICOLON)) {
            condition = this.expression();
        }
        this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

        let increment: Expression | undefined;
        if (!this.check(TokenType.RIGHT_PAREN)) {
            increment = this.expression();
        }

        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");

        let body = this.statement();

        if (increment) {
            body = new BlockStmt(
                [
                    body,
                    new ExpressionStmt(increment)
                ]
            );
        }

        if (!condition) condition = new LiteralExpression(true);
        body = new WhileStmt(condition, body);

        if (initializer) body = new BlockStmt(
            [
                initializer,
                body
            ]
        );

        return body;
    }

    functionDeclaration(kind: string): FunctionDeclarationStatement {        
        const token = this.previous();
        
        let name = this.consume(TokenType.IDENTIFIER, "in function declaration");
        
        this.consume(TokenType.LEFT_PAREN, "after function name");
        const params: Param[] = [];
        while(this.match(TokenType.IDENTIFIER)) {
            const paramName = this.previous();
            this.consume(TokenType.COLON, "after parameter name");
            if(!this.match(...TokenType.IdentifierTypes)) {
                throw new UnexpectedTokenError(this.peek(), TokenType.IDENTIFIER, "in parameter list");
            }
            const paramType = this.previous();
            params.push(new Param(paramName, paramType));

            if(!this.match(TokenType.COMMA)) break;
        }

        this.consume(TokenType.RIGHT_PAREN, "after parameter list");
        
        let returnType: Token | undefined;
        if (this.match(TokenType.COLON)) {
            if(this.match(...TokenType.IdentifierTypes)) {
                returnType = this.previous();
            } else {
                throw new UnexpectedTokenError(this.peek(), TokenType.IDENTIFIER, "in function return type");
            }
        }
        
        this.consume(TokenType.LEFT_BRACE, "before function body");
        const body = this.block();
        return new FunctionDeclarationStatement(token, name, params, returnType, body)
    }

    classDeclaration(): Statement {
        const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");

        let superclass: VariableExpression | undefined;
        if (this.match(TokenType.LESS)) {
            this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
            superclass = new VariableExpression(this.previous());
        }

        this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

        const methods: FunctionStmt[] = [];
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd) {
            methods.push(this.functionDeclaration("method"));
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");
        return new ClassStmt(name, superclass, methods);
    }

    breakStatement(): Statement {
        this.consume(TokenType.SEMICOLON, "Expect ';' after break.");
        return new BreakStmt(this.previous());
    }

    continueStatement(): Statement {
        this.consume(TokenType.SEMICOLON, "Expect ';' after continue.");
        return new ContinueStmt(this.previous());
    }

    returnStatement(): Statement {
        const keyword = this.previous();
        let value: Expression | undefined;
        if (!this.check(TokenType.SEMICOLON)) {
            value = this.expression();
        }
        this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
        return new ReturnStatement(keyword, value);
    }

    expressionStatement(): Statement {
        const expr = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
        return new ExpressionStatement(expr.token, expr);
    }

    or(): Expression {
        let expr = this.and();

        while (this.match(TokenType.OR)) {
            const operator = this.previous();
            const right = this.and();
            expr = new LogicalExpr(expr, operator, right);
        }

        return expr;
    }

    and(): Expression {
        let expr = this.equality();

        while (this.match(TokenType.AND)) {
            const operator = this.previous();
            const right = this.equality();
            expr = new LogicalExpr(expr, operator, right);
        }

        return expr;
    }

    equality(): Expression {
        let expr = this.comparison();

        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            const operator = this.previous();
            const right = this.comparison();
            expr = new BinaryExpr(expr, operator, right);
        }

        return expr;
    }

    comparison(): Expression {
        let expr = this.term();

        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.term();
            expr = new BinaryExpr(expr, operator, right);
        }

        return expr;
    }

    term(): Expression {
        let expr = this.factor();

        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.previous();
            const right = this.factor();
            expr = new BinaryExpression(expr.token, expr, operator, right);
        }

        return expr;
    }

    factor(): Expression {
        let expr = this.unary();

        while (this.match(TokenType.SLASH, TokenType.STAR)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new BinaryExpression(expr.token, expr, operator, right);
        }

        return expr;
    }

    unary(): Expression {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            return new UnaryExpr(operator, right);
        }

        return this.call();
    }

    primary(): Expression {
        if(this.match(...TokenType.LiteralTypes)) { 
            return new LiteralExpression(this.previous());
        }

        // if (this.match(TokenType.SUPER)) {
        //     const keyword = this.previous();
        //     this.consume(TokenType.DOT, "Expect '.' after 'super'.");
        //     const method = this.consume(TokenType.IDENTIFIER, "Expect superclass method name.");
        //     return new SuperExpr(keyword, method);
        // }

        // if (this.match(TokenType.THIS)) {
        //     return new ThisExpr(this.previous());
        // }

        if (this.match(TokenType.IDENTIFIER)) {
            return new VariableExpression(this.previous());
        }

        if (this.match(TokenType.LEFT_PAREN)) {
            const paren = this.previous();
            const expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
            return new GroupingExpression(paren, expr);
        }

        // if (this.match(TokenType.FUN)) {
        //     const { parameters, body } = this.function("function expression");
        //     return new FunctionExpr(parameters, body);
        // }

        throw this.error(this.peek(), "Expect expression.");
    }

    finishCall(callee: Expression): Expression {
        const args: Expression[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (args.length >= 255) {
                    this.error(this.peek(), "Can't have more than 255 arguments.");
                }
                args.push(this.expression());
            } while (this.match(TokenType.COMMA));
        }

        const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

        return new CallExpression(paren, callee, args);
    }

    call(): Expression {
        let expr = this.primary();

        while (true) {
            if (this.match(TokenType.LEFT_PAREN)) {
                expr = this.finishCall(expr);
            } else if (this.match(TokenType.DOT)) {
                const name = this.consume(TokenType.IDENTIFIER, "Expect property name after '.'.");
                expr = new GetExpr(expr, name);
            } else if (this.match(TokenType.LEFT_BRACKET)) {
                const index = this.expression();
                this.consume(TokenType.RIGHT_BRACKET, "Expect ']' after index expression.");
                expr = new IndexGetExpr(this.previous(), expr, index);
            }
            else {
                break;
            }
        }

        return expr;
    }
}