'use strict';

const Motor = require("./motor");
const {
    makeRandom,
    isWithin,
    add,
    subtract,
    multiply,
    normalize,
    degreesBetween
} = require("../utilities/vectors");
const msPerSecond = 1000;

class RandomBoundedMovement extends Motor {
    // Move bot in straight lines, facing forward, within any supplied bounds, at the given speed.
    // At least one of xBounds, yBounds, zBounds must be supplied as [minimum, maximum].
    constructor({start,
                 x:[minimumX = start.x, maximumX = start.x] = [],
                 y:[minimumY = start.y, maximumY = start.y] = [],
                 z:[minimumZ = start.z, maximumZ = start.z] = [],
                 speed = 2.6, /* m/s walking */
                 ...options}) {
        // Subtle combination:
        // 1. Ensure larger bounds dimension than zero so check doesn't fail from floating point error.
        // 2. Ensure smaller random target point region and
        // 3. use next out-of-bounds point rather than last in-bounds point, to ensure that vector towards
        //    next direction is not zero and points back towards the bounds target region.
        //    (Works, e.g., in the case of moving back and forth along a line, where min ~= max.)
        const clearance = 0.1;
        function addClearance(min, max) {
            return [Math.min(min, max - clearance),
                    Math.max(max, min + clearance)];
        }
        function shaveClearance(min, max) {
            return [Math.min(max, min + clearance),
                    Math.max(min, max - clearance)];
        }
        super({start, ...options});
        Object.assign(this, {
            metersPerMs: speed / msPerSecond,
            targetRange: {x: shaveClearance(minimumX, maximumX),
                          y: shaveClearance(minimumY, maximumY),
                          z: shaveClearance(minimumZ, maximumZ)},
            bounds: {x: addClearance(minimumX, maximumX),
                     y: addClearance(minimumY, maximumY),
                     z: addClearance(minimumZ, maximumZ)}
        });
    }
    setupNextMotion(position) {
        this.randomDirection(position);
    }
    step() {
        this.boundedLinear();
    }
    randomDirection(from) {
        let direction;
        do { // Guard against random point being identical to from.
            let to = this.getRandomPointInBox();
            direction = normalize(subtract(to, from));
        } while (!direction);
        this.direction = direction;
        this.rotateForward(direction);
    }
    boundedLinear() {
        let interval = this.updateInterval(),
            distanceAtSpeed = this.metersPerMs * interval,
            start = this.position,
            next = add(start,
                       multiply(this.direction, distanceAtSpeed));
        if (this.isWithinBox(next)) {
            this.position = this.bot.updatePosition(next);
        } else {
            this.setupNextMotion(next);
        }
    }
    isWithinBox(point) {
        let {x:[minX, maxX], y:[minY, maxY], z:[minZ, maxZ]} = this.bounds;
        return isWithin(point, minX, maxX, minY, maxY, minZ, maxZ);
    }
    getRandomPointInBox() {
        let {x:[minX, maxX], y:[minY, maxY], z:[minZ, maxZ]} = this.targetRange;
        return makeRandom(minX, maxX, minY, maxY, minZ, maxZ);
    }
}
module.exports = RandomBoundedMovement;

