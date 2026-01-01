// scope.js

const Scope = {
    env_stack: [{}],
    depth: 0,

    env() { return this.env_stack[this.depth]; },

    push(specifiedParent) {
        const parent = specifiedParent || this.env_stack[this.depth];
        const new_scope = Object.create(parent);
        this.env_stack.push(new_scope);
        this.depth++;
    },

    pop() {
        if (this.depth === 0) throw "Stack is empty";
        this.env_stack.pop();
        this.depth--;
    },
};
