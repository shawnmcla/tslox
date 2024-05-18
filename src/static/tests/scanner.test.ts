import { test, expect, describe } from "bun:test";
import { ScanErrorType, Scanner, TokenType } from "../Scanner";
// TODO: Refactor test data into jsonc files maybe
describe("token", () => {
    test("isValidTypeIdentifier", () => {
        // Comprehensive true tests
        expect(TokenType.isValidTypeIdentifier(TokenType.IDENTIFIER)).toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.INT)).toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.FLOAT)).toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.STRING)).toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.BOOL)).toBeTrue();

        // Misc false tests
        expect(TokenType.isValidTypeIdentifier(TokenType.PLUS)).not.toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.BANG)).not.toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.CONTINUE)).not.toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.RETURN)).not.toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.SUPER)).not.toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.THIS)).not.toBeTrue();
        expect(TokenType.isValidTypeIdentifier(TokenType.TRUE)).not.toBeTrue();
    });
});

describe("scanner", () => {
    test("scanTokens (General)", () => {
        const tests: [string, string[]][] = [
            // Literally all of the tokens :)
            [": [ ] ( ) { } , . - + ; / * ! != = == > >= < <= => myIdent \"a string literal\" 12345 int float bool string and class const else false fn for foreach if nil or in break continue return super this true let while",
                ["COLON", "LEFT_BRACKET", "RIGHT_BRACKET",
                    "LEFT_PAREN", "RIGHT_PAREN", "LEFT_BRACE", "RIGHT_BRACE",
                    "COMMA", "DOT", "MINUS", "PLUS", "SEMICOLON", "SLASH", "STAR",
                    "BANG", "BANG_EQUAL",
                    "EQUAL", "EQUAL_EQUAL",
                    "GREATER", "GREATER_EQUAL",
                    "LESS", "LESS_EQUAL",
                    "ARROW", "IDENTIFIER", "STRING_LITERAL", "NUMBER",
                    "INT", "FLOAT", "BOOL", "STRING",
                    "AND", "CLASS", "CONST", "ELSE", "FALSE", "FN", "FOR", "FOREACH", "IF", "NIL", "OR", "IN",
                    "BREAK", "CONTINUE", "RETURN", "SUPER", "THIS", "TRUE", "LET", "WHILE", "EOF"]],
            // Realistic tests, ensuring whitespace does not matter
            ["let x: int = 5;", ["LET", "IDENTIFIER", "COLON", "INT", "EQUAL", "NUMBER", "SEMICOLON", "EOF"]],
            ["let     x:int=3   ;", ["LET", "IDENTIFIER", "COLON", "INT", "EQUAL", "NUMBER", "SEMICOLON", "EOF"]],
            [`fn add(
                x: int,
                y: float
            ): float {
                return        x + y;
            }
            `, ["FN", "IDENTIFIER", "LEFT_PAREN", "IDENTIFIER", "COLON", "INT", "COMMA", "IDENTIFIER", "COLON", "FLOAT", "RIGHT_PAREN", "COLON", "FLOAT", "LEFT_BRACE", "RETURN", "IDENTIFIER", "PLUS", "IDENTIFIER", "SEMICOLON", "RIGHT_BRACE", "EOF"]],
        ]

        for (const test of tests) {
            const source = test[0];
            const expected = test[1];
            const scanner = new Scanner(source);
            const tokens = scanner.scanTokens();

            expect(scanner.hasError).toBeFalse();
            expect(tokens.map(t => t.typeName)).toEqual(expected);
        }
    });

    // TODO: Add tests for escape characters once implemented
    test("scanTokens (String literals)", () => {
        const tests: [string, string][] = [
            [`"abc"`, "abc"],
            [`"a
b
c"`, "a\nb\nc"],
            [`   "a  b  c"  `, "a  b  c"],
            [`"a\\nb"`, "a\nb"],
            [`"\\ttabbed"`, "\ttabbed"],
        ];

        for (const test of tests) {
            const source = test[0];
            const expected = test[1];

            const scanner = new Scanner(source);
            const tokens = scanner.scanTokens();

            expect(scanner.hasError).toBeFalse();
            expect(tokens).toBeArrayOfSize(2); // string literal + EOF
            expect(tokens[0].type).toEqual(TokenType.STRING_LITERAL);
            expect(tokens[0].literal).toEqual(expected);
        }
    });

    test("scanTokens (String literals with errors)", () => {
        const tests: [string, ScanErrorType][] = [
            [`   "unterminated string   `, ScanErrorType.UnterminatedString],
            [`"foo\\xafafa"`, ScanErrorType.InvalidEscapeSequence],
        ];

        for (const test of tests) {
            const source = test[0];
            const expected = test[1];

            const scanner = new Scanner(source);
            scanner.scanTokens();
            expect(scanner.lastError.type).toEqual(expected);
        }
    });

    test("scanTokens (Number literals)", () => {
        const tests: [string, number][] = [
            ["0.1", 0.1],
            ["123", 123],
            ["123.45", 123.45],
            // Special literals
            //   binary
            ["0b1", 0b1],
            ["0b0001010", 0b1010],
            //   hex
            ["0xBEEF", 0xBEEF],
            ["0XCafE", 0xCAFE],
            // octal
            ["0o123", 0o123],
            ["0o0001", 0o1],
        ];

        for (const test of tests) {
            const source = test[0];
            const expected = test[1];

            const scanner = new Scanner(source);
            const tokens = scanner.scanTokens();

            expect(scanner.hasError).toBeFalse();
            expect(tokens).toBeArrayOfSize(2); // number literal + EOF
            expect(tokens[0].type).toEqual(TokenType.NUMBER);
            expect(tokens[0].literal).toEqual(expected);
        }
    });

    test("scanTokens (Number literals with errors)", () => {
        const tests: [string, ScanErrorType][] = [
            [`0b010103`, ScanErrorType.InvalidNumericLiteral],
            [`0b1119`, ScanErrorType.InvalidNumericLiteral],
            [`0o8`, ScanErrorType.InvalidNumericLiteral],
            [`0o0009`, ScanErrorType.InvalidNumericLiteral],
            [`0xGGGG`, ScanErrorType.InvalidNumericLiteral],
            [`0X00AFZ`, ScanErrorType.InvalidNumericLiteral],
        ];

        for (const test of tests) {
            const source = test[0];
            const expected = test[1];

            const scanner = new Scanner(source);
            scanner.scanTokens();

            expect(scanner.lastError.type).toEqual(expected);
        }
    });

    test("scanTokens (location tests)", () => {
        const tests: [string, [string, number, number][]][] = [
            ["let x = 0;", [
                ["LET", 0, 0],
                ["IDENTIFIER", 0, 4],
                ["EQUAL", 0, 6],
                ["NUMBER", 0, 8],
                ["SEMICOLON", 0, 9],
                ["EOF", 0, 9]
            ]],
            ["//foo comment\nfn bar(): int { \nreturn 100; }", [
                ["FN", 1, 14],
                ["IDENTIFIER", 1, 17],
                ["LEFT_PAREN", 1, 20],
                ["RIGHT_PAREN", 1, 21],
                ["COLON", 1, 22],
                ["INT", 1, 24],
                ["LEFT_BRACE", 1, 28],
                ["RETURN", 2, 31],
                ["NUMBER", 2, 38],
                ["SEMICOLON", 2, 41],
                ["RIGHT_BRACE", 2, 43],
                ["EOF", 2, 43],
            ]]
        ];

        for (const test of tests) {
            const source = test[0];
            const expected = test[1];

            const scanner = new Scanner(source);
            const tokens = scanner.scanTokens();

            expect(tokens.map(t => [t.typeName, t.loc.line, t.loc.offset])).toEqual(expected);
        }
    });

});