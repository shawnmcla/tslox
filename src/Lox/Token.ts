import { Location } from "./Ast";
import { TokenType } from "./Token";


export class Token {
    constructor(public type: TokenType, public lexeme: string, public literal: any, public loc: Location) { }

    toString(): string {
        return `${TokenType[this.type]}(${this.lexeme})`;
    }
}
export enum TokenType {
    // Single-character tokens.
    LEFT_BRACKET, RIGHT_BRACKET,
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,
    COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

    // One or two character tokens.
    BANG, BANG_EQUAL,
    EQUAL, EQUAL_EQUAL,
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,

    // Literals.
    IDENTIFIER, MAGIC_IDENTIFIER, STRING, NUMBER,

    // Keywords.
    AND, CLASS, CONST, ELSE, FALSE, FUN, FOR, FOREACH, IF, NIL, OR, IN,
    PRINT, BREAK, CONTINUE, RETURN, SUPER, THIS, TRUE, VAR, WHILE,

    EOF, INTERNAL
}

