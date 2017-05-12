/*
 * evaluate: iterate each parse node and do syntax analysis
 */
function tequila_evaluate(parse_tree)
{
    var ops = {
        // take the place of LHS with RHS when only RHS exists
        "+": function(a, b) { return "undefined" === typeof b ? +a : a + b; },
        "-": function(a, b) { return "undefined" === typeof b ? -a : a - b; },
        "*": function(a, b) { return a * b; },
        "/": function(a, b) { return a / b; },

        ">": function(a, b) { return a > b; },
        "<": function(a, b) { return a < b; },
        ">=": function(a, b) { return a >= b; },
        "<=": function(a, b) { return a <= b; },
        "==": function(a, b) { return a == b; },
        "!=": function(a, b) { return a != b; },

        "not": function(a) { return "boolean" === typeof a ? !a : null; },
        "and": function(a, b) {
            return "boolean" === typeof a && "boolean" === typeof b ? a && b : null;
        },
        "or": function(a, b) {
            return "boolean" === typeof a && "boolean" === typeof b ? a || b : null;
        },
    };

    function _reduce(root, param, argum)
    {
        if ("object" !== typeof root)
            return null;

        if ("id" === root.node && param === root.value) {
            root.node = "num";
            root.value = argum;
        }
        for (child in root)
            _reduce(root[child], param, argum);
    }

    function parseTree(root)
    {
        if ("num" === root.node) {
            return root.value;
        }
        else if ("id" === root.node) {
            // is it a constant value?
            if ("undefined" !== typeof constants[root.value])
                return constants[root.value];

            // another attempt at procedure
            var proc = procedures[root.value];

            if ("object" === typeof proc) {
                proc = dupObject(proc);
                console.log(JSON.stringify(proc));
                var rest = tequila_evaluate(proc);
                console.log(rest);
                return rest;
            }

            // may be a variable defined before
            var val = Scope.env()[root.value];

            if ("undefined" === typeof val)
                throw "Variable \"" + root.value + "\" is undefined!!!";
            return val;
        }
        else if (ops[root.node]) {
            if (root.lhs)       // if this is a binary operator
                return ops[root.node](parseTree(root.lhs), parseTree(root.rhs));
            else                // or it is a unary one, lhs is a nil
                return ops[root.node](parseTree(root.rhs));
        }
        else if ("assign" === root.node) {
            // constants cannot be re-defined
            if ("undefined" !== typeof constants[root.name])
                throw "Constant \"" + root.name + "\" has already been defined";
            // push a value bound to a name into the current environment
            return Scope.env()[root.name] = parseTree(root.value);
        }
        else if ("def" === root.node) {
            // clear previous definition
            //Memo.clearMemoRow(root.name);
            // push a definition bound to a prototype into environment
            Scope.env()[root.name] = {"args": root.args, "defun": root.value};
        }
        else if ("call" === root.node) {
            // is it a function provided by us?
            if ("function" === typeof native_functions[root.name]) {
                for (var i = 0; i < root.args.length; ++i)
                    root.args[i] = parseTree(root.args[i]);
                return native_functions[root.name].apply(null, root.args);
            }

            if ("undefined" === typeof Scope.env()[root.name])
                throw "Function \"" + root.name + "\" is undefined";

            var arg;
            var _args = [];
            var _proc = dupObject(Scope.env()[root.name].defun);

            for (var i = 0; i < root.args.length; ++i) {
                arg = parseTree(root.args[i]);
                _args.push(arg);
                _reduce(_proc, Scope.env()[root.name].args[i].value, arg);
            }

            // accelerate with memoization
            /*var ret = Memo.getMemoValue(root.name, _args);
            if ("undefined" !== typeof ret)
                return ret;*/

            ret = parseTree(_proc);
            //Memo.setMemoValue(root.name, _args, ret);
            return ret;
        }
        else if ("branch" == root.node) {
            var c = parseTree(root.cond);

            if ("boolean" !== typeof c)
                throw "Expected a boolean expression.";
            if (c)
                return parseTree(root.conseq);
            else
                if (root.alt)
                    return parseTree(root.alt);
        }
        else if ("block" === root.node) {
            var ss = root.stmts;

            Scope.push();   // enter block
            // iterate each statement and evaluate the node
            for (var i = 0; i < ss.length; ++i)
                output.push(String(parseTree(ss[i])));
            Scope.pop();    // exit block
            return;
        }
        return "nil";       // unhandled exception
    }

    // main process of evaluating parse node
    var output = [];

    for (var i = 0; i < parse_tree.length; ++i)
        output.push( String(parseTree(parse_tree[i])) );
    return output;
}

