import { print } from "./Debug";

export enum Tok {
    // Single-character tokens.
    LEFT_PAREN, RIGHT_PAREN,
    LEFT_BRACE, RIGHT_BRACE,
    COMMA, DOT, MINUS, PLUS,
    SEMICOLON, SLASH, STAR,
    // One or two character tokens.
    BANG, BANG_EQUAL,
    EQUAL, EQUAL_EQUAL,
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,
    // Literals.
    IDENTIFIER, STRING, NUMBER,
    // Keywords.
    AND, CLASS, ELSE, FALSE,
    FOR, FUN, IF, NIL, OR,
    PRINT, RETURN, SUPER, THIS,
    TRUE, VAR, WHILE,

    ERROR, EOF
}

export class Token {
    constructor(public type: Tok, public start: number, public length: number, public line: number) { }
}

export class ErrorToken extends Token {
    constructor(public message: string, line: number) { super(Tok.ERROR, 0, message.length, line) }
}

const c0 = '0'.charCodeAt(0);
const c9 = '9'.charCodeAt(0);
const ca = 'a'.charCodeAt(0);
const cz = 'z'.charCodeAt(0);
const cA = 'A'.charCodeAt(0);
const cZ = 'Z'.charCodeAt(0);

export class Scanner {
    public start = 0;
    public current = 0;
    public line = 1;

    constructor(public source: string) { }

    isAtEnd() { return this.current >= this.source.length; }

    token(type: Tok) {
        return new Token(type, this.start, this.current - this.start, this.line);
    }

    errorToken(message: string) {
        console.error(message, this.line, this.start);
        return new ErrorToken(message, this.line);
    }

    advance(): string {
        return this.source[this.current++];
    }

    peek(): string {
        return this.source[this.current];
    }

    peekNext(): string {
        if (this.isAtEnd()) return '\0';
        return this.source[this.current + 1];
    }

    match(expected: string): boolean {
        if (this.isAtEnd()) return false;
        if (this.source[this.current] !== expected) return false;
        this.current++;
        return true;
    }

    skipWhitespace() {
        for (; ;) {
            const c = this.peek();
            switch (c) {
                case '\n':
                    this.line++;
                case ' ':
                case '\r':
                case '\t':
                    this.advance();
                    break;
                case '/':
                    if (this.peekNext() === '/') {
                        while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
                    } else {
                        return;
                    }
                    break;
                default:
                    return;
            }
        }
    }

    string(): Token {
        while (this.peek() !== '"' && !this.isAtEnd()) {
            if (this.peek() === '\n') this.line++;
            this.advance();
        }

        if (this.isAtEnd()) return this.errorToken("Unterminated string.");

        this.advance();
        return this.token(Tok.STRING);
    }

    number(): Token {
        while (this.isDigit(this.peek())) this.advance();

        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            this.advance();
            while (this.isDigit(this.peek())) this.advance();
        }

