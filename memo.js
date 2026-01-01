// memo.js

/** 
 * Since functions are pure, we use memoization
 *              to cache their computed results
*/

const Memo = {
    memoization: {},

    makeMemoString: (args) => args.join(' ') + ' ',

    getMemoValue(func, args) {
        const key = this.makeMemoString(args);
        return this.memoization[func]?.[key];
    },

    setMemoValue(func, args, val) {
        if (!this.memoization[func]) this.memoization[func] = {};
        const key = this.makeMemoString(args);
        this.memoization[func][key] = val;
    },

    clearMemoRow(func) {
        if (this.memoization[func]) this.memoization[func] = {};
    },
};
