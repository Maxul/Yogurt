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

    async function parseTree(root) {
        if (root === null || typeof root !== "object") {
            return root;
        }
        switch (root.node) {
            case "number":
            case "string":
                return root.value;
            case "id":
                // is it a constant value?
                if ("undefined" !== typeof constants[root.value])
                    return constants[root.value];

                // may be a variable defined before
                var val = Scope.env()[root.value];

                if ("undefined" === typeof val)
                    throw "Variable \"" + root.value + "\" is undefined";
                return val;
            case "assign":
                // constants cannot be re-defined
                if ("undefined" !== typeof constants[root.name])
                    throw "Constant \"" + root.name + "\" has already been defined";

                // push a value bound to a name into the current environment
                var val = await parseTree(root.value);
                var currentScope = Scope.env();

                // use parent's if it exists, otherwise define locally
                var scopeCursor = currentScope;
                var found = false;

                while (scopeCursor && scopeCursor !== Object.prototype) {
                    if (Object.prototype.hasOwnProperty.call(scopeCursor, root.name)) {
                        scopeCursor[root.name] = val;
                        found = true;
                        break;
                    }
                    scopeCursor = Object.getPrototypeOf(scopeCursor);
                }

                if (!found) {
                    currentScope[root.name] = val; // a locally new variable
                }

                return val;
            case "branch":
                var cond = await parseTree(root.cond);

                if ("boolean" !== typeof cond)
                    throw "Expected a boolean expression.";
                if (cond)
                    return await parseTree(root.conseq);
                else
                    if (root.alt)
                        return await parseTree(root.alt);
            case "block":
                var ss = root.stmts;

                Scope.push();   // enter block
                // iterate each statement and evaluate the node
                var result = null;
                for (var i = 0; i < ss.length; ++i)
                    result = await parseTree(ss[i]);
                Scope.pop();    // exit block
                return result;
            case "func_def":
                // clear previous definition
                Memo.clearMemoRow(root.name);
                // push a definition bound to a prototype into environment
                var paramNames = root.args.map(arg => arg.value);
                Scope.env()[root.name] = {
                    type: "func",
                    params: paramNames,
                    body: root.value,
                    closure_env: Scope.env() // closure
                };
                return "Function " + root.name + "() is defined";
            case "proc_def":
                Scope.env()[root.name] = { type: "proc", params: root.params, body: root.body };
                return "Procedure " + root.name + "() is defined";
            case "call":
                // is it a function provided by us?
                if ("function" === typeof native_functions[root.name]) {
                    var nativeArgs = [];
                    for (var i = 0; i < root.args.length; ++i)
                        nativeArgs.push(await parseTree(root.args[i]));
                    return native_functions[root.name].apply(null, nativeArgs);
                }

                var funcDef = Scope.env()[root.name];
                if ("undefined" === typeof funcDef)
                    throw "Function \"" + root.name + "\" is undefined";

                if (root.args.length !== funcDef.params.length) {
                    throw "Function '" + root.name + "' expects " +
                    funcDef.params.length + " arguments, got " + root.args.length;
                }

                var argValues = [];
                for (var i = 0; i < root.args.length; ++i) {
                    argValues.push(await parseTree(root.args[i]));
                }

                Scope.push(funcDef.closure_env);
                for (var i = 0; i < funcDef.params.length; ++i) {
                    var paramName = funcDef.params[i];
                    Scope.env()[paramName] = argValues[i];
                }
                // accelerate with memoization
                var result = Memo.getMemoValue(root.name, argValues);
                if ("undefined" !== typeof result)
                    return result;
                result = await parseTree(funcDef.body);
                Memo.setMemoValue(root.name, root.args, result);
                Scope.pop();
                return result;
            case "loop_for":
                Scope.push();
                await parseTree(root.init);
                var lastResult = null;
                while (true) {
                    var condition = await parseTree(root.cond);
                    if (!condition) break;
                    lastResult = await parseTree(root.body);
                    await parseTree(root.step);
                }
                Scope.pop();
                return lastResult;
            case "loop_for_in":
                var collection = await parseTree(root.collection);
                if (!Array.isArray(collection)) throw "For-in loop expects an array.";

                Scope.push();
                var lastResult = null;
                var varName = root.iterator.value;
                for (var i = 0; i < collection.length; i++) {
                    Scope.env()[varName] = collection[i];
                    if (root.body.node === "block") {
                        for (var s = 0; s < root.body.stmts.length; s++) {
                            lastResult = await parseTree(root.body.stmts[s]);
                        }
                    } else {
                        lastResult = await parseTree(root.body);
                    }
                }
                Scope.pop();
                return lastResult;

            case "loop_while":
                Scope.push();
                var ret = null;
                while (await parseTree(root.cond)) {
                    ret = await parseTree(root.body);
                }
                Scope.pop();
                return ret;

            case "array":
            case "tuple":
                var result = [];
                for (var i = 0; i < root.elements.length; ++i) {
                    result.push(await parseTree(root.elements[i]));
                }
                return result;

            case "dict":
                var res = {};
                for (var i = 0; i < root.pairs.length; ++i) {
                    var pair = root.pairs[i];
                    var keyRaw = pair.key;
                    var keyName;

                    if (keyRaw.node === "id") keyName = keyRaw.value;
                    else if (keyRaw.node === "num") keyName = keyRaw.value;
                    else if (keyRaw.node === "string") keyName = keyRaw.value;
                    else keyName = await parseTree(keyRaw);

                    var val = await parseTree(pair.val);
                    res[keyName] = val;
                }
                return res;

            case "index":
                // obj[key]
                var target = await parseTree(root.target);
                var idx = await parseTree(root.index);

                if (target === undefined || target === null)
                    throw "Cannot index null or undefined";

                return target[idx];

            case "llm_call":
                const prompt = root.prompt;
                const context = root.context ? await parseTree(root.context) : null;
                const llmRawResult = await llm_call(prompt + JSON.stringify(context));
                try {
                    return JSON.parse(llmRawResult);
                } catch (e) {
                    console.warn("LLM result is not valid JSON, returning as string.");
                    return llmRawResult;
                }

            default:
                if (ops[root.node]) {
                    const right = await parseTree(root.rhs); // all ops have rhs
                    if (root.lhs !== undefined && root.lhs !== null) {
                        const left = await parseTree(root.lhs); // binary
                        // for numerics and strings
                        if (root.node === "+") return left + right;
                        return ops[root.node](left, right);
                    } else {
                        return ops[root.node](right); // unary
                    }
                } else {
                    return "nil";       // unhandled exception
                }
        }
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
