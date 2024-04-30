import { AssignmentExpr, BinaryExpr, BlockStmt, BreakStmt, CallExpr, ClassStmt, ContinueStmt, Expr, ExpressionStmt, FunctionExpr, FunctionStmt, GetExpr, GroupingExpr, IfStmt, IndexGetExpr, IndexSetExpr, LiteralExpr, LogicalExpr, PrintStmt, ReturnStmt, SetExpr, Stmt, SuperExpr, ThisExpr, Token, TokenType, UnaryExpr, VarStmt, VariableExpr, WhileStmt } from "./Ast";
import { ParseError } from "./Errors";
import { Lox } from "./Lox";

interface FunctionDefinition {
    parameters: Token[],
    body: Stmt[],
    isGetter?: boolean,
}

export class Parser {
    private tokens: Token[] = [];
    private cur = 0;

    constructor(private lox: Lox, tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): Stmt[] {
        const statements: Stmt[] = [];
        while (!this.isAtEnd) {
            statements.push(this.declaration()!);
        }
        return statements;
    }

    get isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    error(token: Token, message: string): Error {
        this.lox.error(token, message);
        return new ParseError();
    }

    consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();

        throw this.error(this.peek(), message);
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
                case TokenType.FUN:
                case TokenType.VAR:
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

    expression(): Expr {
        return this.assignment();
    }

    assignment(): Expr {
        let expr = this.or();

        if (this.match(TokenType.EQUAL)) {
            const equals = this.previous();
            const value = this.assignment();

            if (expr instanceof VariableExpr) {
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

    declaration(): Stmt | undefined {
        try {
            if (this.match(TokenType.CLASS)) return this.classDeclaration();
            if (this.match(TokenType.FUN)) return this.functionStatement("function");
            if (this.match(TokenType.VAR)) return this.varDeclaration();
            if (this.match(TokenType.CONST)) return this.varDeclaration(true);
            return this.statement();
        } catch (e) {
            if (e instanceof ParseError) {
                this.synchronize();
                return;
            } else {
                throw e;
            }
        }
    }

    varDeclaration(isConst: boolean = false) {
        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

        let initializer: Expr | undefined;
        // If declared with 'const', we MUST have an initializer
        if (isConst) {
            this.consume(TokenType.EQUAL, "Missing initializer in const variable declaration.");
            initializer = this.expression();
        }
        else if (this.match(TokenType.EQUAL)) {
            initializer = this.expression();
        }

        this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
        return new VarStmt(name, initializer, isConst);
    }

    statement(): Stmt {
        if (this.match(TokenType.FOR)) return this.forStatement();
        if (this.match(TokenType.IF)) return this.ifStatement();
        if (this.match(TokenType.PRINT)) return this.printStatement();
        if (this.match(TokenType.BREAK)) return this.breakStatement();
        if (this.match(TokenType.CONTINUE)) return this.continueStatement();
        if (this.match(TokenType.RETURN)) return this.returnStatement();
        if (this.match(TokenType.WHILE)) return this.whileStatement();
        if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block());
        return this.expressionStatement();
    }

    block(): Stmt[] {
        const statements: Stmt[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd) {
            statements.push(this.declaration()!);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
        return statements;
    }

    ifStatement(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

        const thenBranch = this.statement();
        let elseBranch: Stmt | undefined;
        if (this.match(TokenType.ELSE)) {
            elseBranch = this.statement();
        }

        return new IfStmt(condition, thenBranch, elseBranch);
    }

    printStatement(): Stmt {
        const value = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
        return new PrintStmt(value);
    }

    whileStatement(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after while condition.");
        const body = this.statement();
        return new WhileStmt(condition, body);
    }

    forStatement(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

        let initializer: Stmt | undefined;
        if (this.match(TokenType.SEMICOLON)) {
            initializer = undefined;
        }
        else if (this.match(TokenType.VAR)) {
            initializer = this.varDeclaration();
        }
        else {
            initializer = this.expressionStatement();
        }

        let condition: Expr | undefined;
        if (!this.check(TokenType.SEMICOLON)) {
            condition = this.expression();
        }
        this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

        let increment: Expr | undefined;
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

        if (!condition) condition = new LiteralExpr(true);
        body = new WhileStmt(condition, body);

        if (initializer) body = new BlockStmt(
            [
                initializer,
                body
            ]
        );

        return body;
    }

    functionStatement(kind: string): FunctionStmt {
        let name: Token;
        if(kind === "method" && this.peek().type === TokenType.MAGIC_IDENTIFIER) {
            name = this.consume(TokenType.MAGIC_IDENTIFIER, `Expect ${kind} name.`);
        }
        else {
            name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
        }
        const { parameters, body, isGetter } = this.function(kind);
        return new FunctionStmt(name, parameters, body, isGetter ?? false);
    }

    function(kind: string): FunctionDefinition {
        if (kind === "method" && this.match(TokenType.LEFT_BRACE)) {
            return { parameters: [], body: this.block(), isGetter: true };
        }

        this.consume(TokenType.LEFT_PAREN,
            kind === "function expression" ?
                `Expect '(' after fun keyword.` :
                `Expect '(' after ${kind} name.`
        );

        const parameters: Token[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (parameters.length >= 255) {
                    this.error(this.peek(), "Can't have more than 255 parameters.");
                }

                parameters.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
            } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");

        this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
        const body = this.block();
        return {
            parameters, body
        }
    }

    classDeclaration(): Stmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");

        let superclass: VariableExpr | undefined;
        if (this.match(TokenType.LESS)) {
            this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
            superclass = new VariableExpr(this.previous());
        }

        this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

        const methods: FunctionStmt[] = [];
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd) {
            methods.push(this.functionStatement("method"));
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");
        return new ClassStmt(name, superclass, methods);
    }

    breakStatement(): Stmt {
        this.consume(TokenType.SEMICOLON, "Expect ';' after break.");
        return new BreakStmt(this.previous());
    }

    continueStatement(): Stmt {
        this.consume(TokenType.SEMICOLON, "Expect ';' after continue.");
        return new ContinueStmt(this.previous());
    }

    returnStatement(): Stmt {
        const keyword = this.previous();
        let value: Expr | undefined;
        if (!this.check(TokenType.SEMICOLON)) {
            value = this.expression();
        }
        this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
        return new ReturnStmt(keyword, value);
    }

    expressionStatement(): Stmt {
        const expr = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
        return new ExpressionStmt(expr);
    }

    or(): Expr {
        let expr = this.and();

        while (this.match(TokenType.OR)) {
            const operator = this.previous();
            const right = this.and();
            expr = new LogicalExpr(expr, operator, right);
        }

        return expr;
    }

    and(): Expr {
        let expr = this.equality();

        while (this.match(TokenType.AND)) {
            const operator = this.previous();
            const right = this.equality();
            expr = new LogicalExpr(expr, operator, right);
        }

        return expr;
    }

    equality(): Expr {
        let expr = this.comparison();

        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            const operator = this.previous();
            const right = this.comparison();
            expr = new BinaryExpr(expr, operator, right);
        }

        return expr;
    }

    comparison(): Expr {
        let expr = this.term();

        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.term();
            expr = new BinaryExpr(expr, operator, right);
        }

        return expr;
    }

