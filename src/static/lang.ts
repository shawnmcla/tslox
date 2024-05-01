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
#foo
#bar
5 + 2;`;

console.log("Static lang init");
const s = new Scanner(src);

const tokens = s.scanTokens();

console.log(tokens.map(t => `${t.typeName} (${t.docComment?.text}) [${t.metas.map(m => m.name).join(";")}]` ));

//console.log(tokens.map(t => t.toString()));

// Test location info

// for(const t of tokens) {
//     console.log(TokenType[t.type], t.lexeme);
//     console.log(src.substring(t.loc.offset, t.loc.offset + 5));
// }
