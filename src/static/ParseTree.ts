import { Token } from "./Scanner";

export class Param { constructor(public name: Token, public type: Token) { } }

export class ParseTreeNode { public readonly nodeType: string; constructor(public readonly token: Token) { this.nodeType = this.constructor.name; } get loc() { return this.token.loc; } get metas() { return this.token.metas; } get docComment() { return this.token.docComment; } }

export class Expression extends ParseTreeNode { constructor(token: Token) { super(token); } }
export class BinaryExpression extends Expression { constructor(token: Token, public lhs: Expression, public operator: Token, public rhs: Expression) { super(token); } }
// export class AddExpression extends BinaryExpression { }
// export class SubExpression extends BinaryExpression { }
// export class MulExpression extends BinaryExpression { }
// export class DivExpression extends BinaryExpression { }

export class VariableExpression extends Expression { constructor(token: Token) { super(token); } }
export class LiteralExpression extends Expression { }

export class Statement extends ParseTreeNode { constructor(token: Token) { super(token); } }
export class Block extends Statement { constructor(token: Token, public statements: Statement[] = []) { super(token); } }
export class FunctionDeclaration extends Statement { constructor(token: Token, public name: Token, public parameters: Param[], public returnType: Token | undefined, public body: Block) { super(token); } }
export class VariableDeclaration extends Statement { constructor(token: Token, public name: Token, public isConst: boolean = false, public type?: Token, public initializer?: Expression) { super(token); } }
export class ExpressionStatement extends Statement { constructor(token: Token, public readonly expression: Expression) { super(token); } }
export class ReturnStatement extends Statement { constructor(token: Token, public expression?: Expression) { super(token); } }
