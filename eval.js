// eval.js

/*
* evaluate: iterate each parse node and do syntax analysis
*/
async function tequila_evaluate(parse_tree) {
    // take the place of LHS with RHS when only RHS exists
    const ops = {
        "+": (a, b) => (b === undefined) ? a : a + b, // for unary like "+1"
        "-": (a, b) => (b === undefined) ? -a : a - b, // for unary like "-1"
        "*": (a, b) => a * b,
        "/": (a, b) => a / b,
        ">": (a, b) => a > b,
        "<": (a, b) => a < b,
        ">=": (a, b) => a >= b,
        "<=": (a, b) => a <= b,
        "==": (a, b) => a == b,
        "!=": (a, b) => a != b,
        "not": (a) => typeof a === "boolean" ? !a : null,
        "and": (a, b) => (typeof a === "boolean" && typeof b === "boolean") ? a && b : null,
        "or": (a, b) => (typeof a === "boolean" && typeof b === "boolean") ? a || b : null,
        "in": (a, b) => Array.isArray(b) ? b.includes(a) : (b && typeof b === 'object' ? a in b : false)
    };

    // dispatcher lookup table
    const evaluators = {
        "number": async (node) => node.value,
        "string": async (node) => node.value,

        "id": async (node) => {
            // is it a constant value?
            if ("undefined" !== typeof constants[node.value]) {
                return constants[node.value];
            }

            // may be a variable defined before
            const val = Scope.env()[node.value];
            if ("undefined" === typeof val) {
                throw "Variable \"" + node.value + "\" is undefined";
            }
            return val;
        },

        "assign": async (node, parseTree) => {
            // constants cannot be re-defined
            if ("undefined" !== typeof constants[node.name]) {
                throw "Constant \"" + node.name + "\" has already been defined";
            }

            const val = await parseTree(node.value);
            const currentScope = Scope.env();

            // use parent's if it exists, otherwise define locally (lexical shadowing check)
            let scopeCursor = currentScope;
            let found = false;
            while (scopeCursor && scopeCursor !== Object.prototype) {
                if (Object.prototype.hasOwnProperty.call(scopeCursor, node.name)) {
                    scopeCursor[node.name] = val;
                    found = true;
                    break;
                }
                scopeCursor = Object.getPrototypeOf(scopeCursor);
            }
            if (!found) {
                currentScope[node.name] = val; // a locally new variable
            }
            return val;
        },

        "branch": async (node, parseTree) => {
            const cond = await parseTree(node.cond);
            if ("boolean" !== typeof cond) {
                throw "Expected a boolean expression.";
            }
            if (cond) {
                return await parseTree(node.conseq);
            } else if (node.alt) {
                return await parseTree(node.alt);
            }
            return null;
        },

        "block": async (node, parseTree) => {
            Scope.push();   // enter block
            let result = null;
            for (const stmt of node.stmts) {
                result = await parseTree(stmt);
            }
            Scope.pop();    // exit block
            return result;
        },

        "func_def": async (node) => {
            Memo.clearMemoRow(node.name);
            const paramNames = node.args.map(arg => arg.value);
            Scope.env()[node.name] = { type: "func", params: paramNames, body: node.value };
            return "Function " + node.name + "() is defined";
        },

        "proc_def": async (node) => {
            Scope.env()[node.name] = { type: "proc", params: node.params, body: node.body };
            return "Procedure " + node.name + "() is defined";
        },

        "call": async (node, parseTree) => {
            // is it a native function?
            if ("function" === typeof native_functions[node.name]) {
                const nativeArgs = await Promise.all(node.args.map(arg => parseTree(arg)));
                return native_functions[node.name].apply(null, nativeArgs);
            }

            const funcDef = Scope.env()[node.name];
            if ("undefined" === typeof funcDef) {
                throw "Function \"" + node.name + "\" is undefined";
            }

            if (node.args.length !== funcDef.params.length) {
                throw "Function '" + node.name + "' expects " +
                funcDef.params.length + " arguments, got " + node.args.length;
            }

            // evaluate arguments in the current scope
            const argValues = await Promise.all(node.args.map(arg => parseTree(arg)));

            // accelerate with memoization (use evaluated values as key)
            let result = Memo.getMemoValue(node.name, argValues);
            if ("undefined" !== typeof result) {
                return result;
            }

            // push the function's captured environment
            Scope.push();
            funcDef.params.forEach((param, i) => {
                Scope.env()[param] = argValues[i];
            });
            result = await parseTree(funcDef.body);
            Memo.setMemoValue(node.name, argValues, result); // store result in memo
            Scope.pop();
            return result;
        },

        "loop_for": async (node, parseTree) => {
            Scope.push();
            await parseTree(node.init);
            let lastResult = null;
            while (await parseTree(node.cond)) {
                lastResult = await parseTree(node.body);
                await parseTree(node.step);
            }
            Scope.pop();
            return lastResult;
        },

        "loop_for_in": async (node, parseTree) => {
            const collection = await parseTree(node.collection);
            if (!Array.isArray(collection)) {
                throw "For-in loop expects an array.";
            }

            Scope.push(); // shared scope for the loop
            let lastResult = null;
            const varName = node.iterator.value;
            for (let i = 0; i < collection.length; i++) {
                Scope.env()[varName] = collection[i];
                // execute block statements without creating additional nested scopes
                if (node.body.node === "block") {
                    for (const stmt of node.body.stmts) {
                        lastResult = await parseTree(stmt);
                    }
                } else {
                    lastResult = await parseTree(node.body);
                }
            }
            Scope.pop();
            return lastResult;
        },

        "loop_while": async (node, parseTree) => {
            Scope.push();
            let ret = null;
            while (await parseTree(node.cond)) {
                ret = await parseTree(node.body);
            }
            Scope.pop();
            return ret;
        },

        "array": async (node, parseTree) => {
            return await Promise.all(node.elements.map(ele => parseTree(ele)));
        },

        "tuple": async (node, parseTree) => {
            return await Promise.all(node.elements.map(ele => parseTree(ele)));
        },

        "dict": async (node, parseTree) => {
            const entries = await Promise.all(node.pairs.map(async (pair) => {
                const key = (pair.key.node === "number" || pair.key.node === "string")
                    ? pair.key.value : await parseTree(pair.key);
                const val = await parseTree(pair.val);
                return [key, val];
            }));
            return Object.fromEntries(entries);
        },

        "index": async (node, parseTree) => {
            const target = await parseTree(node.target);
            const idx = await parseTree(node.index);
            if (target === undefined || target === null) {
                throw "Cannot index null or undefined";
            }
            return target[idx];
        },

        "llm_call": async (node, parseTree) => {
            const prompt = node.prompt;
            const context = node.context ? await parseTree(node.context) : null;
            const llmRawResult = await llm_call(prompt + JSON.stringify(context));
            try {
                return JSON.parse(llmRawResult); // Try to parse LLM result as data
            } catch (e) {
                console.warn("LLM result is not valid JSON, returning as string.");
                return llmRawResult;
            }
        },

        "llm_synth": async (node, parseTree) => {
            const intent = node.intent;
            const context = await parseTree(node.context);

            const systemPrompt = `
                你是一个代码生成器。只能输出代码，不要解释。
                当前可用的变量名和值: ${JSON.stringify(context)}。
                语法规则:
                - 注释: #
                - 赋值: name = value
                - 循环: while cond { body } 或 for (init; cond; step) { body }
                - 分支: if cond then { conseq } else { alt }
                - 函数定义: name(args) = body
                请根据以下意图生成代码:
            `;

            const generatedCode = await llm_do(systemPrompt + intent);
            // remove markdown
            const cleanCode = generatedCode.replace(/```[a-z]*\n?|```/gi, '').trim();
            console.log("--- LLM 合成的代码 ---\n", cleanCode);

            try {
                const tokens = tequila_lex(cleanCode);
                const sub_parse_tree = tequila_parse(tokens);
                let result = null;
                for (const stmt of sub_parse_tree) {
                    result = await parseTree(stmt);
                }
                return result;

            } catch (e) {
                throw `LLM合成的代码解析失败: ${e}\n生成的代码是: ${cleanCode}`;
            }
        }
    };

    async function parseTree(root) {
        if (root === null || typeof root !== "object") {
            return root;
        }

        const evaluator = evaluators[root.node];
        if (evaluator) {
            return await evaluator(root, parseTree);
        }

        if (ops[root.node]) {
            const right = await parseTree(root.rhs); // all ops have rhs
            if (root.lhs !== undefined && root.lhs !== null) {
                const left = await parseTree(root.lhs); // binary operation
                if (root.node === "+") {
                    return left + right; // string concat or numeric add
                }
                return ops[root.node](left, right);
            } else {
                return ops[root.node](right); // unary operation (not, unary minus)
            }
        }
        return "nil"; // unhandled node
    }

    // main process of evaluating parse node
    const output = [];
    for (const node of parse_tree) {
        const r = await parseTree(node);
        output.push(typeof r === 'object' && r !== null ? JSON.stringify(r) : String(r));
    }
    return output;
}
