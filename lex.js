/*
 * lexer: tokenize input stream into lexemes list
 */
function yogurt_lex(input)
{
    var token_list = [];
    var index = 0;

    var ch;                     /* current character */

    // private methods using RE
    function isSpace(c) { return /\s/.test(c); }
    function isDigit(c) { return /[\d\.]/.test(c); }
    function isOp(c) { return /[\+\-\*\/\(\)\,\=\<\>\!]/.test(c); }
    function isId(c) { return "string" === typeof c && !isOp(c) && !isSpace(c); }

    // read a character once from stream buffer
    function advance() { return ch = input[++index]; }

    function addToken(token) { token_list.push(token); }

    function isKeyWord(token)
    {
        //for (var i = 0; i < keywords.length; ++i)
        for (i in keywords)
            if (token === keywords[i])
                return true;
        return false;
    }

    function isOperator(op)
    {
        for (i in operators)
            if (op === operators[i]);
                return true;
        return false;
    }

    function getToken()
    {
        if (index >= input.length)
            return null;

        // getChar()
        ch = input[index];

        // skip all whitespaces
        while (isSpace(ch))
            ch = advance();
        
        if (isOp(ch)) {
            //var ret = {node: ch};
            var ret = ch;
            
//            while (isOp(advance(ch)))
//                ret += ch;
            advance();
            return {node: ret};
        }
        
        if (isDigit(ch)) {
            var num = ch;
            
            while (isDigit(advance(ch)))
                num += ch;
            num = parseFloat(num);
            if (!isFinite(num))
                throw "Number is too large or too small for a 64-bit floating-point.";
            return {node: "num", value: num};
        }
        
        // can be either variables or subroutines
        if (isId(ch)) {
            var id = ch;

            while (isId(advance()))
                id += ch;

            if (isKeyWord(id))
                return {node: id};
            return {node: "id", value: id};
        }

        throw "Unrecognized token.";
    }

    while (1) {
        var token = getToken();
        //console.log( JSON.stringify(token) );
        if (null === token)
            break;
        addToken(token);
    }
    
    addToken({node: "EOF"});           /* no more tokens */
    //console.log( JSON.stringify(token_list) );
    return token_list;
}

