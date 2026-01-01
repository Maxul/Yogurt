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
            if ("undefined" !== typeof constants[node.value])
                return constants[node.value];

            // may be a variable defined before
            var val = Scope.env()[node.value];
            if ("undefined" === typeof val)
                throw "Variable \"" + node.value + "\" is undefined";
            return val;
        },

        "assign": async (node, parseTree) => {
            // constants cannot be re-defined
            if ("undefined" !== typeof constants[node.name])
                throw "Constant \"" + node.name + "\" has already been defined";

            var val = await parseTree(node.value);
            var currentScope = Scope.env();

            // use parent's if it exists, otherwise define locally (lexical shadowing check)
            var scopeCursor = currentScope;
            var found = false;
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
            var cond = await parseTree(node.cond);
            if ("boolean" !== typeof cond)
                throw "Expected a boolean expression.";
            if (cond)
                return await parseTree(node.conseq);
            else if (node.alt)
                return await parseTree(node.alt);
            return null;
        },

        "block": async (node, parseTree) => {
            var ss = node.stmts;
            Scope.push();   // enter block
            var result = null;
            for (var i = 0; i < ss.length; ++i)
                result = await parseTree(ss[i]);
            Scope.pop();    // exit block
            return result;
        },

        "func_def": async (node) => {
            Memo.clearMemoRow(node.name);
            var paramNames = node.args.map(arg => arg.value);
            Scope.env()[node.name] = {
                type: "func",
                params: paramNames,
                body: node.value,
                closure_env: Scope.env() // capture environment for closure
            };
            return "Function " + node.name + "() is defined";
        },

        "proc_def": async (node) => {
            Scope.env()[node.name] = { type: "proc", params: node.params, body: node.body };
            return "Procedure " + node.name + "() is defined";
        },

        "call": async (node, parseTree) => {
            // is it a native function?
            if ("function" === typeof native_functions[node.name]) {
                var nativeArgs = [];
                for (var i = 0; i < node.args.length; ++i)
                    nativeArgs.push(await parseTree(node.args[i]));
                return native_functions[node.name].apply(null, nativeArgs);
            }

            var funcDef = Scope.env()[node.name];
            if ("undefined" === typeof funcDef)
                throw "Function \"" + node.name + "\" is undefined";

            if (node.args.length !== funcDef.params.length) {
                throw "Function '" + node.name + "' expects " +
                funcDef.params.length + " arguments, got " + node.args.length;
            }

            // evaluate arguments in the current scope
            var argValues = [];
            for (var i = 0; i < node.args.length; ++i) {
                argValues.push(await parseTree(node.args[i]));
            }

            // accelerate with memoization (use evaluated values as key)
            var result = Memo.getMemoValue(node.name, argValues);
            if ("undefined" !== typeof result) return result;

            // push the function's captured environment
            Scope.push(funcDef.closure_env);
            for (var i = 0; i < funcDef.params.length; ++i) {
                Scope.env()[funcDef.params[i]] = argValues[i];
            }

            result = await parseTree(funcDef.body);
            Memo.setMemoValue(node.name, argValues, result); // store result in memo
            Scope.pop();
            return result;
        },

        "loop_for": async (node, parseTree) => {
            Scope.push();
            await parseTree(node.init);
            var lastResult = null;
            while (await parseTree(node.cond)) {
                lastResult = await parseTree(node.body);
                await parseTree(node.step);
            }
            Scope.pop();
            return lastResult;
        },

        "loop_for_in": async (node, parseTree) => {
            var collection = await parseTree(node.collection);
            if (!Array.isArray(collection)) throw "For-in loop expects an array.";

            Scope.push(); // shared scope for the loop
            var lastResult = null;
            var varName = node.iterator.value;
            for (var i = 0; i < collection.length; i++) {
                Scope.env()[varName] = collection[i];
                // execute block statements without creating additional nested scopes
                if (node.body.node === "block") {
                    for (var s = 0; s < node.body.stmts.length; s++) {
                        lastResult = await parseTree(node.body.stmts[s]);
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
            var ret = null;
            while (await parseTree(node.cond)) {
                ret = await parseTree(node.body);
            }
            Scope.pop();
            return ret;
        },

        "array": async (node, parseTree) => {
            var result = [];
            for (var i = 0; i < node.elements.length; ++i)
                result.push(await parseTree(node.elements[i]));
            return result;
        },

        "tuple": async (node, parseTree) => {
            var result = [];
            for (var i = 0; i < node.elements.length; ++i)
                result.push(await parseTree(node.elements[i]));
            return result;
        },

        "dict": async (node, parseTree) => {
            var res = {};
            for (var i = 0; i < node.pairs.length; ++i) {
                var pair = node.pairs[i];
                var keyName = (pair.key.node === "number" || pair.key.node === "string")
                    ? pair.key.value
                    : await parseTree(pair.key);
                res[keyName] = await parseTree(pair.val);
            }
            return res;
        },

        "index": async (node, parseTree) => {
            var target = await parseTree(node.target);
            var idx = await parseTree(node.index);
            if (target === undefined || target === null)
                throw "Cannot index null or undefined";
            return target[idx];
        },

        "llm_call": async (node, parseTree) => {
            const prompt = node.prompt;
            const context = node.context ? await parseTree(node.context) : null;
            const llmRawResult = await llm_call(prompt + JSON.stringify(context));
            try {
                // Try to parse LLM result as data
                return JSON.parse(llmRawResult);
            } catch (e) {
                console.warn("LLM result is not valid JSON, returning as string.");
                return llmRawResult;
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
                if (root.node === "+") return left + right; // string concat or numeric add
                return ops[root.node](left, right);
            } else {
                return ops[root.node](right); // unary operation (not, unary minus)
            }
        }

        return "nil"; // unhandled node
    }

    // main process of evaluating parse node
    var output = [];
    for (var i = 0; i < parse_tree.length; ++i) {
        var res = await parseTree(parse_tree[i]);
        if (typeof res === 'object' && res !== null) {
            output.push(JSON.stringify(res));
        } else {
            output.push(String(res));
        }
    }
    return output;
}