/*
 * parser: construct a parse tree according to token list
 */
function yogurt_parse(token_list)
{
    var curIndex = 0;
    var tokTable = {};
    
    // duplicate one from token list, deep cloning
    function dupCurToken()
    {
        var tok = token_list[curIndex];

        var newTok = Object.create(tokTable[tok.node]);
        newTok.node = tok.node;
        newTok.value = tok.value;
        return newTok;
    }

    function getNextToken()
    {
        curIndex++;
        return dupCurToken();
    }
    
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
        return lhs;
    }

    /*
     * @brief http://javascript.crockford.com/tdop/tdop.html
     * @param id Identifier
     * @param nud Null denotative
     * @param led Left denotative
     */
    function setPrecedence(id, nud, lbp, led)
    {
        // register symbol table
		var tok = tokTable[id] || {};
		tokTable[id] = {
		    nud: tok.nud || nud,
			lbp: tok.lbp || lbp,
			led: tok.led || led,
		};
    }

    setPrecedence("if", function() {
        var cond = expr(0);
        if ("then" !== dupCurToken().node)
            throw "Expected 'then' clause.";
        getNextToken(); // eat "then"
        
        var conseq = expr(0);
        if ("else" !== dupCurToken().node)
            /*throw "Expected 'else' clause.";*/
            return {"node": "branch", "cond": cond, "conseq": conseq};
        getNextToken(); // eat "else"

        var alt = expr(0);
        var ret = {"node": "branch", "cond": cond, "conseq": conseq, "alt": alt};
        //console.log(ret);
        return ret;
    });

    setPrecedence("then", function() {
        return "then";
    });
    setPrecedence("else", function() {
        return "else";
    });

    setPrecedence("EOF");
    setPrecedence("(", function() {
        var v = expr(2);
        
        if (")" !== dupCurToken().node)
            throw "Expected closing parenthesis ')'";
        getNextToken(); // eat ")"
        return v;
    });
    setPrecedence(")");
    setPrecedence(",");
    setPrecedence("num", function(n) { return n; });
    setPrecedence("id", function(name) {
        if ("(" !== dupCurToken().node)
            return name; // variable reference

        // function call
        var args = [];

        if (")" === token_list[curIndex + 1].node)
            getNextToken(); // eat ")" since no args
        else {
            do {
                getNextToken(); // eat "(" and ","
                args.push(expr(2));
            } while ("," === dupCurToken().node);
            if (")" !== dupCurToken().node)
                throw "Expected closing parenthesis ')'";
        }
        getNextToken(); // move to new token ready to go
        return {node: "call", args: args, name: name.value};
    });

    // wrappers
    function prefix(id, rbp)
    {
        setPrecedence(id, function() {
           return {node: id, rhs: expr(rbp)}; 
        });
    }
    function infix(id, lbp, rbp, led)
    {
        rbp = rbp || lbp;
        setPrecedence(id, null, lbp, led || function(lhs) {
            return {node: id, lhs: lhs, rhs: expr(rbp)};
        });
    }

    // install standard operators and set precedence, 1 is the lowest
    prefix("+", 6);
    prefix("-", 6);
    infix("*", 5);
    infix("/", 5);
    infix("+", 4);
    infix("-", 4);
    infix("<", 3);
    infix(">", 3);
    infix("<=", 3);
    infix(">=", 3);
    infix("==", 3);
    infix("!=", 3);
    infix("=", 1, 2, function(lhs) {
        // assignment to identifier
        if ("id" === lhs.node) {
            return {node: "assign", name: lhs.value, value: expr(2)};
        }
        if ("call" === lhs.node) {
            // check whether each arg is valid
            for (var i = 0; i < lhs.args.length; ++i)
                if ("id" !== lhs.args[i].node)
                    throw "Invalid argument name.";
            return {node: "def", name: lhs.name, args: lhs.args, value: expr(2)};
        }
        throw "Invalid lvalue.";
    });

    //console.log( JSON.stringify(token_list) );
    var parse_tree = [];
    while ("EOF" !== dupCurToken().node)
        parse_tree.push(expr(0));
    //console.log ( parse_tree.length );
    console.log( JSON.stringify( parse_tree ) );
    return parse_tree;
}

