const helloWorld = `print "Hello, world!";`;

const fib = `
    fun fib(n) {
        if(n <= 2) return 1;
        return fib(n-2) + fib(n-1);
    }
    print "fib(15) => " + string(fib(15));
`;

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
`;

export const samples: Record<string, string> = {
    helloWorld,
    class1,
    fib,
    scope
}
