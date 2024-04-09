import { Lox } from "./Lox";

// class AstPrinter implements ExprVisitor<string> {
//     parenthesize(name: string, ...exprs: Expr[]): string {
//         const parts = [];
//         parts.push("(");
//         parts.push(name);
//         for (const expr of exprs) {
//             parts.push(" ");
//             parts.push(expr.accept(this));
//         }
//         parts.push(")");

//         return parts.join('');
//     }

//     visitBinaryExpr(binary: BinaryExpr): string {
//         return this.parenthesize(binary.operator.lexeme,
//             binary.left, binary.right);
//     }
//     visitGroupingExpr(grouping: GroupingExpr): string {
//         return this.parenthesize("group", grouping.expr);
//     }
//     visitLiteralExpr(literal: LiteralExpr): string {
//         if (literal.value == null) return "nil";
//         return literal.value.toString();
//     }
//     visitUnaryExpr(unary: UnaryExpr): string {
//         return this.parenthesize(unary.operator.lexeme, unary.right);
//     }
//     print(expr: Expr): string {
//         return expr.accept(this);
//     }
// }

// const s = `print 5 + (3 * 2);
// print 5;
// print "Hello world";
// print "one";
// print true;
// print 2 + 1;`;

// Lox.run(s);

// const s2 = `var a = 1000;
// print a;
// var b = 2500;
// print b;
// print "Added:";
// print a + b;
// a = -999;
// print a;
// print "Subbed";
// print a - b;`;

// Lox.run(s2);


const ss = `
var a = "global a";
var b = "global b";
var c = "global c";
{
  var a = "outer a";
  var b = "outer b";
  {
    var a = "inner a";
    print a;
    print b;
    print c;
  }
  print a;
  print b;
  print c;
}
print a;
print b;
print c;`

Lox.run(ss);