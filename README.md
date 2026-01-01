# *Tequila* - Yet Another Programming Interpreter
```
  _____                    _  _        
 |_   _|___   __ _  _   _ (_)| |  __ _   
   | | / _ \ / _` || | | || || | / _` |  
   | ||  __/| (_| || |_| || || || (_| |  
   |_| \___| \__, | \__,_||_||_| \__,_|  
                |_|                      
```
> Drinking much Tequila is unhealthy for your body.

### Does it support branches or loops like "*if*", "*for*", etc?

Yes. *Tequila* is **turing-complete**.

### What operators can be used for calculation?

*Tequila* supports the following operators:
- unary: + -
- binary: + - * / %
- assignment: =
- precedence: ( )
- raletional: <=>
- argument separator: ,
- lexical scope delimiter: { }

### Is there any built-in constants or functions to use?

Yes for sure. You can use *pi* and *e* and many other frequently used functions like *sin()*, *abs()*, *len()*, *substr()*, *concat()* and so forth.

### Does *Tequila* apply any type system?

Not really. Tequila is designed for fast prototyping and interpreter practice.
At this point, every literal in *Tequila* is a 64-bit double precision floating point numeric.

### Which kind of identifier name is valid?

[a-zA-Z][a-zA-Z0-9]\*

### Tips for hands on *Tequila*?

There are a couple of things that we hope you to notice:  
**Variables** and **functions** are both first-class citizens in *Tequila*. The major difference is that variables, when defined, needs to be evaluated immediately, whereas functions can be lazily evaluated upon being called.

For instance, when you define the function *foo()*, like below:
```
>> foo(a) = a  
```
Computer has no idea what *a* is.

When we wish to evaluate *foo()*, *Tequila* must ask for what *a* is until *a* is defined as a concrete value.

Variables can be deemed as a variant of functions without parameters. Consider the following example:
```
>> f() = 0.0  
>> g = 0.0  
```

They can be treated equivalently, i.e. a fixed point in Euclidean space.
```
>> f(k, b) = k * 10 + b  
>> g = x * 10 + y  
```
The former is constrained by parameter *k* and *b*. This function can not be evaluated successfully until both are set. However, the latter must know *x* and *y* so as to obtain the value of *g*.

Just bear in mind, functions are those that store algorithms (as well as their environments) in memory, in which case, they are typically referred to as **closures**.

We also provide C-style procedures.
```
>> bar(x) := { a = 10; x = x + 10}
```
Procedures are not like functions (which must be pure without any local variables). Procedures can store

### Anything else?
Nope. We hope you **enjoy** it!

### History

+ Beta 0.0
    + Variables and functions are both first-class citizens.

+ Beta 0.1
    + Add control flow like *if*, *then* and *else*. Nesting is also supported.
    + Recursion supported. **fib** works.

+ Beta 0.2
    + Add support for command line history. Integrated with **jQuery Terminal Emulator**.
    + Add boolean expression and relational operators.
    + Add support for compound operators such as "!=", "<=", etc.

+ Beta 0.3
    + Add support for memoization for heavy computation of recursion.
    + Add support for lexical scope, which introduces the conception of local binding.
    + Merge both variables and functions into the block scope.
    + Multiple expressions after being evaluated only return the last one.

+ Beta 0.4
    + Add support for *for* and *while*.
    + Add support for arrays, list, dict.
    + Add support for pure functions and imperative procedures.

### Guide Book

```
# numerical variables
>> a = b = 10 * (1 - 12)
=> -110
>> b
=> -110

# string variables
>> name = "alice"
=> alice
>> greeting = "Hi " + name
=> Hi alice

# branch
>> a = if 1 <= 100 then 1 else 100
=> 1

# recursive function (no side effect)
>> sum(k) = if k < 1 then 0 else k + sum(k-1)
=> Function sum() defined
>> sum(100)
=> 5050

# for loop
>> sum = 0
=> 0
>> for (i = 1; i <= 100; i = i + 1) { sum = sum + i }
=> 100

# array
>> nums = [1, 2, 3, 4]
=> 1,2,3,4
>> exists = 3 in nums
=> true

# for..in loop
>> nums = [10, 20, 30]
=> 10,20,30
>> sum = 0
=> 0
>> for (n in nums) { sum = sum + n }
=> 60

# scope
>> a = 100
=> 100
>> { a = 10 }
=> 10
>> a
=> 100

# procedure (use ; for seperation, always return the last statement)
>> circumference(d) := { PI = 3.14; PI * d; }
=> Procedure circumference() defined
>> circumference(10)
=> 31.400000000000002

# tuple
>> t = (1, 2, 3)
=> 1,2,3
>> t[1]
=> 2

# dictionary
>> info = { "type": "script", "version": 1.0 }
=> [object Object]
>> info["type"]
=> script
>> info["version"]
=> 1

# JSON
>> students = [{"name": "Alice", "age": 16}, {"name": "Bob", "age": 22}];
=> [object Object],[object Object]
>> students[0]["age"]
=> 16
```
