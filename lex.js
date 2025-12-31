// lex.js

/*
 * lexer: tokenize input stream into lexemes list
 */
function tequila_lex(input) {
    var token_list = [];
    var index = 0;

    var ch;                     /* current character */

    // private methods using RE
    function isSpace(c) { return /\s/.test(c); }
    function isDigit(c) { return /[\d\.]/.test(c); }
    function isOp(c) { return /[\+\-\*\/\(\)\,\=\<\>\!\:\;\[\]\{\}]/.test(c); }
    function isId(c) { return "string" === typeof c && !isOp(c) && !isSpace(c); }

    // read a character once from stream buffer
    function advance() { return ch = input[++index]; }
    function addToken(t) { token_list.push(t); }
    function isKeyWord(t) { return keywords.indexOf(t) >= 0; }

    function getToken() {
        if (index >= input.length)
            return null;

        ch = input[index];      // getChar()
        while (isSpace(ch))     // skip all whitespaces
            ch = advance();

        if (isOp(ch)) {
            var ret = ch;
            var t = ch;

            advance();
            if (brackets.indexOf(t) >= 0)
                return { node: ret };
            // compound operator
            for (; ;) {
                t = input[index];
                if (suffix_ops.indexOf(t) < 0)
                    break;
                ret += t;
                advance();
            }
            return { node: ret };
        }

        if (isDigit(ch)) {
            var num = ch;

            while (isDigit(advance(ch)))
                num += ch;
            num = parseFloat(num);
            if (!isFinite(num))
                throw "Number is too large or too small for a 64-bit floating-point.";
            return { node: "num", value: num };
        }

        // can be either variables or subroutines
        if (isId(ch)) {
            var id = ch;

            while (isId(advance()))
                id += ch;

            // keywords is prior to user defined identifiers
            if (isKeyWord(id))
                return { node: id };
            return { node: "id", value: id };
        }

        throw "Unrecognized token.";
    }

    while (token = getToken())
        addToken(token);

    addToken({ node: "EOF" });           /* no more tokens */
    console.log(JSON.stringify(token_list));
    return token_list;
}