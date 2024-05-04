# Compiling

Sample code
```rust
fn add2(x: int, y: int): int {
    return x  + y;
}

let result: int = add2(10, 3);
print("5 + 3 = ");
println(result);

>>> 5 + 3 = 8 

```

Parses to..
```
 FunctionDeclaration(
  name = add2
  params = (x: int, y: int)
  returnType = int
  body = Block(
    ReturnStatement(
      BinaryExpression(
        operator = +
        lhs = VariableExpression(x)
        rhs = VariableExpression(y)
      )
    )
  )
)

VariableDeclaration(
  name = result
  type = int
  const? = no
  initializer = 
    CallExpression(
      callee = VariableExpression(add2)
      args = (
        Literal(10)
        Literal(3)
      )
    )
)

CallExpression(
  callee = VariableExpression(print)
  args = (
    Literal("5 + 3 = ")
  )
)

CallExpression(
  callee = VariableExpression(println)
  args = (
    VariableExpression(result)
  )
)

```

Compiling flow notes

Whenever we enter a scope where things can be defined (function body, block, atm that's it)

We should iterate all top-level nodes and identify Declaration type nodes 
Idea: Make FunctionDeclaration and varDeclaration chilren of an abstract DeclarationStatement node so we can just do
if(node instanceof DeclarationStatement)

IF that is the case, store that information in the current parsing context

We do this for every top level node in the scope (we don't actually compile or do anything further than identifying that the thing exists)

That way, once that is done, we can have an idea of the things in scope and their types

Example based on code above:

ENTER SCOPE (Root of program)
SCAN for all declarations: (tbd: can we capture variables, if so, does order matter?)
IDENTIFY: Function add2 (int, int) -> int
IDENTIFY: Variable result int

THEN, for all of the typed things identified, resolve types
int is base type, no issue here

THEN we can go and compile the nodes

We don't want to be like C where you have to declare things in advance

