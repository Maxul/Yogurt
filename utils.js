// utils.js

var dupObject = function (o) { return JSON.parse(JSON.stringify(o)); };

var keywords = [
    "if", "then", "else", // branch
    "not", "and", "or",   // loop
    "while", "for", "in", // logical
];

var procedures = {};

var suffix_ops = "<>=!:";
var brackets = "()[]{}";

var constants = {
    pi: Math.PI,
    e: Math.E,
    epsilon: Number.EPSILON,
    true: true,
    false: false,
    null: null,
};

var native_functions = {
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
};