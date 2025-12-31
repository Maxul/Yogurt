g(y) = { a = 4 foo(3) }
f(x) = a

block can lead to the occurence of nested functions.

A statement is an evaluate-able expression, which may be composed of sub-expressions.
It is guaranteed that every expression should be constructed as a complete parse tree. The course of performing processing operation on a parse tree is to substitude possible symbols with known values, apply concrete calculation when encountering functions/methods, and finally convert and reduce to a simplest form (usually an atomic entity, i.e. leaf node that contains precise value).

A block is consist of multiple statements. In this case, lexical scope is naturally indroduced.
Every single statement has its own context for variables to be computed. Each of them is located in a specific block.
Blocks are defined to satisfy the following properties:
+ Blocks within a particular block can inherently posses the environment of it (as a parent).
+ Blocks in parallel are mutually orthographic.
+ Blocks can be regarded as a simple yet easy to understand way of implementing namespaces (which solve the problems of name collision). We also exploit this when implementing procedures, in which situation we have local variables.

A functions holds a relation between the input and output. Most frequently, a function is deliberately constructed such that it demonstrates a particular algorithm. Informally, a function is considered as a processing unit that takes the argument(s) and yields the return value(s). When applying a function (taken from *lambda calculus*), the formal parameters serve the purpose of name binding in which case a function forms a *closure* that contains its context derived from input arguments.
This is quite similar to the functionality of **blocks**, but conceptually different. Name resolution is explicitly fulfilled by enclosed parameters, known as **function protocol scope**, whereas a block implicitly generates a specially privite static namespace without informing which names have already been defined. As a side note, those whose names are not amongst the list of arguments but reside in outer namespace (namely non-local) are termed as **free variables**.
