export interface Location {
    file: string;
    line: number;
    offset: number;
}

export class DocComment {
    constructor(public text: string, public loc: Location) { }
}

export class Meta {
    constructor(public name: string, public data: any) { }
}

export class Token {
    constructor(public type: TokenType, public lexeme: string, public literal: any, public loc: Location, public docComment?: DocComment, public metas: Meta[] = []) { }

    get typeName() { return TokenType[this.type]; }

    toString(): string {
        return `${TokenType[this.type]}(${this.lexeme})<line ${this.loc.line}, offset ${this.loc.offset}>`;
    }
}

export enum TokenType {
    // Single-character tokens.
    COLON, LEFT_BRACKET, RIGHT_BRACKET,
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
    COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

    // One or two character tokens.
    BANG, BANG_EQUAL,
    EQUAL, EQUAL_EQUAL,
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,

    ARROW,

    // Literals.
    IDENTIFIER, STRING_LITERAL, NUMBER,

    // Keywords.
    // -- Type names
    INT, FLOAT, BOOL, STRING,
    // -- Others
    AND, CLASS, CONST, ELSE, FALSE, FN, FOR, FOREACH, IF, NIL, OR, IN,
    PRINT, BREAK, CONTINUE, RETURN, SUPER, THIS, TRUE, LET, WHILE,

    EOF, INTERNAL
}

export namespace TokenType {
    const _identifierTypes = [TokenType.IDENTIFIER, TokenType.INT, TokenType.FLOAT, TokenType.STRING, TokenType.BOOL];
    export function isValidTypeIdentifier(type: TokenType) {
        return _identifierTypes.includes(type);
    }
}

const c0 = '0'.charCodeAt(0);
const c7 = '7'.charCodeAt(0);
const c9 = '9'.charCodeAt(0);
const ca = 'a'.charCodeAt(0);
const cz = 'z'.charCodeAt(0);
const cA = 'A'.charCodeAt(0);
const cF = 'F'.charCodeAt(0);
const cZ = 'Z'.charCodeAt(0);

export enum ScanErrorType {
    UnterminatedString,
    InvalidEscapeSequence,
    UnexpectedCharacter,
    InvalidNumericLiteral
}

export class ScanError extends Error {
    constructor(public type: ScanErrorType, public loc: Location, public message: string) { super(message); }
}

export class Scanner {
    private scanErrors: ScanError[] = [];
    private tokens: Token[] = [];
    private cur: number = 0;
    private start: number = 0;
    private line: number = 0;
    private isAtStartOfLine: boolean = true;
    private docComment?: DocComment;
    private metas: Meta[] = [];

    get hasError(): boolean { return this.scanErrors.length > 0 }
    get lastError(): ScanError { return this.scanErrors[this.scanErrors.length - 1] }

    private static keywords: Map<string, TokenType> = new Map(
        [
            ["int", TokenType.INT],
            ["float", TokenType.FLOAT],
            ["bool", TokenType.BOOL],
            ["string", TokenType.STRING],

            ["and", TokenType.AND],
            ["class", TokenType.CLASS],
            ["const", TokenType.CONST],
            ["else", TokenType.ELSE],
            ["false", TokenType.FALSE],
            ["for", TokenType.FOR],
            ["foreach", TokenType.FOREACH],
            ["in", TokenType.IN],
            ["fn", TokenType.FN],
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
            ["let", TokenType.LET],
            ["while", TokenType.WHILE],
        ]
    );

    constructor(public source: string, public fileName: string = "") { }

    get isAtEnd(): boolean {
        return this.cur >= this.source.length;
    }

    isDigit(c: string): boolean {
        const cc = c.charCodeAt(0);
        return cc >= c0 && cc <= c9;
    }

