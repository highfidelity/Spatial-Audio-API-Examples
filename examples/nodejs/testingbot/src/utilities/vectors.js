'use strict';

function randomNumberBetween(low, high, asInteger = false) {
    let x = low + (Math.random() * (high - low));
    if (!asInteger) return x;
    return Math.floor(x);
}
function makeRandom(minX, maxX, minY, maxY, minZ, maxZ) {
    return {
        x: randomNumberBetween(minX, maxX),
        y: randomNumberBetween(minY, maxY),
        z: randomNumberBetween(minZ, maxZ)
    };
}
function isBetween(x, low, high) {
    return low <= x && x <= high;
}
function isWithin(p, minX, maxX, minY, maxY, minZ, maxZ) {
    let {x, y, z} = p;
    return isBetween(x, minX, maxX) &&
        isBetween(y, minY, maxY) &&
        isBetween(z, minZ, maxZ);
}
function length(v) {
    let {x, y, z} = v;
    return Math.sqrt(x * x + y * y + z * z);
}
function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}
function subtract(minuend, subtrahend) { // minuend - subtrahend
    return {
        x: minuend.x - subtrahend.x,
        y: minuend.y - subtrahend.y,
        z: minuend.z - subtrahend.z
    };
}
function multiply(v, scalar) {
    let {x, y, z} = v;
    return {x: x * scalar, y: y * scalar, z: z * scalar};
}
function divide(v, scalar) {
    let {x, y, z} = v;
    return {x: x / scalar, y: y / scalar, z: z / scalar};
}
function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}
function normalize(v) {
    let magnitude = length(v);
    if (!magnitude) return;
    return divide(v, magnitude);
}
function project(p, n) {
    return subtract(p,
                    multiply(n, dot(p, n)));
}
function angleBetween(a, b, n) {
    return Math.atan2(dot(n, cross(a, b)),
                      dot(a, b));
}
const r2d = 180 / Math.PI;
function radiansToDegrees(radians) {
    return radians * r2d;
}
function degreesBetween(a, b, n) {
    return radiansToDegrees(angleBetween(a, b, n));
}
    
module.exports = {
    randomNumberBetween,
    makeRandom,
    isWithin,
    length,
    add,
    subtract,
    multiply,
    divide,
    dot,
    cross,
    normalize,
    project,
    angleBetween,
    degreesBetween,
    radiansToDegrees
};

