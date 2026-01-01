// parse.js

/*
 * parser: construct a parse tree according to token list
 */
function tequila_parse(token_list) {
    var tokTable = {};      // ready to get referenced for all possible symbols

    function getNextToken() { return token_list.shift(); }

    // duplicate one from token list, deep cloning and register callbacks
    function dupCurToken() {
        var tok = token_list[0];

        if (!tokTable[tok.node]) {
            throw "Unrecognised token \"" + tok.node + "\"";
        }
        var newTok = Object.create(tokTable[tok.node]); // nud, lbp, led
        newTok.node = tok.node;
        newTok.value = tok.value;
        return newTok;
    }

    /*
     * Top-down operator precedence parsing
     * LR(1): shift-reduce
     *
     * @param rbp   right binding power
     */
    function expr(rbp) {
        var tok = dupCurToken();

        if (!tok.nud)
            throw "Unexpected token: " + tok.node;

        getNextToken(); // eat id/number/prefix

        var lhs = tok.nud(tok); // mostly simply return itself
        while (rbp < dupCurToken().lbp) {
            tok = dupCurToken();
            getNextToken(); // eat infix
            if (!tok.led)
                throw "Unexpected token: " + tok.node;
            lhs = tok.led(lhs);
        }
        return lhs;
    }

    /*
     * @brief http://javascript.crockford.com/tdop/tdop.html
     * @param id Identifier
     * @param nud Null denotative
     * @param led Left denotative
     */
    function makeSymbol(id, nud, lbp, led) {
        // register symbol table
        var tok = tokTable[id] || {};
        tokTable[id] = {
            nud: tok.nud || nud,
            lbp: tok.lbp || lbp,
            led: tok.led || led,
        };
    }

    makeSymbol(",");
    makeSymbol(";");
    makeSymbol(":");

    // for array
    makeSymbol("[", function () {
        var elems = [];
        if (token_list[0].node !== "]") {
            while (true) {
                elems.push(expr(0));
                if (token_list[0].node !== ",") {
                    break;
                }
                getNextToken(); // eat ","
            }
        }
        if (token_list[0].node !== "]")
            throw "Expected closing bracket ']'";
        getNextToken(); // eat "]"
        return { node: "array", elements: elems };
    });
    makeSymbol("]");

    makeSymbol("for", function () {
        if ("(" !== token_list[0].node)
            throw "Expected '(' after for";
        getNextToken(); // eat "("

        var init = expr(0);

        // case A: for n in nums
        if (init.node === "in") {
            if (")" !== token_list[0].node)
                throw "Expected ')' after for-in loop";
            getNextToken(); // eat ")"

            var body = expr(0);

            return {
                node: "loop_for_in",
                iterator: init.lhs,   // "n"
                collection: init.rhs, // "nums"
                body: body
            };
        }

        // case B: for (i = 0; i < N; i = i + 1)
        if (";" !== token_list[0].node)
            throw "Expected ';' or 'in' in for loop";
        getNextToken(); // eat first ";"

        var cond = expr(0); // 解析条件 (i < 10)

        if (";" !== token_list[0].node)
            throw "Expected ';' after condition";
        getNextToken(); // eat second ";"

        var step = expr(0);

        if (")" !== token_list[0].node)
            throw "Expected ')' after step";
        getNextToken(); // eat ")"

        var body = expr(0);

        return { node: "loop_for", init: init, cond: cond, step: step, body: body };
    });

    makeSymbol("while", function () {
        var cond = expr(0);
        var body = expr(0);
        return { node: "loop_while", cond: cond, body: body };
    });

    makeSymbol("if", function () {
        var cond = expr(0);
        if ("then" !== token_list[0].node)
            throw "Expected 'then' clause";
        getNextToken(); // eat "then"

        var conseq = expr(0);
        if ("else" !== token_list[0].node)
            /*throw "Expected 'else' clause";*/
            return { "node": "branch", "cond": cond, "conseq": conseq };
        getNextToken(); // eat "else"

        var alt = expr(0);
        return { "node": "branch", "cond": cond, "conseq": conseq, "alt": alt };
    });
    makeSymbol("then");
    makeSymbol("else");

    makeSymbol("(", function () {
        var e = expr(0);

        // check if it is a tuple
        if (token_list[0].node === ",") {
            var elems = [e];
            while (token_list[0].node === ",") {
                getNextToken(); // eat ","
                if (token_list[0].node === ")") break;
                elems.push(expr(0));
            }
            if (")" !== token_list[0].node)
                throw "Expected closing parenthesis ')' for tuple";
            getNextToken(); // eat ")"
            return { node: "tuple", elements: elems };
        }

        if (")" !== token_list[0].node)
            throw "Expected closing parenthesis ')'";
        getNextToken(); // eat ")"
        return e;
    });
    makeSymbol(")");

    makeSymbol('{', function () {
        // 1. handle empty dict {} 
        if ("}" === token_list[0].node) {
            getNextToken();
            return { "node": "dict", "pairs": [] };
        }

        var isDict = false;
        if (token_list.length > 1 && token_list[1].node === ":") {
            isDict = true;
        }

        if (isDict) {
            var pairs = [];
            do {
                var key = expr(0);
                if (":" !== token_list[0].node)
                    throw "Expected ':' in dict definition";
                getNextToken(); // eat ":""

                var val = expr(0);
                pairs.push({ key: key, val: val });

                if ("," === token_list[0].node) {
                    getNextToken(); // eat ",""
                } else {
                    break;
                }
            } while ("}" !== token_list[0].node);

            if ("}" !== token_list[0].node) throw "Expected '}'";
            getNextToken();
            return { node: "dict", pairs: pairs };
        }

        var statements = [];

        while ("}" !== token_list[0].node) {
            if (";" === token_list[0].node) {
                getNextToken();
                continue;
            }

            statements.push(expr(0));
        }
        getNextToken();     // eat "}"
        return { node: "block", stmts: statements };
    });
    makeSymbol('}');
    makeSymbol("number", function (n) { return n; });
    makeSymbol("string", function (n) { return n; });
    makeSymbol("id", function (name) {
        if ("(" !== token_list[0].node) // variable reference
            return name;

        var args = [];                  // function call

        if (")" === token_list[1].node)
            getNextToken(); // eat ")" since no args
        else {
            do {
                getNextToken(); // eat "(" and ","
                args.push(expr(0));
            } while ("," === token_list[0].node);
            if (")" !== token_list[0].node)
                throw "Expected closing parenthesis ')'";
        }
        getNextToken(); // move to new token ready to go
        return { node: "call", args: args, name: name.value };
    });
    makeSymbol("using");
    makeSymbol("llm", function () {
        let prompt = getNextToken().value;
        let context = [];
        if (token_list[0].node === "using") {
            getNextToken(); // eat "using"
            context = expr(0);
        }
        return { node: "llm_call", prompt: prompt, context: context };
    });
    makeSymbol("EOF");

    // wrappers
    function prefix(id, rbp) {
        makeSymbol(id, function () {
            return { node: id, rhs: expr(rbp) };
        });
    }
    function infix(id, lbp, rbp, led) {
        rbp = rbp || lbp;
        makeSymbol(id, null, lbp, led || function (lhs) {
            return { node: id, lhs: lhs, rhs: expr(rbp) };
        });
    }

    // install standard operators and set precedence, 1 is the lowest
    infix("[", 8, 8, function (lhs) {
        var index = expr(0);
        if ("]" !== token_list[0].node)
            throw "Expected ']'";
        getNextToken(); // eat "]"
        return { "node": "index", "target": lhs, "index": index };
    });

    prefix("+", 7);
    prefix("-", 7);

    infix("*", 6);
    infix("/", 6);
    infix("%", 6);
    infix("+", 5);
    infix("-", 5);

    infix("<", 4);
    infix(">", 4);
    infix("<=", 4);
    infix(">=", 4);
    infix("==", 4);
    infix("!=", 4);
    infix("in", 4);

    prefix("not", 3);
    infix("and", 3);
    infix("or", 3);

    infix("=", 1, 2, function (lhs) {
        // assignment to identifier
        if ("id" === lhs.node) {
            return { node: "assign", name: lhs.value, value: expr(0) };
        }
        if ("call" === lhs.node) {
            // check whether each arg is valid
            for (var i = 0; i < lhs.args.length; ++i)
                if ("id" !== lhs.args[i].node)
                    throw "Invalid argument name";
            return { node: "func_def", name: lhs.name, args: lhs.args, value: expr(0) };
        }
        throw "Invalid lvalue.";
    });

    infix(":=", 1, 2, function (lhs) {
        var name;
        var params = [];

        if (lhs.node === "id") {        // without args
            name = lhs.value;
        }
        else if (lhs.node === "call") { // with args
            name = lhs.name;
            for (var i = 0; i < lhs.args.length; i++) {
                if (lhs.args[i].node !== "id")
                    throw "Parameter name must be an identifier";
                params.push(lhs.args[i].value);
            }
        } else {
            throw "Invalid lvalue for procedure definition.";
        }
        var body = expr(0);
        return { node: "proc_def", name: name, params: params, body: body };
    });
    // console.log(JSON.stringify(token_list));
    var parse_tree = [];

    while ("EOF" !== token_list[0].node) {
        if (";" === token_list[0].node) {
            getNextToken();
            continue;
        }
        parse_tree.push(expr(0));
    }
    // console.log(parse_tree.length);
    // console.log(JSON.stringify(parse_tree));
    return parse_tree;
}
