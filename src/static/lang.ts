import { Scanner, TokenType } from "./Scanner";

// const src = `
// let x: int = 5;
// let y: int; // == 0
// let z = 10; // int - infered

// fn foo(x: int, y: int): int => x + y; // int * int -> int
// fn foo(x: int, y: int) => x + y; // int * int -> int (infer)
// fn foo(x: int, y: int): int {
//     return x + y;
// }
// `;

const src = `
/** doc comment */
var x: int = 3;`;

console.log("Static lang init");
const s = new Scanner(src);

const tokens = s.scanTokens();

console.log(tokens.map(t => `${t.typeName} (${t.docComment?.text}) (${TokenType.isValidTypeIdentifier(t.type)})` ));

//console.log(tokens.map(t => t.toString()));

// Test location info

// for(const t of tokens) {
//     console.log(TokenType[t.type], t.lexeme);
//     console.log(src.substring(t.loc.offset, t.loc.offset + 5));
// }

for(const x in TokenType) { console.log(x); }