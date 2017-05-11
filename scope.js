function dupObject(o) { return JSON.parse(JSON.stringify(o)); }

var tequila_scope = {
    
    env_stack: [variables],
    depth: 0,

    push: function() {
        this.env_stack.push(dupObject(this.env_stack[this.depth]));
        this.depth += 1;
    },

    pop: function() {
        if (this.depth == 0)
            throw "Stack is empty";
        this.env_stack.pop();
        this.depth -= 1;
    },

    locals: function() {
        return this.env_stack[this.depth];
    },
};
