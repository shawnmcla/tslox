const helloWorld = `print "Hello, world!";`;

const fib = `
    fun fib(n) {
        if(n <= 2) return 1;
        return fib(n-2) + fib(n-1);
    }
    print "fib(15) => " + string(fib(15));
`;

const functionExpressions = `
var sum = (fun (a,b) { return a + b; })(1,2);
print sum;

var double = fun(x) { return x * 2; };

print double(10);`;

const scope = `
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
print c;`;

const class1 = `
var _CURRENT_YEAR = 2024;

class Car {
    // Constructor
    init(year, make, model) {
        this.year = year;
        this.make = make;
        this.model = model;
    }

    // A method that takes no parameters
    describe() {
        return "A " + string(this.year) + " " + this.make + " " + this.model;
    }

    // A 'getter'
    age {
        return _CURRENT_YEAR - this.year;
    }
}

var civic = Car(2020, "Honda", "Civic");

print civic.describe();
print "The car is " + string(civic.age) + " year(s) old";

class Truck < Car {
    describe() { 
        return super.describe() + ", a really big truck!";
    }
}

var t = Truck(2024, "Honda", "Ridgeline");
print t.describe();
`;

const array1 = `
const list = array(3);
list[0] = "hello";
list[1] = "friend";
list[2] = ":^)";

for(var i = 0; i < 3; i = i + 1) { print list[i]; }
`;

const magics1 = `
class MyArr {
    $get(idx) {
        return idx + 10;
    }
    $set(idx, val) {
        print "SET '" + string(idx) + "' TO '" + string(val) + "'";
    }
}

var a1 = MyArr();

print a1[0];
print a1[10];

print (a1[100] = "foo");
`;

const foreach1 = `
var arr = array(10);

for(var i = 0; i < arr.len(); i = i + 1) {
    arr[i] = i * 2;
}

foreach(var x in arr) {
    print "Value is => " + string(x);
}

`

export const samples: Record<string, string> = {
    helloWorld,
    class1,
    fib,
    scope,
    functionExpressions,
    array1,
    magics1,
    foreach1
}

