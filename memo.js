// memo.js

////////// function return value memory database //////////
var Memo = {

    // [ {func: name, args: [], ret: value}, ... ]
    memoization: [],

    makeMemoString: function (args) {
        var ret = "";

        for (i in args)
            ret += String(args[i]) + ' ';
        return ret;
    },

    getMemoValue: function (func, args) {
        var key = this.makeMemoString(args);
        if (this.memoization[func])
            return this.memoization[func][key];
        return undefined;
    },

    setMemoValue: function (func, args, val) {
        if ("undefined" === typeof this.memoization[func])
            this.memoization[func] = [];

        var key = this.makeMemoString(args);
        this.memoization[func][key] = val;
    },

    clearMemoRow: function (func) {
        if ("undefined" !== typeof this.memoization[func])
            this.memoization[func] = [];
    },
};