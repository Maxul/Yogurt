// utils.js

const suffix_ops = "<>=!:";
const brackets = "()[]{}";

const keywords = [
    "if", "then", "else", // branch
    "not", "and", "or",   // logical
    "while", "for", "in", // loop
    "llm",
];

const constants = {
    pi: Math.PI,
    e: Math.E,
    epsilon: Number.EPSILON,
    true: true,
    false: false,
    null: null,
};

const native_functions = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    log: Math.log,
    exp: Math.exp,
    pow: Math.pow,
    sqrt: Math.sqrt,
    abs: Math.abs,
    max: Math.max,
    min: Math.min,
    random: Math.random,
    len: (obj) => obj?.length ?? 0,
    upper: (str) => String(str).toUpperCase(),
    lower: (str) => String(str).toLowerCase(),
    substr: (str, start, end) => String(str).substring(start, end),
    concat: (...args) => args.join(""),
};