        return this.token(Tok.NUMBER);
    }

    checkKeyword(start: number, len: number, rest: string, type: Tok): Tok {
        if (this.current - this.start === start + len && this.source.substring(this.start + start, start + len) === rest) {
            return type;
        }
        return Tok.IDENTIFIER;
    }

    identifierType(): Tok {
        switch (this.source[this.start]) {
            case 'a': return this.checkKeyword(1, 2, "nd", Tok.AND);
            case 'c': return this.checkKeyword(1, 4, "lass", Tok.CLASS);
            case 'e': return this.checkKeyword(1, 3, "lse", Tok.ELSE);
            case 'f':
                if (this.current - this.start > 1) {
                    switch (this.source[this.start + 1]) {
                        case 'a': return this.checkKeyword(2, 3, "lse", Tok.FALSE);
                        case 'o': return this.checkKeyword(2, 1, "r", Tok.FOR);
                        case 'u': return this.checkKeyword(2, 1, "n", Tok.FUN);
                    }
                }
                break;
            case 'i': return this.checkKeyword(1, 1, "f", Tok.IF);
            case 'n': return this.checkKeyword(1, 2, "il", Tok.NIL);
            case 'o': return this.checkKeyword(1, 1, "r", Tok.OR);
            case 'p': return this.checkKeyword(1, 4, "rint", Tok.PRINT);
            case 'r': return this.checkKeyword(1, 5, "eturn", Tok.RETURN);
            case 's': return this.checkKeyword(1, 4, "uper", Tok.SUPER);
            case 't':
                if (this.current - this.start > 1) {
                    switch (this.source[this.start + 1]) {
                        case 'h': return this.checkKeyword(2, 2, "is", Tok.THIS);
                        case 'r': return this.checkKeyword(2, 2, "ue", Tok.TRUE);
                    }
                }
                break;
            case 'v': return this.checkKeyword(1, 2, "ar", Tok.VAR);
            case 'w': return this.checkKeyword(1, 4, "hile", Tok.WHILE);
        }

        return Tok.IDENTIFIER;
    }

    identifier(): Token {
        while (this.isAlpha(this.peek()) || this.isDigit(this.peek())) this.advance();
        return this.token(this.identifierType());
    }

    isDigit(c: string): boolean {
        const _c = c.charCodeAt(0);
        return _c >= c0 && _c <= c9;
    }

    isAlpha(c: string): boolean {
        const _c = c.charCodeAt(0);
        return c === '_' || (_c >= ca && _c <= cz) || (_c >= cA && _c <= cZ);
    }

    scanToken(): Token {
        this.skipWhitespace();
        this.start = this.current;
        if (this.isAtEnd()) return this.token(Tok.EOF);

        const c = this.advance();
        if (this.isDigit(c)) return this.number();
        if (this.isAlpha(c)) return this.identifier();
        switch (c) {
            case '(': return this.token(Tok.LEFT_PAREN);
            case ')': return this.token(Tok.RIGHT_PAREN);
            case '{': return this.token(Tok.LEFT_BRACE);
            case '}': return this.token(Tok.RIGHT_BRACE);
            case ';': return this.token(Tok.SEMICOLON);
            case ',': return this.token(Tok.COMMA);
            case '.': return this.token(Tok.DOT);
            case '-': return this.token(Tok.MINUS);
            case '+': return this.token(Tok.PLUS);
            case '/': return this.token(Tok.SLASH);
            case '*': return this.token(Tok.STAR);
            case '!':
                return this.token(
                    this.match('=') ? Tok.BANG_EQUAL : Tok.BANG);
            case '=':
                return this.token(
                    this.match('=') ? Tok.EQUAL_EQUAL : Tok.EQUAL);
            case '<':
                return this.token(
                    this.match('=') ? Tok.LESS_EQUAL : Tok.LESS);
            case '>':
                return this.token(
                    this.match('=') ? Tok.GREATER_EQUAL : Tok.GREATER);
            case '"':
                return this.string();
        }



        return this.errorToken("Unexpected character.");
    }
}

const DUMMY_EOF = new Token(Tok.EOF, 0, 0, 0);
export class Parser {
    public current: Token = DUMMY_EOF;
    public previous: Token = DUMMY_EOF;
    public hadError = false;
    public panicMode = false;
    public scanner: Scanner;

    constructor(source: string) { 
        this.scanner = new Scanner(source);
    }

    advance() {
        this.previous = this.current;

        for(;;){
            this.current = this.scanner.scanToken();
            if(!(this.current instanceof ErrorToken)) break;
            this.errorAtCurrent(this.current.message);
        }
    }

    errorAtCurrent(message: string) {
        this.errorAt(this.current, message);
    }

    error(message: string) {
        this.errorAt(this.previous, message);
    }

    errorAt(token: Token, message: string) {
        print(`[line ${token.line}] Error`);

        if(token.type === Tok.EOF) {
            print(" at end");
        } else if(token.type === Tok.ERROR) {

        } else {
            print(` at ${token.start}`);
        }

        print(": " + message + "\n");
        this.hadError = true;
    }
}
