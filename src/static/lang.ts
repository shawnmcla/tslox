import { Parser } from "./Parser";
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

//const src = `fn addSub10(x: int, y:int): int { return x + y - 10; }`;
//const src = `fn add(x: int, y:int): int { return x + y; }`;
const src = `let foo: int = "abcdef";`

console.log("Static lang init");
const s = new Scanner(src);

const tokens = s.scanTokens();

console.log(tokens.map(t => `${t.typeName}`))// (${t.docComment?.text}) [${t.metas.map(m => m.name).join(";")}]` ));

const p = new Parser(tokens);
try{
    p.parse();
}catch(e) {
    console.error(e);
}

//console.log(tokens.map(t => t.toString()));

// Test location info

// for(const t of tokens) {
//     console.log(TokenType[t.type], t.lexeme);
//     console.log(src.substring(t.loc.offset, t.loc.offset + 5));
// }
