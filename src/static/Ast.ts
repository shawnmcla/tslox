import { ParseTreeNode } from "./ParseTree";

export enum ScopeItemKind {
    Type,
    Function,
    Variable,
}

export abstract class ScopeItem { constructor(public readonly name: string, public readonly kind: ScopeItemKind) { } }

export class TypeInfo extends ScopeItem {
    constructor(name: string, public parent?: TypeInfo) {
        super(name, ScopeItemKind.Type);
    }

    satisfies(type: TypeInfo): boolean {
        if (type === this || type.name === this.name) return true;
        return this.parent?.satisfies(type) ?? false;
    }
}

export class TypeRef {
    public resolved: boolean;
    constructor(public name: string, public typeInfo?: TypeInfo) {
        this.resolved = !!typeInfo;
    }
}

export class VariableInfo extends ScopeItem {
    constructor(name: string, public type: TypeInfo, public isConst: boolean = false) { super(name, ScopeItemKind.Variable); }
}

export class ParamInfo {
    constructor(public name: string, public type: TypeInfo) { }
}

export class FunctionInfo extends ScopeItem {
    constructor(name: string, public params: ParamInfo[], public returnType: TypeInfo) { super(name, ScopeItemKind.Function); }
}

export enum ScopeDefinitionResult {
    New,
    ExistsInThisScope,
    ExistsInHigherScope
}

export enum ScopeType {
    Root,
    Block,
    Function,
}

export const BaseTypes: Record<string, TypeInfo> = {
    int: new TypeInfo("int"),
    float: new TypeInfo("float"),
    string: new TypeInfo("string"),
    bool: new TypeInfo("bool"),
    void: new TypeInfo("void"),
    nil: new TypeInfo("nil")
}

export class Scope {
    private items: Record<string, ScopeItem> = {};

    constructor(public type: ScopeType, public parent?: Scope) {
        // Load base types if this is a root scope
        if (type === ScopeType.Root) {
            for (const name in BaseTypes) {
                this.items[name] = BaseTypes[name];
            }
        }
    }

    define(name: string, item: ScopeItem): ScopeDefinitionResult {
        if (this.getByNameImmediate(name) !== undefined) return ScopeDefinitionResult.ExistsInThisScope;
        this.items[name] = item;
        if (this.parent?.getByName(name) ?? undefined !== undefined) {
            return ScopeDefinitionResult.ExistsInHigherScope;
        }
        return ScopeDefinitionResult.New;
    }

    getByNameImmediate(name: string): ScopeItem | undefined {
        return this.items[name];
    }

    getByName(name: string): ScopeItem | undefined {
        return this.items[name] ?? this.parent?.getByName(name);
    }
}

// export interface AstNodeVisitor<T> {
//     visitBinaryExpression(expr: BinaryExpression): T;
//     visitVariableExpression(expr: VariableExpression): T;
//     visitLiteralExpression(expr: LiteralExpression): T;

//     visitBlock(stmt: Block): T;
//     visitFunctionDeclaration(stmt: FunctionDeclaration): T;
//     visitVariableDeclaration(stmt: VariableDeclaration): T;
//     visitExpressionStatement(stmt: ExpressionStatement): T;
//     visitReturnStatement(stmt: ReturnStatement): T;
// }

export class AstNode { public readonly nodeType: string; constructor(public readonly parseTreeNode: ParseTreeNode) { this.nodeType = this.constructor.name; } get loc() { return this.parseTreeNode.loc; } get metas() { return this.parseTreeNode.metas; } get docComment() { return this.parseTreeNode.docComment; } }

export abstract class Statement extends AstNode {
    constructor(parseTreeNode: ParseTreeNode) { super(parseTreeNode); }
}

export class Block extends Statement {
    constructor(parseTreNode: ParseTreeNode, public statements: Statement[]) { super(parseTreNode); }
}

export class FunctionDeclaration extends Statement {
    constructor(
        parseTreeNode: ParseTreeNode,
        public name: string,
        public params: [string, TypeRef][],
        public returnType: TypeRef,
        public body: Block
    ) {
        super(parseTreeNode);
    }
}

export class Return extends Statement {
    constructor(parseTreeNode: ParseTreeNode, public expr?: Expression) { super(parseTreeNode); }
}

export abstract class Expression extends AstNode {
    constructor(parseTreeNode: ParseTreeNode) { super(parseTreeNode); }
}

export abstract class Binary extends Expression {
}

export class Add extends Binary {
    getType(): TypeInfo {
        throw new Error("Method not implemented.");
    }
    constructor(parseTreeNode: ParseTreeNode) { super(parseTreeNode); }
}

export abstract class LiteralExpression extends Expression {
    constructor(parseTreeNode: ParseTreeNode, public readonly literal: any) { super(parseTreeNode); }
}
export class IntLiteralExpression extends LiteralExpression {
    constructor(parseTreeNode: ParseTreeNode, literal: number) { super(parseTreeNode, literal); }
    getType(): TypeInfo {
        return BaseTypes.int;
    }
}
export class FloatLiteralExpression extends LiteralExpression {
    constructor(parseTreeNode: ParseTreeNode, literal: number) { super(parseTreeNode, literal); }
    getType(): TypeInfo {
        return BaseTypes.float;
    }
}
export class StringLiteralExpression extends LiteralExpression {
    constructor(parseTreeNode: ParseTreeNode, literal: string) { super(parseTreeNode, literal); }
    getType(): TypeInfo {
        return BaseTypes.string;
    }
}
export class BoolLiteralExpression extends LiteralExpression {
    constructor(parseTreeNode: ParseTreeNode, literal: boolean) { super(parseTreeNode, literal); }
    getType(): TypeInfo {
        return BaseTypes.bool;
    }
}
export class NilLiteralExpression extends LiteralExpression {
    constructor(parseTreeNode: ParseTreeNode, literal: null) { super(parseTreeNode, literal); }
    getType(): TypeInfo {
        return BaseTypes.nil;
    }
}

export abstract class Operator { constructor(public readonly name: string, public readonly text: string, public readonly type: TypeInfo) { } }
export class BinaryOperator extends Operator {
    constructor(name: string, text: string, public readonly lhs: TypeInfo, public readonly rhs: TypeInfo, type: TypeInfo) { super(name, text, type); }
}

export const BaseOperators = {
    "int + int": new BinaryOperator("int + int", "+", BaseTypes.int, BaseTypes.int, BaseTypes.int),
    "float + int": new BinaryOperator("float + int", "+", BaseTypes.float, BaseTypes.int, BaseTypes.float),
    "int + float": new BinaryOperator("int + float", "+", BaseTypes.int, BaseTypes.float, BaseTypes.float),
    "float + float": new BinaryOperator("float + float", "+", BaseTypes.float, BaseTypes.float, BaseTypes.float),
    "string + string": new BinaryOperator("strin + string", "+", BaseTypes.string, BaseTypes.string, BaseTypes.string)
}

export class TypeChecker {
    private errors: string[] = [];
    private warnings: string[] = [];

    public get hasErrors() { return this.errors.length > 0; }
    public get hasWarnings() { return this.warnings.length > 0; }

    constructor() {

    }

    getType(expr: Expression): TypeInfo {
        return expr.getType();
    }

    typeCheck(): void {

    }
}