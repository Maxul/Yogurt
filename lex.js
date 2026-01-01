// lex.js

/*
 * lexer: tokenize input stream into lexemes list
 */
function tequila_lex(input) {
    const token_list = [];
    let index = 0;
    let ch; // current character

    // private methods using regular expressions
    const isSpace = ch => /\s/.test(ch);
    const isDigit = ch => /[\d\.]/.test(ch);
    const isOp = ch => /[\+\-\*\/\(\)\,\=\<\>\!\:\;\[\]\{\}]/.test(ch);
    const isId = ch => typeof ch === "string" && !isOp(ch) && !isSpace(ch);

    // read a character once from stream buffer
    const advance = () => ch = input[++index];

    const getToken = () => {
        if (index >= input.length) return null;

        ch = input[index]; // getChar()
        while (index < input.length) {
            if (isSpace(ch)) { // skip all whitespaces
                ch = advance();
            } else if (ch === '#') { // skip comments beginning with "#"
                while (index < input.length && input[index] !== '\n') {
                    index++;
                }
                ch = input[index];
            } else {
                break;
            }
        }
        if (index >= input.length) return null;

        if (isOp(ch)) {
            let ret = ch;
            const t = ch;
            advance();
            if (brackets.includes(t)) return { node: ret };
            // compound operator
            while (index < input.length && suffix_ops.includes(input[index])) {
                ret += input[index];
                advance();
            }
            return { node: ret };
        }

        if (ch === '"' || ch === "'") {
            const quote = ch;
            let str = "";
            advance(); // skip head "\""
            while (input[index] !== quote && index < input.length) {
                str += input[index];
                advance();
            }
            advance(); // skip tail "\""
            return { node: "string", value: str };
        }

        if (isDigit(ch)) {
            let numStr = ch;
            while (isDigit(advance())) numStr += ch;
            const num = parseFloat(numStr);
            if (!isFinite(num)) throw "Number overflow/underflow";
            return { node: "number", value: num };
        }

        // can be either variables, functions, or procedures
        if (isId(ch)) {
            let id = ch;
            while (isId(advance())) id += ch;
            return keywords.includes(id) ? { node: id } : { node: "id", value: id };
        }

        throw "Unrecognized token.";
    };

    let token;
    while (token = getToken()) token_list.push(token);
    token_list.push({ node: "EOF" }); // no more tokens
    // console.log(JSON.stringify(token_list));
    return token_list;
}
