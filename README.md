# *Yogurt* - Primary Functional Programming Interpreter

### Does it support branches or loops like "*if*" "*while*" "*for*", etc?
Sorry, not fully supported yet. Thus *Yogurt* is still not **turing-complete**.

### What operators can be used for calculation?
Currently, *Yogurt* supports the following operators:
- unary: + -
- binary: + -
- assignment: =
- precedence: ( )
- raletional: < >
- argument separator: ,

### Is there any built-in constants or functions to use?
Yes, of cource. You can use *pi* and *e* and many other frequently used functions like *sin()*, *abs()* and so forth.

### Does *Yogurt* apply any type system?
Uh-huh, we are considering this to be a future work.  
At this point, every literal in *Yogurt* is a 64-bit double precision floating point numeric.

### Which kind of identifier name is valid?
[a-zA-Z][a-zA-Z0-9]\*

### Any tips on getting hands dirty on *Yogurt*?
There are a couple of things that we hope you to notice:  
**Variables** and **functions** are both first-class citizens in *Yogurt*. The major difference is that variables, when defined, needs to be evaluated immediately, whereas functions can be lazily evaluated upon being called.  
For instance, when you define the function *foo*, like below:
> foo(a) = a  

Computer has no idea what *a* is, but it allows it to be ambiguous.  
If we set the variable *foo* to be *a*, computer must ask for what *a* is until *a* is defined as a concrete value.

Variables can be deemed as a variant of functions without parameters. Consider the following example:
> f() = 0.0  
> g = 0.0  

They can be treated equivalently, i.e. a fixed point in Euclidean space.
> f(k, b) = k * 10 + b  
> g = x * 10 + y  

The former is constrained by parameter *k* and *b*. This function can not be evaluated successfully until both are set. However, the latter must know *x* and *y* so as to obtain the value of *g*.  
Just bear in mind, functions are those that store whole procedures (as well as their environments) in memory, in which case, they are typically referred to as **closures**.

### Anything else?
Nope. We hope you **enjoy** it!


### Updated History
+ Beta 0.0
++ Variables and functions are both first-class citizens.

+ Beta 0.1
++ Add control flow like *if*, *then* and *else*. Nesting is also supported.
++ Recursion supported. **fib** works.

### Example Code
> fib(i) = if i < 3 then 1 else fib(i-1) + fib(i-2)  
> sum(k) = if k < 1 then 0 else k + sum(k-1)  
> f(i) = if i < 10 then i else 10  
> a = if 1 < 100 then 1 else 100  

