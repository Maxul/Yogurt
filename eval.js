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
        else if (ops[root.node]) {
            if (root.lhs)
                return ops[root.node](parseTree(root.lhs), parseTree(root.rhs));
            else
                return ops[root.node](parseTree(root.rhs));
        }
        else if ("assign" === root.node) {
            return tequila_scope.locals()[root.name] = parseTree(root.value);
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
            var _args = [];
            var _proc = dupObject(functions[root.name].proc);

            for (var i = 0; i < root.args.length; ++i) {
                arg = parseTree(root.args[i]);
                _args.push(arg);
                _reduce(_proc, functions[root.name].args[i].value, arg);
            }

            // accelerate with memoization
            var ret = Memo.getMemoValue(root.name, _args);
            if ("undefined" !== typeof ret)
                return ret;

            ret = parseTree(_proc);
            Memo.setMemoValue(root.name, _args, ret);
            return ret;
        }
        else if ("def" === root.node) {
            // register a new function
            Memo.clearMemoRow(root.name);
            functions[root.name] = {"args": root.args, "proc": root.value};
        }
        else if ("id" === root.node) {
            var proc = procedures[root.value];
            
            if ("object" === typeof proc) {
                proc = dupObject(proc);
                console.log(JSON.stringify(proc));
                //var tree = tequila_parse(proc);
                //console.log(JSON.stringify(tree));
                var rest = tequila_evaluate(proc);
                console.log(rest);
                return rest;
            }

            var val = tequila_scope.locals()[root.value];

            if ("undefined" === typeof val)
                throw "Variable \"" + root.value + "\" is undefined!!!";
            return val;
        }
        else if ("proc" == root.node) {

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
            
            tequila_scope.push();   // enter block
            for (var i = 0; i < ss.length; ++i)
                output.push(String(parseTree(ss[i])));
            tequila_scope.pop();    // leave block
            //var ret = tequila_evaluate(root.stmts);
            //console.log(output);
            return;
        }
        return "nil";
    }

    // main process of evaluating parse node
    var output = [];

    for (var i = 0; i < parse_tree.length; ++i)
        output.push( String(parseTree(parse_tree[i])) );
    return output;
}

