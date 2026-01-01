# A bit thought

## Statements

A statement is an evaluable expression.

Expressions are composed of sub-expressions. Every expression can be considered as a tree. The process of parsing operation the tree is to substitude possible symbols with known values, apply concrete calculation when encountering functions, and finally convert and reduce to the simplest form (usually an atomic entity that contains precise value).

## Blocks

A block consist of multiple statements.

In this case, lexical scope is naturally indroduced: every single statement has its own context for variables to be computed. Each of them is located in a specific block.
Blocks can also be organized in a nested form.

Blocks are defined to satisfy the following properties:
+ Blocks within a particular block can inherently posses the environment of it (as a parent).
+ Blocks in parallel are mutually orthographic.
+ Blocks can be regarded as a simple yet easy to understand way of implementing namespaces (which solve the problems of name collision). We also exploit this when implementing procedures, in which situation we have local variables.

## Functions

A functions holds a relation between the input and output.

Most frequently, a function is deliberately constructed such that it demonstrates a particular algorithm. Informally, a function is considered as a processing unit that takes the argument(s) and yields the return value(s).

When applying a function (taken from *lambda calculus*), the formal parameters serve the purpose of name binding in which case a function forms a *closure* that contains its context derived from input arguments.

This is quite similar to the functionality of **blocks**, but conceptually different: name resolution is explicitly fulfilled by enclosed parameters, known as **function protocol scope**, whereas a block implicitly generates a specially privite static namespace, without informing which names have already been defined.

As a side note, those whose names are not amongst the list of arguments but reside in outer namespace (namely non-local) are termed as **free variables**.
