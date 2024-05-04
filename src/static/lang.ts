import { AstCompiler } from "./Compiler";
import { ParseTreePrinter } from "./ParseTree";
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
//const src = `let foo: int = "abcdef";`
const src = `fn add2(x: int, y: int): int {
    return x  + y;
}

let result: int = add2(10, 3);
print("5 + 3 = ");
println(result);`

console.debug("SOURCE:\n", src);
console.debug("");
const s = new Scanner(src);

const tokens = s.scanTokens();

console.debug("TOKENS:\n",tokens.map(t => `${t.typeName}`));// (${t.docComment?.text}) [${t.metas.map(m => m.name).join(";")}]` ));
console.debug("");


const p = new Parser(tokens);
try{
    const result = p.parse();
    const printer = new ParseTreePrinter([result]);

    console.debug("PARSE TREE:\n", printer.print());
console.debug("");
    

    const compiler = new AstCompiler(result);
    const program = compiler.compile();
    
    //console.debug("PROGRAM:\n", program);
}catch(e) {
    console.error(e);
}

//console.log(tokens.map(t => t.toString()));

// Test location info

// for(const t of tokens) {
//     console.log(TokenType[t.type], t.lexeme);
//     console.log(src.substring(t.loc.offset, t.loc.offset + 5));
// }
