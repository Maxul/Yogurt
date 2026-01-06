// parse.js

/*
 * parser: construct a parse tree according to token list
 */
function tequila_parse(token_list) {
    const tokTable = {};      // ready to get referenced for all possible symbols

    function getNextToken() { return token_list.shift(); }

    // duplicate one from token list, deep cloning and register callbacks
    function dupCurToken() {
        const tok = token_list[0];
        if (!tokTable[tok.node]) {
            throw "Unrecognised token \"" + tok.node + "\"";
        }

        const newTok = Object.create(tokTable[tok.node]); // nud, lbp, led
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
    function expression(rbp) {
        let tok = dupCurToken();

        if (!tok.nud) {
            throw "Unexpected token: " + tok.node;
        }

        getNextToken(); // eat id/number/prefix

        let lhs = tok.nud(tok); // mostly simply return itself
        while (rbp < dupCurToken().lbp) {
            tok = dupCurToken();
            getNextToken(); // eat infix
            if (!tok.led) {
                throw "Unexpected token: " + tok.node;
            }
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
        const tok = tokTable[id] || {};
        tokTable[id] = {
            nud: tok.nud || nud,
            lbp: tok.lbp || lbp,
            led: tok.led || led,
        };
    }

    makeSymbol("number", function (n) { return n; });
    makeSymbol("string", function (n) { return n; });

    makeSymbol(","); // argument separator
    makeSymbol(";"); // statement separator
    makeSymbol(":"); // key-value mapping

    // for array
    makeSymbol("[", function () {
        const elems = [];
        if (token_list[0].node !== "]") {
            while (true) {
                elems.push(expression(0));
                if (token_list[0].node !== ",") {
                    break;
                }
                getNextToken(); // eat ","
            }
        }
        if (token_list[0].node !== "]") {
            throw "Expected closing bracket ']'";
        }
        getNextToken(); // eat "]"
        return { node: "array", elements: elems };
    });
    makeSymbol("]");

    makeSymbol("for", function () {
        if ("(" !== token_list[0].node) {
            throw "Expected '(' after for";
        }
        getNextToken(); // eat "("

        const init = expression(0);

        // case A: for n in nums
        if (init.node === "in") {
            if (")" !== token_list[0].node) {
                throw "Expected ')' after for-in loop";
            }
            getNextToken(); // eat ")"

            const body = expression(0);

            return {
                node: "loop_for_in",
                iterator: init.lhs,   // "n"
                collection: init.rhs, // "nums"
                body: body
            };
        }

        // case B: for (i = 0; i < N; i = i + 1)
        if (";" !== token_list[0].node) {
            throw "Expected ';' or 'in' in for loop";
        }
        getNextToken(); // eat first ";"

        const cond = expression(0);

        if (";" !== token_list[0].node) {
            throw "Expected ';' after condition";
        }
        getNextToken(); // eat second ";"

        const step = expression(0);

        if (")" !== token_list[0].node) {
            throw "Expected ')' after step";
        }
        getNextToken(); // eat ")"

        const body = expression(0);

        return { node: "loop_for", init: init, cond: cond, step: step, body: body };
    });

    makeSymbol("while", function () {
        const cond = expression(0);
        const body = expression(0);
        return { node: "loop_while", cond: cond, body: body };
    });

    makeSymbol("if", function () {
        const cond = expression(0);
        if ("then" !== token_list[0].node) {
            throw "Expected 'then' clause";
        }
        getNextToken(); // eat "then"

        const conseq = expression(0);
        if ("else" !== token_list[0].node) {
            return { "node": "branch", "cond": cond, "conseq": conseq };
        }
        getNextToken(); // eat "else"

        const alt = expression(0);
        return { "node": "branch", "cond": cond, "conseq": conseq, "alt": alt };
    });
    makeSymbol("then");
    makeSymbol("else");

    makeSymbol("(", function () {
        const e = expression(0);

        // check if it is a tuple
        if (token_list[0].node === ",") {
            const elems = [e];
            while (token_list[0].node === ",") {
                getNextToken(); // eat ","
                if (token_list[0].node === ")") {
                    break;
                }
                elems.push(expression(0));
            }
            if (")" !== token_list[0].node) {
                throw "Expected closing parenthesis ')' for tuple";
            }
            getNextToken(); // eat ")"
            return { node: "tuple", elements: elems };
        }

        if (")" !== token_list[0].node) {
            throw "Expected closing parenthesis ')'";
        }
        getNextToken(); // eat ")"
        return e;
    });
    makeSymbol(")");

    makeSymbol('{', function () {
        // empty dict {} 
        if ("}" === token_list[0].node) {
            getNextToken();
            return { "node": "dict", "pairs": [] };
        }

        let isDict = false;
        if (token_list.length > 1 && token_list[1].node === ":") {
            isDict = true;
        }

        if (isDict) {
            const pairs = [];
            do {
                const key = expression(0);
                if (":" !== token_list[0].node)
                    throw "Expected ':' in dict definition";
                getNextToken(); // eat ":""

                const val = expression(0);
                pairs.push({ key: key, val: val });

                if ("," === token_list[0].node) {
                    getNextToken(); // eat ",""
                } else {
                    break;
                }
            } while ("}" !== token_list[0].node);

            if ("}" !== token_list[0].node) {
                throw "Expected '}'";
            }
            getNextToken();
            return { node: "dict", pairs: pairs };
        }

        const statements = [];
        while ("}" !== token_list[0].node) {
            if (";" === token_list[0].node) {
                getNextToken();
                continue;
            }
            statements.push(expression(0));
        }
        getNextToken();     // eat "}"
        return { node: "block", stmts: statements };
    });
    makeSymbol('}');

    makeSymbol("id", function (name) {
        // variable reference
        if ("(" !== token_list[0].node) {
            return name;
        }

        // function call
        const args = [];
        if (")" === token_list[1].node) {
            getNextToken(); // eat ")" since no args
        } else {
            do {
                getNextToken(); // eat "(" and ","
                args.push(expression(0));
            } while ("," === token_list[0].node);
            if (")" !== token_list[0].node) {
                throw "Expected closing parenthesis ')'";
            }
        }
        getNextToken(); // move to new token ready to go
        return { node: "call", args: args, name: name.value };
    });

    makeSymbol("llm", function () {
        // grammar: llm "prompt" on context
        const prompt = getNextToken().value;
        let context = [];
        if (token_list[0].node === "on") {
            getNextToken(); // eat "on"
            context = expression(0);
        }
        return { node: "llm_call", prompt: prompt, context: context };
    });
    makeSymbol("llm_do", function () {
        // grammar: llm_do "intent" on context
        const intent = getNextToken().value;
        let context = [];
        if (token_list[0].node === "on") {
            getNextToken(); // eat "on"
            context = expression(0);
        }
        return { node: "llm_synth", intent: intent, context: context };
    });
    makeSymbol("on");

    makeSymbol("EOF");

    // wrappers
    function prefix(id, rbp) {
        makeSymbol(id, function () {
            return { node: id, rhs: expression(rbp) };
        });
    }
    function infix(id, lbp, rbp, led) {
        rbp = rbp || lbp;
        makeSymbol(id, null, lbp, led || function (lhs) {
            return { node: id, lhs: lhs, rhs: expression(rbp) };
        });
    }

    // install standard operators and set precedence, 1 is the lowest
    infix("[", 8, 8, function (lhs) {
        const index = expression(0);
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
            return { node: "assign", name: lhs.value, value: expression(0) };
        }
        if ("call" === lhs.node) {
            // check whether each arg is valid
            for (let i = 0; i < lhs.args.length; ++i) {
                if ("id" !== lhs.args[i].node) {
                    throw "Invalid argument name";
                }
            }
            return { node: "func_def", name: lhs.name, args: lhs.args, value: expression(0) };
        }
        throw "Invalid lvalue";
    });

    infix(":=", 1, 2, function (lhs) {
        let name;
        const params = [];

        if (lhs.node === "id") {        // without args
            name = lhs.value;
        } else if (lhs.node === "call") { // with args
            name = lhs.name;
            for (let i = 0; i < lhs.args.length; i++) {
                if (lhs.args[i].node !== "id")
                    throw "Parameter name must be an identifier";
                params.push(lhs.args[i].value);
            }
        } else {
            throw "Invalid lvalue for procedure definition";
        }
        const body = expression(0);
        return { node: "proc_def", name: name, params: params, body: body };
    });

    const parse_tree = [];
    while ("EOF" !== token_list[0].node) {
        if (";" === token_list[0].node) {
            getNextToken();
            continue;
        }
        parse_tree.push(expression(0));
    }
    // console.log(JSON.stringify(token_list));
    // console.log(JSON.stringify(parse_tree));
    return parse_tree;
}