    isValidHexDigit(c: string): boolean {
        const cdigit = c.toUpperCase().charCodeAt(0);
        return cdigit >= c0 && cdigit <= c9 || cdigit >= cA && cdigit <= cF;
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

    previous(): string {
        if (this.cur === 0) return '\0';
        return this.source[this.cur - 1];
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

    getLocation(): Location {
        return { file: this.fileName, line: this.line, offset: this.start };
    }

    addToken(type: TokenType, literal: any = null): void {
        const text = this.source.substring(this.start, this.cur);
        this.tokens.push(new Token(type, text, literal, this.getLocation(), this.docComment, this.metas));
        // We consumed these if they existed
        this.docComment = undefined;
        this.metas = [];
        // This is now necessarily false
        this.isAtStartOfLine = false;
    }

    string(): void {
        let error = false;
        const chars = [];
        while (this.peek() != '"' && !this.isAtEnd) {
            if (this.peek() === '\\') { // Escape char
                this.advance();
                switch (this.peek()) {
                    case 'b':
                        chars.push('\b');
                        break;
                    case 'f':
                        chars.push('\f');
                        break;
                    case 'n':
                        chars.push('\n');
                        break;
                    case 'r':
                        chars.push('\r');
                        break;
                    case 't':
                        chars.push('\t');
                        break;
                    case 'v':
                        chars.push('\v');
                        break;
                    case '0':
                        chars.push('\0');
                        break;
                    case "'":
                        chars.push("'");
                        break;
                    case '"':
                        chars.push('"');
                        break;
                    case '\\':
                        chars.push('\\');
                        break;
                    default:
                        this.error(ScanErrorType.InvalidEscapeSequence, `Invalid escape sequence:\\${this.peek()}`);
                        error = true;
                        break;
                }
                this.advance();
            } else {
                if (this.peek() == '\n') this.line++;
                chars.push(this.advance());
            }
        }

        // TODO: This assumes that we want to keep scanning after an error..
        if(error) {
            // Fast forward to closing "
            while(!this.isAtEnd && this.peek() !== '"') this.advance();
        }

        if (this.isAtEnd) {
            this.error(ScanErrorType.UnterminatedString, "Unterminated string.");
            return;
        } 

        // The closing ".
        this.advance();

        const value = chars.join('');
        this.addToken(TokenType.STRING_LITERAL, value);
    }

    binaryLiteral(): void {
        // Skip 'b'
        this.advance();

        while (this.isDigit(this.peek())) {
            const digit = this.advance();
            if (digit !== "0" && digit !== "1") {
                this.error(ScanErrorType.InvalidNumericLiteral, "Binary number literal can only contain '1' or '0'");
            }
        }

        this.addToken(TokenType.NUMBER,
            parseInt(this.source.substring(this.start + 2, this.cur), 2));
    }

    hexLiteral(): void {
        // Skip 'x'
        this.advance();

        while (true) {
            const digit = this.peek();

            if (!this.isAlphaNumeric(digit) || this.isAtEnd) break;

            if (this.isAlphaNumeric(digit) && !this.isValidHexDigit(digit)) {
                this.error(ScanErrorType.InvalidNumericLiteral, "Hexadecimal number literal can only contain digits between 0 and 9 or letters between A and F");
                break;
            }

            this.advance();
        }

        this.addToken(TokenType.NUMBER,
            parseInt(this.source.substring(this.start + 2, this.cur), 16));
    }

    octalLiteral(): void {
        // Skip 'o'
        this.advance();

        while (this.isDigit(this.peek())) {
            const digit = this.advance();
            const cdigit = digit.charCodeAt(0);
            if (cdigit < c0 || cdigit > c7 - 2) {
                this.error(ScanErrorType.InvalidNumericLiteral, "Octal number literal can only contain digits between '0' and '7'");
            }
        }

        this.addToken(TokenType.NUMBER,
            parseInt(this.source.substring(this.start + 2, this.cur), 8));
    }

    // TODO: Allow _ as separator, following same logic as JS
    number(): void {
        // Check for special literals
        // 0o | 0O = Octal
        // Ob | 0B = Binary
        // 0x | 0X = Hex
        if (this.previous() === "0") {
            if (this.peek().toLowerCase() === "o") return this.octalLiteral();
            else if (this.peek().toLowerCase() === "x") return this.hexLiteral();
            else if (this.peek().toLowerCase() === "b") return this.binaryLiteral();
        }

        // For all other cases, parse as regular decimal number, regardless of leading 0s
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

    comment(singleLine: boolean) {
        if (singleLine) {
            while (this.peek() != '\n' && !this.isAtEnd) this.advance();
        } else {
            // If the block comment begins with '/**' then we consider it a doc comment
            let isDocComment = this.match('*');
            const startLine = this.line;

            while (!this.isAtEnd && this.peek() !== '*' && this.peekNext() !== '/') {
                if (this.advance() === '\n') {
                    this.line++;
                }
            }
            this.advance();
            this.advance();
            if (isDocComment) {
                const commentText = this.source.substring(this.start + 3, this.cur - 2);
                this.docComment = new DocComment(commentText, { file: this.fileName, line: startLine, offset: this.start });
            }
        }
    }

    meta() {
        while(!this.isAtEnd && this.peek() !== '\n') this.advance();
        const metaName = this.source.substring(this.start + 1, this.cur);
        this.metas.push(new Meta(metaName, null));
    }

    scanToken(): void {
        const c = this.advance();
        switch (c) {
            case ':': this.addToken(TokenType.COLON); break;
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
                if (this.match('>')) this.addToken(TokenType.ARROW);
                else this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
                break;
            case '<':
                this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
                break;
            case '>':
                this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;
            case '/':
                if (this.match('/')) {
                    this.comment(true);
                } else if (this.match('*')) {
                    this.comment(false);
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
                this.isAtStartOfLine = true;
                break;
            case '"': this.string(); break;
            default:
                if(c === '#' && this.isAtStartOfLine) {
                    this.meta();
                }
                else if (this.isDigit(c)) {
                    this.number();
                } else if (this.isAlpha(c)) {
                    this.identifier();
                } else {
                    this.error(ScanErrorType.UnexpectedCharacter, `Unexpected character '${c}'`);
                }
                break;
        }
    }

    scanTokens(): Token[] {
        while (!this.isAtEnd) {
            this.start = this.cur;
            this.scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, "", null, this.getLocation()));
        
        return this.tokens;
    }

    error(type: ScanErrorType, message: string, location?: Location): void {
        if (!location) location = this.getLocation();
        this.scanErrors.push(new ScanError(type, location, message));
        console.error(`${type} at line ${location.line}: ${message}`);
    }
} 