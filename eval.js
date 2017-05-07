/*
 * evaluate: iterate each parse node and do syntax analysis
 */
function yogurt_evaluate(parse_tree)
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
    };

    function _apply(root, param, argum)
    {
        if ("object" !== typeof root)
            return null;

        if ("id" === root.node && param === root.value) {
            root.node = "num";
            root.value = argum;
        }
        for (child in root)
            _apply(root[child], param, argum);
    }

    function dupProc(proc) { return JSON.parse(JSON.stringify(proc)); }

    function parseTree(root)
    {
        if ("num" === root.node) {
            return root.value;
        }
        else if (ops[root.node]) {
            if (root.lhs)
                return ops[root.node](parseTree(root.lhs), parseTree(root.rhs));
            else
                return ops[root.node](parseTree(root.rhs));
        }
        else if ("assign" === root.node) {
            return variables[root.name] = parseTree(root.value);
        }
        else if ("call" === root.node) {
            if ("function" === typeof built_in_functions[root.name]) {
                for (var i = 0; i < root.args.length; ++i)
                    root.args[i] = parseTree(root.args[i]);
                return built_in_functions[root.name].apply(null, root.args);
            }

            if ("undefined" === typeof functions[root.name])
                throw "Function \"" + root.name + "\" is undefined";

            var arg;
            var _proc = dupProc(functions[root.name].proc);

            for (var i = 0; i < root.args.length; ++i) {
                arg = parseTree(root.args[i]);
                _apply(_proc, functions[root.name].args[i].value, arg);
            }
            return parseTree(_proc);
        }
        else if ("def" === root.node) {
            // register a new function
            functions[root.name] = {"args": root.args, "proc": root.value};
        }
        else if ("id" === root.node) {
            var val = variables[root.value];

            if ("undefined" === typeof val)
                throw "Variable \"" + root.value + "\" is undefined!!!";
            return val;
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
                else
                    return null;
        }
        return null;
    }

    // main process of evaluating parse node
    var output = "";

    for (var i = 0; i < parse_tree.length; ++i) {
        //console.log( parse_tree[i] );
        var value = parseTree(parse_tree[i]);
        if ("undefined" !== typeof value)
            output += value + "\n";
    }
    return output;
}
