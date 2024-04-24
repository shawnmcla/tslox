import { Token, TokenType } from "./Ast";
import { Lox } from "./Lox";

const c0 = '0'.charCodeAt(0);
const c9 = '9'.charCodeAt(0);
const ca = 'a'.charCodeAt(0);
const cz = 'z'.charCodeAt(0);
const cA = 'A'.charCodeAt(0);
const cZ = 'Z'.charCodeAt(0);

export class Scanner {
    private tokens: Token[] = [];
    private cur: number = 0;
    private start: number = 0;
    private line: number = 0;
    private file: string = "";

    private static keywords: Map<string, TokenType> = new Map(
        [
            ["and", TokenType.AND],
            ["class", TokenType.CLASS],
            ["const", TokenType.CONST],
            ["else", TokenType.ELSE],
            ["false", TokenType.FALSE],
            ["for", TokenType.FOR],
            ["fun", TokenType.FUN],
            ["if", TokenType.IF],
            ["nil", TokenType.NIL],
            ["or", TokenType.OR],
            ["print", TokenType.PRINT],
            ["break", TokenType.BREAK],
            ["continue", TokenType.CONTINUE],
            ["return", TokenType.RETURN],
            ["super", TokenType.SUPER],
            ["this", TokenType.THIS],
            ["true", TokenType.TRUE],
            ["var", TokenType.VAR],
            ["while", TokenType.WHILE],
        ]
    );

    constructor(private lox: Lox, public source: string) { }

    get isAtEnd(): boolean {
        return this.cur >= this.source.length;
    }

    isDigit(c: string): boolean {
        const cc = c.charCodeAt(0);
        return cc >= c0 && cc <= c9;
    }

    isAlpha(c: string): boolean {
        const cc = c.charCodeAt(0);
        return c === "_" || (cc >= ca && cc <= cz) || (cc >= cA && cc <= cZ);
    }

    isAlphaNumeric(c: string): boolean {
        return this.isAlpha(c) || this.isDigit(c);
    }

    advance(): string {
        return this.source[this.cur++];
    }

    peek(): string {
        if (this.isAtEnd) return '\0';
        return this.source[this.cur];
    }

    peekNext(): string {
        if (this.cur + 1 >= this.source.length) return '\0';
        return this.source[this.cur + 1];
    }

    match(expected: string): boolean {
        if (this.isAtEnd) return false;
        if (this.source[this.cur] !== expected) return false;

        this.cur++;
        return true;
    }

    addToken(type: TokenType, literal: any = null): void {
        const text = this.source.substring(this.start, this.cur);
        this.tokens.push(new Token(type, text, literal, { file: this.file, line: this.line, offset: this.start}));
    }

    string(): void {
        while (this.peek() != '"' && !this.isAtEnd) {
            if (this.peek() == '\n') this.line++;
            this.advance();
        }

        if (this.isAtEnd) {
            this.lox.error(this.line, "Unterminated string.");
            return;
        }

        // The closing ".
        this.advance();

        // Trim the surrounding quotes.
        const value = this.source.substring(this.start + 1, this.cur - 1);
        this.addToken(TokenType.STRING, value);
    }

    number(): void {
        while (this.isDigit(this.peek())) this.advance();

        // Look for a fractional part.
        if (this.peek() == '.' && this.isDigit(this.peekNext())) {
            // Consume the "."
            this.advance();

            while (this.isDigit(this.peek())) this.advance();
        }

        this.addToken(TokenType.NUMBER,
            parseFloat(this.source.substring(this.start, this.cur)));
    }

    identifier(): void {
        while (this.isAlphaNumeric(this.peek())) this.advance();
        const text = this.source.substring(this.start, this.cur);
        let tokenType = TokenType.IDENTIFIER;

        if (Scanner.keywords.has(text)) {
            tokenType = Scanner.keywords.get(text)!;
        }

        this.addToken(tokenType);
    }

    scanToken(): void {
        const c = this.advance();
        switch (c) {
            case '[': this.addToken(TokenType.LEFT_BRACKET); break;
            case ']': this.addToken(TokenType.RIGHT_BRACKET); break;
            case '(': this.addToken(TokenType.LEFT_PAREN); break;
            case ')': this.addToken(TokenType.RIGHT_PAREN); break;
            case '{': this.addToken(TokenType.LEFT_BRACE); break;
            case '}': this.addToken(TokenType.RIGHT_BRACE); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case '.': this.addToken(TokenType.DOT); break;
            case '-': this.addToken(TokenType.MINUS); break;
            case '+': this.addToken(TokenType.PLUS); break;
            case ';': this.addToken(TokenType.SEMICOLON); break;
            case '*': this.addToken(TokenType.STAR); break;
            case '!':
                this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
                break;
            case '=':
                this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
                break;
            case '<':
                this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
                break;
            case '>':
                this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;
            case '/':
                if (this.match('/')) {
                    // A comment goes until the end of the line.
                    while (this.peek() != '\n' && !this.isAtEnd) this.advance();
                } else {
                    this.addToken(TokenType.SLASH);
                }
                break;
            case ' ':
            case '\r':
            case '\t':
                // Ignore whitespace.
                break;
            case '\n':
                this.line++;
                break;
            case '"': this.string(); break;

            default:
                if (this.isDigit(c)) {
                    this.number();
                } else if (this.isAlpha(c)) {
                    this.identifier();
                } else {
                    this.lox.error(this.line, "Unexpected character.");
                }
                break;
        }
    }

    scanTokens(): Token[] {
        while (!this.isAtEnd) {
            this.start = this.cur;
            this.scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, "", null, { file: this.file, line: this.line, offset: this.start }));
        return this.tokens;
    }
}