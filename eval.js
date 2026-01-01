// eval.js

/*
 * evaluate: iterate each parse node and do syntax analysis
 */
function tequila_evaluate(parse_tree) {
    // take the place of LHS with RHS when only RHS exists
    const ops = {
        "+": (a, b) => a + b,
        "-": (a, b) => a - b,
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

    function parseTree(root) {
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
                var val = parseTree(root.value);
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
                var cond = parseTree(root.cond);

                if ("boolean" !== typeof cond)
                    throw "Expected a boolean expression.";
                if (cond)
                    return parseTree(root.conseq);
                else
                    if (root.alt)
                        return parseTree(root.alt);
            case "block":
                var ss = root.stmts;

                Scope.push();   // enter block
                // iterate each statement and evaluate the node
                var result = null;
                for (var i = 0; i < ss.length; ++i)
                    result = parseTree(ss[i]);
                Scope.pop();    // exit block
                return result;
            case "func_def":
                // clear previous definition
                Memo.clearMemoRow(root.name);
                // push a definition bound to a prototype into environment
                var paramNames = [];
                for (var i = 0; i < root.args.length; i++) {
                    paramNames.push(root.args[i].value);
                }

                Scope.env()[root.name] = {
                    type: "func",
                    params: paramNames,
                    body: root.value
                };
                return "Function " + root.name + "() defined";
            case "proc_def":
                Scope.env()[root.name] = { type: "proc", params: root.params, body: root.body };
                return "Procedure " + root.name + "() defined";
            case "call":
                // is it a function provided by us?
                if ("function" === typeof native_functions[root.name]) {
                    var nativeArgs = [];
                    for (var i = 0; i < root.args.length; ++i)
                        nativeArgs.push(parseTree(root.args[i]));
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
                    argValues.push(parseTree(root.args[i]));
                }

                var memoKey = Memo.makeMemoString(argValues);

                Scope.push();

                for (var i = 0; i < funcDef.params.length; ++i) {
                    var paramName = funcDef.params[i];
                    Scope.env()[paramName] = argValues[i];
                }

                var result = parseTree(funcDef.body);
                Scope.pop();
                return result;
            case "loop_for":
                Scope.push();
                parseTree(root.init);
                var lastResult = null;
                while (true) {
                    var condition = parseTree(root.cond);
                    if (!condition) break;
                    lastResult = parseTree(root.body);
                    parseTree(root.step);
                }
                Scope.pop();
                return lastResult;
            case "loop_for_in":
                var collection = parseTree(root.collection);

                if (!Array.isArray(collection)) throw "For-in loop expects an array.";

                Scope.push();
                var lastResult = null;
                var varName = root.iterator.value;
                for (var i = 0; i < collection.length; i++) {
                    Scope.env()[varName] = collection[i];
                    lastResult = parseTree(root.body);
                }
                Scope.pop();
                return lastResult;

            case "loop_while":
                Scope.push();
                var ret = null;
                while (parseTree(root.cond)) {
                    ret = parseTree(root.body);
                }
                Scope.pop();
                return ret;

            case "array":
            case "tuple":
                var result = [];
                for (var i = 0; i < root.elements.length; ++i) {
                    result.push(parseTree(root.elements[i]));
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
                    else keyName = parseTree(keyRaw);

                    var val = parseTree(pair.val);
                    res[keyName] = val;
                }
                return res;

            case "index":
                // obj[key]
                var target = parseTree(root.target);
                var idx = parseTree(root.index);

                if (target === undefined || target === null)
                    throw "Cannot index null or undefined";

                return target[idx];
            default:
                if (ops[root.node]) {
                    const left = root.lhs ? parseTree(root.lhs) : undefined;
                    const right = parseTree(root.rhs);
                    if (root.node === "+") {
                        return left + right;
                    }
                    return ops[root.node](left, right);
                } else {
                    return "nil";       // unhandled exception
                }
        }
        
    }
    // main process of evaluating parse node
    var output = [];

    for (var i = 0; i < parse_tree.length; ++i)
        output.push(String(parseTree(parse_tree[i])));
    return output;
}
