/*
 * parser: construct a parse tree according to token list
 */
function tequila_parse(token_list)
{
    var tokTable = {};

    // duplicate one from token list, deep cloning; set callbacks
    function dupCurToken()
    {
        var tok = token_list[0];

        if (!tokTable[tok.node]) {
             throw "Unrecognised token \"" + tok.node + "\"";
        }
        var newTok = Object.create(tokTable[tok.node]); // nud, lbp, led
        newTok.node = tok.node;
        newTok.value = tok.value;
        return newTok;
    }

    function getNextToken() { return token_list.shift(); }

    /*
     * Top-down operator precedence parsing
     * LR(1): shift-reduce
     *
     * @param rbp   right binding power
     */
    function expr(rbp)
    {
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
        //console.log(lhs);
        return lhs;
    }

    /*
     * @brief http://javascript.crockford.com/tdop/tdop.html
     * @param id Identifier
     * @param nud Null denotative
     * @param led Left denotative
     */
    function makeSymbol(id, nud, lbp, led)
    {
        // register symbol table
		var tok = tokTable[id] || {};
		tokTable[id] = {
		    nud: tok.nud || nud,
			lbp: tok.lbp || lbp,
			led: tok.led || led,
		};
    }

    makeSymbol("if", function() {
        var cond = expr(0);
        if ("then" !== token_list[0].node)
            throw "Expected 'then' clause";
        getNextToken(); // eat "then"

        var conseq = expr(0);
        if ("else" !== token_list[0].node)
            /*throw "Expected 'else' clause";*/
            return {"node": "branch", "cond": cond, "conseq": conseq};
        getNextToken(); // eat "else"

        var alt = expr(0);
        return {"node": "branch", "cond": cond, "conseq": conseq, "alt": alt};
    });
    makeSymbol("then");
    makeSymbol("else");
    
    makeSymbol("EOF");
    makeSymbol("(", function() {
        var e = expr(0);

        if (")" !== token_list[0].node)
            throw "Expected closing parenthesis ')'";
        getNextToken(); // eat ")"
        return e;
    });
    makeSymbol(")");
    makeSymbol(",");
    makeSymbol('{', function() {
        var statements = [];

        if ("}" !== token_list[0].node) {
            do
                statements.push(expr(0));
            while ("}" !== token_list[0].node);
            
            if ("}" !== token_list[0].node)
                throw "Unreachable statement";
        }
        getNextToken();     // eat "}"
        //console.log(JSON.stringify(statements));
        return {node: "block", stmts: statements};
    });
    makeSymbol('}');
    makeSymbol("num", function(n) { return n; });
    makeSymbol("id", function(name) {
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
        return {node: "call", args: args, name: name.value};
    });

    // wrappers
    function prefix(id, rbp)
    {
        makeSymbol(id, function() {
           return {node: id, rhs: expr(rbp)};
        });
    }
    function infix(id, lbp, rbp, led)
    {
        rbp = rbp || lbp;
        makeSymbol(id, null, lbp, led || function(lhs) {
            return {node: id, lhs: lhs, rhs: expr(rbp)};
        });
    }

    // install standard operators and set precedence, 1 is the lowest
    prefix("+", 7);
    prefix("-", 7);
    
    infix("*", 6);
    infix("/", 6);
    infix("+", 5);
    infix("-", 5);
    
    infix("<", 4);
    infix(">", 4);
    infix("<=", 4);
    infix(">=", 4);
    infix("==", 4);
    infix("!=", 4);
    
    prefix("not", 3);
    infix("and", 3);
    infix("or", 3);
    
    infix("=", 1, 2, function(lhs) {
        // assignment to identifier
        if ("id" === lhs.node) {
            return {node: "assign", name: lhs.value, value: expr(0)};
        }
        if ("call" === lhs.node) {
            // check whether each arg is valid
            for (var i = 0; i < lhs.args.length; ++i)
                if ("id" !== lhs.args[i].node)
                    throw "Invalid argument name";
            return {node: "def", name: lhs.name, args: lhs.args, value: expr(0)};
        }
        throw "Invalid lvalue.";
    });
    infix(":=", 1, 2, function(lhs) {
        var t;
        var statement = [];

        if ("id" === lhs.node) {
            if ("{" !== token_list[0].node)
                throw "Expected opening block '{'";
            getNextToken(); // eat "{"
            while ("}" !== token_list[0].node) {
                statement.push(expr(0));
                //getNextToken();
            }
            getNextToken();
        }
        //statement.push({node: "EOF"});
        procedures[String(lhs.value)] = statement;
        return {node: "proc", name: lhs.value};
    });
    /*
        infix(":=", 1, 2, function(lhs) {
        var t;
        var statement = [];

        if ("id" === lhs.node) {
            if ("{" !== token_list[0].node)
                throw "Expected opening block '{'";
            getNextToken(); // eat "{"
            while ("}" !== token_list[0].node) {
                statement.push(token_list[0]);
                getNextToken();
            }
            getNextToken();
        }
        statement.push({node: "EOF"});
        procedures[String(lhs.value)] = statement;
        return {node: "proc", name: lhs.value};
    });
    */

    //console.log( JSON.stringify(token_list) );
    var parse_tree = [];
    
    while ("EOF" !== token_list[0].node)
        parse_tree.push(expr(0));
    //console.log ( parse_tree.length );
    console.log( JSON.stringify( parse_tree ) );
    return parse_tree;
}

