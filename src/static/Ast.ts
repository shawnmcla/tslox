import { Param, ParseTreeNode } from "./ParseTree";

export class AstNode { public readonly nodeType: string; constructor(public readonly parseTreeNode: ParseTreeNode) { this.nodeType = this.constructor.name; } get loc() { return this.parseTreeNode.loc; } get metas() { return this.parseTreeNode.metas; } get docComment() { return this.parseTreeNode.docComment; } }

export class TypeInfo {
    constructor(public name: string, public parent?: TypeInfo){ }

    satisfies(type: TypeInfo): boolean {
        if(type === this || type.name === this.name) return true;
        return this.parent?.satisfies(this) ?? false;
    }
}

export const BaseTypes: Record<string, TypeInfo> = {
    int: new TypeInfo("int"),
    float: new TypeInfo("float"),
    string: new TypeInfo("string"),
    bool: new TypeInfo("bool"),
    void: new TypeInfo("void"),
    nil: new TypeInfo("nil")
}

export class VarInfo {
    constructor(public name: string, public type: TypeInfo, public isConst: boolean = false) { }
}

export class ParamInfo {
    constructor(public name: string, public type: TypeInfo) { }
}

export class FunctionInfo {
    constructor(public name: string, public params: ParamInfo[], public returnType: TypeInfo) { }
}

export type ScopeItem = VarInfo | TypeInfo | FunctionInfo;


export class Scope {
    private items: Record<string, ScopeItem> = {};

    constructor(private parent?: Scope) { 

    }

    define(name: string, item: ScopeItem): void {
        this.items[name] = item;
    }

    getByNameImmediate(name: string): ScopeItem | undefined {
        return this.items[name];
    }
    
    getByName(name: string): ScopeItem | undefined {
        return this.items[name] ?? this.parent?.getByName(name);
    }
}



export abstract class Expression extends AstNode {
    constructor(parseTreeNode: ParseTreeNode) { super(parseTreeNode); }
    abstract getType(): TypeInfo;
}
