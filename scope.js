// scope.js

var Scope = {

    env_stack: [{}],
    depth: 0,

    push: function () {
        this.env_stack.push(dupObject(this.env_stack[this.depth]));
        this.depth += 1;
    },

    pop: function () {
        if (this.depth == 0)
            throw "Stack is empty";
        this.env_stack.pop();
        this.depth -= 1;
    },

    env: function () {
        return this.env_stack[this.depth];
    },

};
