// tests.js

const testCases = [
    {
        name: "arith",
        code: "1 + 2 * 3",
        expected: "7"
    },
    {
        name: "logical",
        code: "true and (10 > 5)",
        expected: "true"
    },
    {
        name: "string",
        code: "\"Hi \" + \"Tequila\"",
        expected: "Hi Tequila"
    },
    {
        name: "assignment",
        code: "a = b = 10 * (1 - 12)",
        expected: "-110"
    },
    {
        name: "binding and scope",
        code: "a = 10; { a = 20 }; a",
        expected: "20"
    },
    {
        name: "array and index",
        code: "list = [10, 20, 30]; list[1]",
        expected: "20"
    },
    {
        name: "for loop",
        code: "sum = 0; nums = [1, 2, 3, 4]; for (n in nums) { sum = sum + n }; sum",
        expected: "10"
    },
    {
        name: "arith",
        code: "10 + 2 * 5 - 8 / 4",
        expected: "18"
    },
    {
        name: "precedence",
        code: "(10 + 2) * (5 - 3)",
        expected: "24"
    },
    {
        name: "concat",
        code: 'concat("Hello ", "World")',
        expected: "Hello World"
    },
    {
        name: "upper",
        code: 'upper("tequila")',
        expected: "TEQUILA"
    },

    {
        name: "scope",
        code: "x = 1; { x = 2 }; x",
        expected: "2"
    },
    {
        name: "nested scope",
        code: "a = 1; { b = 2; { c = 3; a = a + b + c } }; a",
        expected: "6"
    },
    {
        name: "array",
        code: "matrix = [[1, 2], [3, 4]]; matrix[1][0]",
        expected: "3"
    },
    {
        name: "dict",
        code: 'user = {"name": "Alice", "score": 95}; user["name"]',
        expected: "Alice"
    },
    // {
    //     name: "字典动态键 (表达式解析)",
    //     code: 'k = "age"; person = {k: 20}; person["age"]',
    //     expected: "20"
    // },
    {
        name: "for loop",
        code: "total = 0; for (i = 1; i <= 5; i = i + 1) { total = total + i }; total",
        expected: "15"
    },
    {
        name: "for-in loop",
        code: "res = 1; nums = [1, 2, 3, 4]; for (n in nums) { res = res * n }; res",
        expected: "24"
    },
    {
        name: "while loop",
        code: "count = 5; fact = 1; while (count > 0) { fact = fact * count; count = count - 1 }; fact",
        expected: "120"
    },
    {
        name: "function",
        code: "add(x, y) = x + y; add(10, 20)",
        expected: "30"
    },
    {
        name: "recursive function",
        code: "fib(n) = if n < 2 then n else fib(n-1) + fib(n-2); fib(6)",
        expected: "8"
    },
    // {
    //     name: "closure",
    //     code: "f(x) = { g(y) = x + y }; f(5)(10)",
    //     expected: "15"
    // },

    {
        name: "logical 1",
        code: "false and (1 / 0 == 0)",
        expected: "false"
    },
    {
        name: "logical 2",
        code: "not (10 < 5)",
        expected: "true"
    },

    {
        name: "empty length",
        code: "len([])",
        expected: "0"
    },
    {
        name: "handle Null/Nil",
        code: "a = null; a == null",
        expected: "true"
    },
];

async function runTestSuite() {
    console.log("%c running testsuite... ", "font-weight: bold; font-size: 12px;");
    
    let passed = 0;
    let failed = 0;

    for (const test of testCases) {

        Scope.env_stack = [{}];
        Scope.depth = 0;
        Memo.memoization = {};

        try {
            const tokens = tequila_lex(test.code);
            const tree = tequila_parse(tokens);
            const results = await tequila_evaluate(tree);
            
            const actual = results[results.length - 1];

            if (String(actual) === String(test.expected)) {
                console.log(`✅ [pass] ${test.name}`);
                passed++;
            } else {
                console.error(`❌ [fail] ${test.name}\n   expected: ${test.expected}\n   factual: ${actual}`);
                failed++;
            }
        } catch (err) {
            console.error(`💥 [err] ${test.name}: ${err}`);
            failed++;
        }
    }

    console.log(`%c test done: passed ${passed}, failed ${failed} `, "font-weight: bold; font-size: 12px;");
}

runTestSuite();
