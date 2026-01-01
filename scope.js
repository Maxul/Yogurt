// scope.js

const deepcopy = o => JSON.parse(JSON.stringify(o));

const Scope = {
    env_stack: [{}],
    depth: 0,

    env() { return this.env_stack[this.depth]; },

    push() {
        const new_scope = deepcopy(this.env_stack[this.depth]);
        this.env_stack.push(new_scope);
        this.depth++;
    },

    pop() {
        if (this.depth === 0) throw "Stack is empty";
        this.env_stack.pop();
        this.depth--;
    },
};