    term(): Expr {
        let expr = this.factor();

        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.previous();
            const right = this.factor();
            expr = new BinaryExpr(expr, operator, right);
        }

        return expr;
    }

    factor(): Expr {
        let expr = this.unary();

        while (this.match(TokenType.SLASH, TokenType.STAR)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new BinaryExpr(expr, operator, right);
        }

        return expr;
    }

    unary(): Expr {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            return new UnaryExpr(operator, right);
        }

        return this.call();
    }

    primary(): Expr {
        if (this.match(TokenType.FALSE)) return new LiteralExpr(false);
        if (this.match(TokenType.TRUE)) return new LiteralExpr(true);
        if (this.match(TokenType.NIL)) return new LiteralExpr(null);

        if (this.match(TokenType.NUMBER, TokenType.STRING)) {
            return new LiteralExpr(this.previous().literal);
        }

        if (this.match(TokenType.SUPER)) {
            const keyword = this.previous();
            this.consume(TokenType.DOT, "Expect '.' after 'super'.");
            const method = this.consume(TokenType.IDENTIFIER, "Expect superclass method name.");
            return new SuperExpr(keyword, method);
        }

        if (this.match(TokenType.THIS)) {
            return new ThisExpr(this.previous());
        }

        if (this.match(TokenType.IDENTIFIER)) {
            return new VariableExpr(this.previous());
        }

        if (this.match(TokenType.LEFT_PAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
            return new GroupingExpr(expr);
        }

        if (this.match(TokenType.FUN)) {
            const { parameters, body } = this.function("function expression");
            return new FunctionExpr(parameters, body);
        }

        throw this.error(this.peek(), "Expect expression.");
    }

    finishCall(callee: Expr): Expr {
        const args: Expr[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                if (args.length >= 255) {
                    this.error(this.peek(), "Can't have more than 255 arguments.");
                }
                args.push(this.expression());
            } while (this.match(TokenType.COMMA));
        }

        const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

        return new CallExpr(callee, paren, args);
    }

    call(): Expr {
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