# Compiling

Sample code
```rust
fn add2(x: int, y: int): int {
    return x  + y;
}

let result = add2(10, 3);
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
  type = none
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
    Literal(5 + 3 = )
  )
)

CallExpression(
  callee = VariableExpression(println)
  args = (
    VariableExpression(result)
  )
)

```